/**
 * One-off migration: WordPress (Tutor LMS) staging DB -> new app DB.
 *
 * Reads from a staging database (default `talweeh_wp`, the imported dump) and
 * writes into the app database (`DB_NAME`, default `talweeh_test`).
 *
 * Imports:
 *   - published courses (post_type='courses')
 *   - lessons (post_type='lesson'), flattening Tutor topics into one ordered list
 *   - quizzes (post_type='tutor_quiz') attached to the preceding lesson,
 *     with single_choice / multiple_choice / true_false questions + options
 *   - all WordPress users (placeholder password; reset via forgot-password flow)
 *   - enrollments (post_type='tutor_enrolled', post_status='completed')
 *
 * Re-runnable: wipes target content tables first (auth_users is preserved).
 *
 * Usage: node server/scripts/migrate-wordpress.js
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const SOURCE_DB = process.env.WP_STAGING_DB || 'talweeh_wp'
const TARGET_DB = process.env.DB_NAME || 'talweeh_test'
const PREFIX = 'nr2u8_'
const PLACEHOLDER_VIDEO_URL = 'https://www.youtube.com/watch?v=y1lHDzpbqxA'
const MCQ_TYPES = new Set(['single_choice', 'multiple_choice', 'true_false'])

const src = (t) => `\`${SOURCE_DB}\`.\`${PREFIX}${t}\``
const tgt = (t) => `\`${TARGET_DB}\`.\`${t}\``

// ── small helpers ─────────────────────────────────────────

// Extract a string value for `key` from a PHP-serialized blob. Works for our
// keys whose values contain no embedded double quotes (URLs, numbers, slugs).
function phpStr(serialized, key) {
  if (!serialized) return null
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = serialized.match(new RegExp(`s:\\d+:"${esc}";s:\\d+:"([^"]*)"`))
  return m ? m[1] : null
}

// Rewrite an absolute WordPress upload URL to a relative path so the app serves
// self-hosted media (see server/scripts/download-media.js) instead of the live CDN.
const UPLOADS_MARKER = '/wp-content/uploads/'
function toRelativeUpload(url) {
  if (!url) return null
  const idx = url.indexOf(UPLOADS_MARKER)
  return idx === -1 ? url : url.slice(idx)
}

function stripHtml(s) {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// Strip WordPress/Gutenberg block comments (and noise) but keep inner HTML.
function cleanWpHtml(html) {
  return (html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Convert WP HTML into plain-text paragraphs (used for instructor bios).
function htmlToText(html) {
  const cleaned = cleanWpHtml(html)
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
  return stripHtmlKeepBreaks(cleaned).replace(/\n{3,}/g, '\n\n').trim()
}

// Like stripHtml but preserves newlines we just inserted.
function stripHtmlKeepBreaks(s) {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

// Convert WP HTML into the article renderer's block list:
//   { type: 'heading'|'subheading'|'paragraph', text } | { type: 'video', url, title }
function htmlToBlocks(html) {
  const cleaned = cleanWpHtml(html)
  const blocks = []
  const tagRe = /<(h1|h2|h3|h4|h5|h6|p|figure|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = tagRe.exec(cleaned)) !== null) {
    const tag = m[1].toLowerCase()
    const inner = m[2]
    const iframe = inner.match(/<iframe[^>]+src="([^"]+)"/i)
    if (iframe) {
      blocks.push({ type: 'video', url: iframe[1].replace(/embed\//, 'watch?v=').replace(/youtube-nocookie\.com/, 'youtube.com') })
      continue
    }
    const text = stripHtml(inner)
    if (!text) continue
    if (tag === 'h1' || tag === 'h2') blocks.push({ type: 'heading', text })
    else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') blocks.push({ type: 'subheading', text })
    else blocks.push({ type: 'paragraph', text })
  }
  return blocks
}

function slugify(s) {
  return (s || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
}

function mapLevel(raw) {
  switch ((raw || '').toLowerCase()) {
    case 'beginner': return 'Beginner'
    case 'intermediate': return 'Intermediate'
    case 'expert':
    case 'advanced': return 'Advanced'
    default: return 'Beginner'
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.tajDB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  const summary = {
    users_inserted: 0, users_existing: 0,
    courses: 0, lessons: 0, lessons_placeholder_video: [],
    quizzes: 0, questions: 0, options: 0, questions_skipped_non_mcq: 0,
    quizzes_unattached: [], enrollments: 0, enrollments_skipped: 0,
  }

  try {
    console.log(`Source: ${SOURCE_DB}  ->  Target: ${TARGET_DB}\n`)

    // ── 1. Wipe target content (FK-safe). auth_users is preserved. ──
    console.log('Wiping target content tables...')
    await conn.query('SET FOREIGN_KEY_CHECKS=0')
    for (const t of ['quiz_options', 'quiz_questions', 'quiz_attempts', 'quizzes',
      'lesson_progress', 'lesson_notes', 'lesson_comments', 'enrollments', 'lessons',
      'order_items', 'orders', 'subscriptions', 'products', 'coupons', 'courses',
      'articles', 'instructors', 'services', 'pages']) {
      await conn.query(`TRUNCATE TABLE ${tgt(t)}`)
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1')

    // ── 2. Users ──
    console.log('Importing users...')
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 12)
    const [wpUsers] = await conn.query(
      `SELECT ID, user_login, user_email, user_registered, display_name FROM ${src('users')}`
    )
    const [wpUserMeta] = await conn.query(
      `SELECT user_id, meta_key, meta_value FROM ${src('usermeta')}
       WHERE meta_key IN ('first_name','last_name','${PREFIX}capabilities')`
    )
    const metaByUser = new Map()
    for (const m of wpUserMeta) {
      if (!metaByUser.has(m.user_id)) metaByUser.set(m.user_id, {})
      metaByUser.get(m.user_id)[m.meta_key] = m.meta_value
    }

    // Preload existing target accounts (email + username) so we never collide.
    const [existingRows] = await conn.query(`SELECT id, email, username FROM ${tgt('auth_users')}`)
    const emailToId = new Map()
    const takenUsernames = new Set()
    for (const r of existingRows) {
      if (r.email) emailToId.set(r.email.toLowerCase(), r.id)
      if (r.username) takenUsernames.add(r.username.toLowerCase())
    }

    const wpUserToAuthId = new Map()
    for (const u of wpUsers) {
      let email = (u.user_email || '').trim().toLowerCase()
      if (!email) email = `wp-user-${u.ID}@imported.local`

      // Already present (e.g. existing admin) -> map, don't duplicate.
      if (emailToId.has(email)) {
        wpUserToAuthId.set(u.ID, emailToId.get(email))
        summary.users_existing++
        continue
      }

      const meta = metaByUser.get(u.ID) || {}
      const caps = meta[`${PREFIX}capabilities`] || ''
      const role = caps.includes('"administrator"') ? 'admin' : 'user'

      let first = (meta.first_name || '').trim()
      let last = (meta.last_name || '').trim()
      const display = (u.display_name || '').trim()
      if (!first && !last && display) {
        const parts = display.split(/\s+/)
        first = parts.shift() || ''
        last = parts.join(' ')
      }
      const name = display || `${first} ${last}`.trim() || u.user_login

      let username = (u.user_login || `user${u.ID}`).trim().slice(0, 60)
      if (takenUsernames.has(username.toLowerCase())) {
        username = `${username.slice(0, 50)}_wp${u.ID}`
      }
      takenUsernames.add(username.toLowerCase())

      const createdAt = (u.user_registered && !String(u.user_registered).startsWith('0000'))
        ? u.user_registered : new Date()

      const [res] = await conn.query(
        `INSERT INTO ${tgt('auth_users')} (name, username, first_name, last_name, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name.slice(0, 100), username, first.slice(0, 100) || null, last.slice(0, 100) || null,
          email.slice(0, 150), placeholderHash, role, createdAt]
      )
      emailToId.set(email, res.insertId)
      wpUserToAuthId.set(u.ID, res.insertId)
      summary.users_inserted++
    }
    console.log(`  users: ${summary.users_inserted} inserted, ${summary.users_existing} already existed`)

    // ── 3. Courses (published) ──
    console.log('Importing courses...')
    const [courses] = await conn.query(
      `SELECT ID, post_title, post_name, post_content, post_excerpt, post_author, post_date
       FROM ${src('posts')} WHERE post_type='courses' AND post_status='publish' ORDER BY ID`
    )
    const courseIds = courses.map((c) => c.ID)
    const postMetaFor = async (ids, keys) => {
      if (!ids.length) return new Map()
      const [rows] = await conn.query(
        `SELECT post_id, meta_key, meta_value FROM ${src('postmeta')}
         WHERE post_id IN (?) AND meta_key IN (?)`, [ids, keys]
      )
      const map = new Map()
      for (const r of rows) {
        if (!map.has(r.post_id)) map.set(r.post_id, {})
        map.get(r.post_id)[r.meta_key] = r.meta_value
      }
      return map
    }

    const courseMeta = await postMetaFor(courseIds,
      ['_tutor_course_level', 'tutor_course_price', '_thumbnail_id'])

    // Authors (instructor names)
    const authorIds = [...new Set(courses.map((c) => c.post_author).filter(Boolean))]
    const authorName = new Map()
    if (authorIds.length) {
      const [aRows] = await conn.query(
        `SELECT ID, display_name FROM ${src('users')} WHERE ID IN (?)`, [authorIds])
      for (const a of aRows) authorName.set(a.ID, a.display_name)
    }

    // Thumbnails (attachment guid by _thumbnail_id)
    const thumbIds = [...new Set(courseIds
      .map((id) => courseMeta.get(id)?._thumbnail_id).filter(Boolean).map(Number))]
    const thumbUrl = new Map()
    if (thumbIds.length) {
      const [tRows] = await conn.query(
        `SELECT ID, guid FROM ${src('posts')} WHERE ID IN (?)`, [thumbIds])
      for (const t of tRows) thumbUrl.set(t.ID, t.guid)
    }

    // Course categories (first course-category term)
    const courseCategory = new Map()
    if (courseIds.length) {
      const [catRows] = await conn.query(
        `SELECT tr.object_id, t.name FROM ${src('term_relationships')} tr
         JOIN ${src('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
         JOIN ${src('terms')} t ON t.term_id = tt.term_id
         WHERE tr.object_id IN (?) AND tt.taxonomy = 'course-category'`, [courseIds])
      for (const c of catRows) if (!courseCategory.has(c.object_id)) courseCategory.set(c.object_id, c.name)
    }

    const wpCourseToId = new Map()
    const usedSlugs = new Set()
    for (const c of courses) {
      const meta = courseMeta.get(c.ID) || {}
      let slug = c.post_name || slugify(c.post_title) || `course-${c.ID}`
      if (usedSlugs.has(slug)) slug = `${slug}-${c.ID}`
      usedSlugs.add(slug)
      const price = parseFloat(meta.tutor_course_price) || 0
      // Recover descriptions that live in post_excerpt rather than post_content.
      const description = (c.post_content && c.post_content.trim())
        ? c.post_content
        : (c.post_excerpt && c.post_excerpt.trim() ? c.post_excerpt : null)
      // Flag placeholder test courses so the public site can hide them.
      const isTest = /\btesting\b/i.test(c.post_title || '')
      const status = isTest ? 'Hidden' : 'Online'
      const [res] = await conn.query(
        `INSERT INTO ${tgt('courses')}
         (title, slug, description, price, status, category, instructor_name, thumbnail_url, level, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          (c.post_title || 'Untitled').slice(0, 255),
          slug.slice(0, 255),
          description,
          price,
          status,
          (courseCategory.get(c.ID) || null),
          (authorName.get(c.post_author) || null),
          toRelativeUpload(thumbUrl.get(Number(meta._thumbnail_id)) || null),
          mapLevel(meta._tutor_course_level),
          (c.post_date && !String(c.post_date).startsWith('0000')) ? c.post_date : new Date(),
        ]
      )
      wpCourseToId.set(c.ID, res.insertId)
      summary.courses++
    }

    // Backfill missing thumbnail for Mutammimah (Installments) from sibling Mutammimah courses.
    const [mutThumb] = await conn.query(
      `SELECT thumbnail_url FROM ${tgt('courses')}
       WHERE title LIKE 'Mutammimah al-%' AND thumbnail_url IS NOT NULL LIMIT 1`
    )
    if (mutThumb.length) {
      const [r] = await conn.query(
        `UPDATE ${tgt('courses')} SET thumbnail_url = ?
         WHERE title LIKE '%Mutammimah%Installments%' AND thumbnail_url IS NULL`,
        [mutThumb[0].thumbnail_url]
      )
      if (r.affectedRows) summary.thumbnails_backfilled = r.affectedRows
    }

    console.log(`  courses: ${summary.courses}`)

    // ── 4 & 5. Lessons (flattened) + quizzes attached to preceding lesson ──
    console.log('Importing lessons + quizzes...')

    // Topics per course
    const [topics] = await conn.query(
      `SELECT ID, post_parent, menu_order FROM ${src('posts')}
       WHERE post_type='topics' AND post_parent IN (?) ORDER BY post_parent, menu_order, ID`,
      [courseIds.length ? courseIds : [0]]
    )
    const topicsByCourse = new Map()
    for (const t of topics) {
      if (!topicsByCourse.has(t.post_parent)) topicsByCourse.set(t.post_parent, [])
      topicsByCourse.get(t.post_parent).push(t.ID)
    }
    const allTopicIds = topics.map((t) => t.ID)

    // Items (lessons + quizzes) per topic
    const itemsByTopic = new Map()
    if (allTopicIds.length) {
      const [items] = await conn.query(
        `SELECT ID, post_parent, post_type, post_title, post_name, menu_order
         FROM ${src('posts')}
         WHERE post_parent IN (?) AND post_type IN ('lesson','tutor_quiz')
         ORDER BY post_parent, menu_order, ID`, [allTopicIds])
      for (const it of items) {
        if (!itemsByTopic.has(it.post_parent)) itemsByTopic.set(it.post_parent, [])
        itemsByTopic.get(it.post_parent).push(it)
      }
    }

    // Lesson metadata (video + preview flag)
    const allLessonIds = []
    for (const list of itemsByTopic.values()) for (const it of list) if (it.post_type === 'lesson') allLessonIds.push(it.ID)
    const lessonMeta = await postMetaFor(allLessonIds, ['_video', '_is_preview'])

    // Quiz pass-grade metadata
    const allQuizIds = []
    for (const list of itemsByTopic.values()) for (const it of list) if (it.post_type === 'tutor_quiz') allQuizIds.push(it.ID)
    const quizMeta = await postMetaFor(allQuizIds, ['tutor_quiz_option'])

    const quizToLesson = [] // { wpQuizId, newLessonId, passPercent }
    const wpLessonToId = new Map() // wp lesson post ID -> new lessons.id
    const wpQuizToId = new Map()   // wp quiz post ID  -> new quizzes.id

    for (const c of courses) {
      const newCourseId = wpCourseToId.get(c.ID)
      const topicIds = topicsByCourse.get(c.ID) || []
      let orderIndex = 0
      const courseLessonStack = [] // newLessonIds in order, for quiz attachment

      for (const topicId of topicIds) {
        const items = itemsByTopic.get(topicId) || []
        for (const it of items) {
          if (it.post_type === 'lesson') {
            const meta = lessonMeta.get(it.ID) || {}
            let url = phpStr(meta._video, 'source_youtube')
            if (!url) {
              url = PLACEHOLDER_VIDEO_URL
              summary.lessons_placeholder_video.push({ courseId: newCourseId, title: it.post_title })
            }
            const isFree = (meta._is_preview === 'yes' || meta._is_preview === '1') ? 1 : 0
            const [res] = await conn.query(
              `INSERT INTO ${tgt('lessons')} (course_id, title, slug, youtube_url, is_free, order_index)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [newCourseId, (it.post_title || 'Lesson').slice(0, 255),
                (it.post_name || slugify(it.post_title) || `lesson-${it.ID}`).slice(0, 255),
                url.slice(0, 500), isFree, orderIndex++]
            )
            courseLessonStack.push(res.insertId)
            wpLessonToId.set(it.ID, res.insertId)
          } else {
            // tutor_quiz: attach to the nearest preceding lesson without a quiz yet
            const meta = quizMeta.get(it.ID) || {}
            const passPercent = parseInt(phpStr(meta.tutor_quiz_option, 'passing_grade'), 10) || 70
            let targetLesson = null
            for (let i = courseLessonStack.length - 1; i >= 0; i--) {
              if (!quizToLesson.some((q) => q.newLessonId === courseLessonStack[i])) {
                targetLesson = courseLessonStack[i]; break
              }
            }
            if (targetLesson == null) {
              summary.quizzes_unattached.push({ courseId: newCourseId, title: it.post_title })
              continue
            }
            quizToLesson.push({ wpQuizId: it.ID, newLessonId: targetLesson, passPercent })
          }
        }
      }
      summary.lessons += courseLessonStack.length
    }
    console.log(`  lessons: ${summary.lessons}`)

    // Insert quizzes + questions + options
    for (const q of quizToLesson) {
      const [res] = await conn.query(
        `INSERT INTO ${tgt('quizzes')} (lesson_id, pass_percent) VALUES (?, ?)`,
        [q.newLessonId, q.passPercent]
      )
      const newQuizId = res.insertId
      wpQuizToId.set(q.wpQuizId, newQuizId)
      summary.quizzes++

      const [questions] = await conn.query(
        `SELECT question_id, question_title, question_type, question_order
         FROM ${src('tutor_quiz_questions')} WHERE quiz_id = ? ORDER BY question_order, question_id`,
        [q.wpQuizId]
      )
      for (const qq of questions) {
        if (!MCQ_TYPES.has(qq.question_type)) { summary.questions_skipped_non_mcq++; continue }
        const text = stripHtml(qq.question_title)
        if (!text) continue
        const [qres] = await conn.query(
          `INSERT INTO ${tgt('quiz_questions')} (quiz_id, question_text, order_index) VALUES (?, ?, ?)`,
          [newQuizId, text, qq.question_order || 0]
        )
        const newQId = qres.insertId
        summary.questions++

        const [answers] = await conn.query(
          `SELECT answer_title, is_correct, answer_order FROM ${src('tutor_quiz_question_answers')}
           WHERE belongs_question_id = ? ORDER BY answer_order, answer_id`, [qq.question_id]
        )
        const optionRows = answers
          .map((a) => [newQId, stripHtml(a.answer_title).slice(0, 500), a.is_correct ? 1 : 0, a.answer_order || 0])
          .filter((r) => r[1])
        if (optionRows.length) {
          await conn.query(
            `INSERT INTO ${tgt('quiz_options')} (question_id, option_text, is_correct, order_index) VALUES ?`,
            [optionRows]
          )
          summary.options += optionRows.length
        }
      }
    }
    console.log(`  quizzes: ${summary.quizzes}, questions: ${summary.questions}, options: ${summary.options}`)

    // ── 6. Enrollments (completed) ──
    console.log('Importing enrollments...')
    const [enrolled] = await conn.query(
      `SELECT post_author, post_parent FROM ${src('posts')}
       WHERE post_type='tutor_enrolled' AND post_status='completed'`
    )
    const enrollRows = []
    const seen = new Set()
    const unmappedAuthors = new Set()
    for (const e of enrolled) {
      const userId = wpUserToAuthId.get(e.post_author)
      const courseId = wpCourseToId.get(e.post_parent)
      if (!userId || !courseId) {
        summary.enrollments_skipped++
        if (!userId) unmappedAuthors.add(e.post_author)
        continue
      }
      const key = `${userId}:${courseId}`
      if (seen.has(key)) continue
      seen.add(key)
      enrollRows.push([userId, courseId])
    }
    if (enrollRows.length) {
      // chunk to keep the statement size reasonable
      for (let i = 0; i < enrollRows.length; i += 500) {
        const chunk = enrollRows.slice(i, i + 500)
        const [res] = await conn.query(
          `INSERT IGNORE INTO ${tgt('enrollments')} (user_id, course_id) VALUES ?`, [chunk]
        )
        summary.enrollments += res.affectedRows
      }
    }
    console.log(`  enrollments: ${summary.enrollments} (skipped ${summary.enrollments_skipped} to non-imported course/user)`)
    summary.enrollments_unrecoverable = summary.enrollments_skipped
    summary.deleted_authors = unmappedAuthors.size

    // ── 7. Instructors (post_type='instructor') ──
    console.log('Importing instructors...')
    summary.instructors = 0
    const [instructors] = await conn.query(
      `SELECT ID, post_title, post_name, post_content, menu_order
       FROM ${src('posts')} WHERE post_type='instructor' AND post_status='publish' ORDER BY menu_order, ID`
    )
    if (instructors.length) {
      const instIds = instructors.map((i) => i.ID)
      const instMeta = await postMetaFor(instIds, ['_thumbnail_id', 'designation', 'instructor_designation'])
      const instThumbIds = [...new Set(instIds
        .map((id) => instMeta.get(id)?._thumbnail_id).filter(Boolean).map(Number))]
      const instThumb = new Map()
      if (instThumbIds.length) {
        const [tRows] = await conn.query(
          `SELECT ID, guid FROM ${src('posts')} WHERE ID IN (?)`, [instThumbIds])
        for (const t of tRows) instThumb.set(t.ID, t.guid)
      }
      const instSlugs = new Set()
      let order = 0
      for (const i of instructors) {
        const meta = instMeta.get(i.ID) || {}
        let slug = slugify(i.post_title) || i.post_name || `instructor-${i.ID}`
        if (instSlugs.has(slug)) slug = `${slug}-${i.ID}`
        instSlugs.add(slug)
        const designation = meta.designation || meta.instructor_designation || null
        const bio = htmlToText(i.post_content)
        await conn.query(
          `INSERT INTO ${tgt('instructors')} (name, slug, designation, bio, photo_url, order_index)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), designation=VALUES(designation),
             bio=VALUES(bio), photo_url=VALUES(photo_url), order_index=VALUES(order_index)`,
          [(i.post_title || 'Instructor').slice(0, 160), slug.slice(0, 200),
            designation ? String(designation).slice(0, 200) : null, bio || null,
            toRelativeUpload(instThumb.get(Number(meta._thumbnail_id)) || null), order++]
        )
        summary.instructors++
      }
    }
    console.log(`  instructors: ${summary.instructors}`)

    // Link courses.instructor_id by matching instructor_name (with common aliases).
    summary.instructor_links = 0
    const [instRows] = await conn.query(`SELECT id, name FROM ${tgt('instructors')}`)
    const instByName = new Map(instRows.map((r) => [r.name.toLowerCase(), r.id]))
    const nameAliases = { 'sh. omer khurshid': 'sheikh omer khurshid' }
    const [courseRows] = await conn.query(
      `SELECT id, instructor_name FROM ${tgt('courses')} WHERE instructor_name IS NOT NULL AND instructor_name <> ''`
    )
    for (const c of courseRows) {
      const raw = c.instructor_name.trim().toLowerCase()
      const lookup = nameAliases[raw] || raw
      const instId = instByName.get(lookup)
      if (instId) {
        await conn.query(`UPDATE ${tgt('courses')} SET instructor_id = ? WHERE id = ?`, [instId, c.id])
        summary.instructor_links++
      }
    }
    console.log(`  courses linked to instructors: ${summary.instructor_links}`)

    // ── 8. Services (post_type='our-service') ──
    console.log('Importing services...')
    summary.services = 0
    const [servicePosts] = await conn.query(
      `SELECT ID, post_title, post_name, post_date, menu_order
       FROM ${src('posts')} WHERE post_type='our-service' AND post_status='publish' ORDER BY menu_order, ID`
    )
    if (servicePosts.length) {
      const svcIds = servicePosts.map((s) => s.ID)
      const svcMeta = await postMetaFor(svcIds, ['_thumbnail_id', 'about_the_services'])
      const svcThumbIds = [...new Set(svcIds
        .map((id) => svcMeta.get(id)?._thumbnail_id).filter(Boolean).map(Number))]
      const svcThumb = new Map()
      if (svcThumbIds.length) {
        const [tRows] = await conn.query(
          `SELECT ID, guid FROM ${src('posts')} WHERE ID IN (?)`, [svcThumbIds])
        for (const t of tRows) svcThumb.set(t.ID, t.guid)
      }
      const svcSlugs = new Set()
      let order = 0
      for (const s of servicePosts) {
        const meta = svcMeta.get(s.ID) || {}
        let slug = slugify(s.post_title) || s.post_name || `service-${s.ID}`
        if (svcSlugs.has(slug)) slug = `${slug}-${s.ID}`
        svcSlugs.add(slug)
        const body = (meta.about_the_services || '').trim() || null
        const excerpt = body ? body.slice(0, 240) : null
        await conn.query(
          `INSERT INTO ${tgt('services')} (title, slug, excerpt, body, thumbnail_url, order_index, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), excerpt=VALUES(excerpt), body=VALUES(body),
             thumbnail_url=VALUES(thumbnail_url), order_index=VALUES(order_index), published_at=VALUES(published_at)`,
          [(s.post_title || 'Service').slice(0, 255), slug.slice(0, 255), excerpt, body,
            toRelativeUpload(svcThumb.get(Number(meta._thumbnail_id)) || null), order++,
            (s.post_date && !String(s.post_date).startsWith('0000')) ? s.post_date : null]
        )
        summary.services++
      }
    }
    console.log(`  services: ${summary.services}`)

    // ── 9. Articles (post_type='post') — recover missing ones ──
    console.log('Importing articles...')
    summary.articles = 0
    const [articlePosts] = await conn.query(
      `SELECT ID, post_title, post_excerpt, post_content, post_date
       FROM ${src('posts')} WHERE post_type='post' AND post_status='publish' ORDER BY post_date`
    )
    if (articlePosts.length) {
      const artIds = articlePosts.map((a) => a.ID)
      const artMeta = await postMetaFor(artIds, ['_thumbnail_id'])
      const artThumbIds = [...new Set(artIds
        .map((id) => artMeta.get(id)?._thumbnail_id).filter(Boolean).map(Number))]
      const artThumb = new Map()
      if (artThumbIds.length) {
        const [tRows] = await conn.query(
          `SELECT ID, guid FROM ${src('posts')} WHERE ID IN (?)`, [artThumbIds])
        for (const t of tRows) artThumb.set(t.ID, t.guid)
      }
      // Article categories (first 'category' term)
      const [artCatRows] = await conn.query(
        `SELECT tr.object_id, t.name FROM ${src('term_relationships')} tr
         JOIN ${src('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
         JOIN ${src('terms')} t ON t.term_id = tt.term_id
         WHERE tr.object_id IN (?) AND tt.taxonomy = 'category'`, [artIds])
      const artCat = new Map()
      for (const c of artCatRows) if (!artCat.has(c.object_id)) artCat.set(c.object_id, c.name)

      for (const a of articlePosts) {
        const meta = artMeta.get(a.ID) || {}
        const cleanTitle = stripHtml(a.post_title) || 'Article'
        const slug = slugify(cleanTitle) || `article-${a.ID}`
        const blocks = htmlToBlocks(a.post_content)
        const wordCount = blocks.filter((b) => b.text).reduce((n, b) => n + b.text.split(/\s+/).length, 0)
        const readTime = `${Math.max(1, Math.round(wordCount / 200))} Minutes`
        const excerpt = stripHtml(a.post_excerpt) ||
          (blocks.find((b) => b.type === 'paragraph')?.text || '').slice(0, 240) || null
        // INSERT IGNORE: preserve curated seed articles (morality, quduri); add missing ones.
        const [r] = await conn.query(
          `INSERT IGNORE INTO ${tgt('articles')}
            (title, slug, category, excerpt, image_url, youtube_url, read_time, published_at, content_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cleanTitle.slice(0, 255), slug.slice(0, 255),
            (artCat.get(a.ID) || 'Uncategorized'), excerpt,
            toRelativeUpload(artThumb.get(Number(meta._thumbnail_id)) || null),
            null, readTime,
            (a.post_date && !String(a.post_date).startsWith('0000')) ? a.post_date : null,
            JSON.stringify(blocks)]
        )
        if (r.affectedRows > 0) summary.articles++
      }
    }
    console.log(`  articles imported (new): ${summary.articles}`)

    // ── 10. Pages (legal / marketing) ──
    console.log('Importing pages...')
    summary.pages = 0
    const wantedPages = ['privacy-policy', 'terms-conditions']
    const [pagePosts] = await conn.query(
      `SELECT post_title, post_name, post_content FROM ${src('posts')}
       WHERE post_type='page' AND post_status='publish' AND post_name IN (?)`, [wantedPages]
    )
    for (const p of pagePosts) {
      await conn.query(
        `INSERT INTO ${tgt('pages')} (slug, title, content_html) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), content_html=VALUES(content_html)`,
        [p.post_name, stripHtml(p.post_title).slice(0, 255), cleanWpHtml(p.post_content)]
      )
      summary.pages++
    }
    console.log(`  pages: ${summary.pages}`)

    // ── 11. Lesson progress (Tutor completed-lesson usermeta) ──
    console.log('Importing lesson progress...')
    summary.lesson_progress = 0
    summary.lesson_progress_skipped = 0
    const [completedRows] = await conn.query(
      `SELECT user_id, meta_key, meta_value FROM ${src('usermeta')}
       WHERE meta_key LIKE '_tutor_completed_lesson_id_%'`
    )
    const progressRows = []
    const seenProgress = new Set()
    for (const r of completedRows) {
      const wpLessonId = Number(r.meta_key.replace('_tutor_completed_lesson_id_', ''))
      const userId = wpUserToAuthId.get(r.user_id)
      const lessonId = wpLessonToId.get(wpLessonId)
      if (!userId || !lessonId) { summary.lesson_progress_skipped++; continue }
      const key = `${userId}:${lessonId}`
      if (seenProgress.has(key)) continue
      seenProgress.add(key)
      const ts = Number(r.meta_value)
      const completedAt = (ts && ts > 0) ? new Date(ts * 1000) : new Date()
      progressRows.push([userId, lessonId, 100, 1, completedAt])
    }
    for (let i = 0; i < progressRows.length; i += 500) {
      const chunk = progressRows.slice(i, i + 500)
      const [r] = await conn.query(
        `INSERT IGNORE INTO ${tgt('lesson_progress')}
          (user_id, lesson_id, watch_percentage, completed, completed_at) VALUES ?`,
        [chunk]
      )
      summary.lesson_progress += r.affectedRows
    }
    console.log(`  lesson_progress: ${summary.lesson_progress} (skipped ${summary.lesson_progress_skipped})`)

    // ── 12. Quiz attempts (Tutor quiz attempts) ──
    console.log('Importing quiz attempts...')
    summary.quiz_attempts = 0
    summary.quiz_attempts_skipped = 0
    const [attempts] = await conn.query(
      `SELECT quiz_id, user_id, total_questions, earned_marks, total_marks, result, attempt_ended_at
       FROM ${src('tutor_quiz_attempts')} WHERE attempt_status='attempt_ended'`
    )
    const attemptRows = []
    for (const a of attempts) {
      const userId = wpUserToAuthId.get(a.user_id)
      const quizId = wpQuizToId.get(a.quiz_id)
      if (!userId || !quizId) { summary.quiz_attempts_skipped++; continue }
      const totalMarks = Number(a.total_marks) || 0
      const earned = Number(a.earned_marks) || 0
      const pct = totalMarks > 0 ? Math.round((earned / totalMarks) * 100) : 0
      const total = Number(a.total_questions) || 0
      const passed = (a.result === 'pass') ? 1 : 0
      const attemptedAt = a.attempt_ended_at && !String(a.attempt_ended_at).startsWith('0000')
        ? a.attempt_ended_at : new Date()
      attemptRows.push([userId, quizId, Math.round(earned), total, Math.min(100, pct), passed, attemptedAt])
    }
    for (let i = 0; i < attemptRows.length; i += 500) {
      const chunk = attemptRows.slice(i, i + 500)
      const [r] = await conn.query(
        `INSERT INTO ${tgt('quiz_attempts')}
          (user_id, quiz_id, score, total, pct, passed, attempted_at) VALUES ?`,
        [chunk]
      )
      summary.quiz_attempts += r.affectedRows
    }
    console.log(`  quiz_attempts: ${summary.quiz_attempts} (skipped ${summary.quiz_attempts_skipped})`)

    // ── 13. Commerce (products / orders / subscriptions / coupons) ──
    console.log('Importing commerce data...')
    summary.products = 0; summary.orders = 0; summary.order_items = 0
    summary.subscriptions = 0; summary.coupons = 0; summary.access_reconciled = 0

    // product (WP) -> new course id, via course meta _tutor_course_product_id
    const productToCourse = new Map()
    if (courseIds.length) {
      const [linkRows] = await conn.query(
        `SELECT post_id, meta_value FROM ${src('postmeta')}
         WHERE meta_key='_tutor_course_product_id' AND post_id IN (?)`, [courseIds])
      for (const l of linkRows) {
        const newCourseId = wpCourseToId.get(l.post_id)
        const productWpId = Number(l.meta_value)
        if (newCourseId && productWpId) productToCourse.set(productWpId, newCourseId)
      }
    }

    // Products
    const [products] = await conn.query(
      `SELECT ID, post_title FROM ${src('posts')} WHERE post_type='product' AND post_status='publish'`
    )
    const wpProductToId = new Map()
    const productName = new Map()
    if (products.length) {
      const prodIds = products.map((p) => p.ID)
      const prodMeta = await postMetaFor(prodIds, ['_price', '_regular_price', '_subscription_period'])
      // subscription product types
      const [subTypeRows] = await conn.query(
        `SELECT tr.object_id FROM ${src('term_relationships')} tr
         JOIN ${src('term_taxonomy')} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
         JOIN ${src('terms')} t ON t.term_id = tt.term_id
         WHERE tt.taxonomy='product_type' AND t.slug IN ('subscription','variable-subscription')
           AND tr.object_id IN (?)`, [prodIds])
      const subProducts = new Set(subTypeRows.map((r) => r.object_id))
      for (const p of products) {
        const meta = prodMeta.get(p.ID) || {}
        const period = meta._subscription_period || null
        const isSub = subProducts.has(p.ID) || !!period
        const price = parseFloat(meta._price || meta._regular_price) || 0
        const [r] = await conn.query(
          `INSERT INTO ${tgt('products')} (wp_product_id, course_id, name, price, type, billing_period)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [p.ID, productToCourse.get(p.ID) || null, (p.post_title || 'Product').slice(0, 255),
            price, isSub ? 'subscription' : 'onetime', period]
        )
        wpProductToId.set(p.ID, r.insertId)
        productName.set(p.ID, p.post_title)
        summary.products++
      }
    }

    // Orders (HPOS)
    const [wcOrders] = await conn.query(
      `SELECT id, status, currency, total_amount, customer_id, billing_email, date_created_gmt, payment_method
       FROM ${src('wc_orders')} WHERE type='shop_order'`
    )
    const wpOrderToId = new Map()
    for (const o of wcOrders) {
      const email = (o.billing_email || '').trim().toLowerCase()
      const userId = wpUserToAuthId.get(o.customer_id) || (email ? emailToId.get(email) : null) || null
      const [r] = await conn.query(
        `INSERT INTO ${tgt('orders')} (wp_order_id, user_id, billing_email, status, total, currency, payment_method, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, userId, email || null, (o.status || '').replace(/^wc-/, '') || 'completed',
          parseFloat(o.total_amount) || 0, o.currency || 'USD', o.payment_method || null,
          (o.date_created_gmt && !String(o.date_created_gmt).startsWith('0000')) ? o.date_created_gmt : null]
      )
      wpOrderToId.set(o.id, r.insertId)
      summary.orders++
    }

    // Order items (from product lookup)
    if (wpOrderToId.size) {
      const orderWpIds = [...wpOrderToId.keys()]
      for (let i = 0; i < orderWpIds.length; i += 500) {
        const chunk = orderWpIds.slice(i, i + 500)
        const [items] = await conn.query(
          `SELECT order_id, product_id, product_qty, product_gross_revenue
           FROM ${src('wc_order_product_lookup')} WHERE order_id IN (?)`, [chunk])
        const rows = []
        for (const it of items) {
          const newOrderId = wpOrderToId.get(it.order_id)
          if (!newOrderId) continue
          rows.push([newOrderId, wpProductToId.get(it.product_id) || null,
            productToCourse.get(it.product_id) || null,
            (productName.get(it.product_id) || null),
            it.product_qty || 1, parseFloat(it.product_gross_revenue) || 0])
        }
        if (rows.length) {
          const [r] = await conn.query(
            `INSERT INTO ${tgt('order_items')} (order_id, product_id, course_id, name, quantity, total) VALUES ?`, [rows])
          summary.order_items += r.affectedRows
        }
      }
    }

    // Subscriptions (post_type shop_subscription, exclude trash)
    const [subs] = await conn.query(
      `SELECT ID, post_status, post_author FROM ${src('posts')}
       WHERE post_type='shop_subscription' AND post_status <> 'trash'`
    )
    if (subs.length) {
      const subIds = subs.map((s) => s.ID)
      const subMeta = await postMetaFor(subIds,
        ['_customer_user', '_billing_email', '_order_total', '_billing_period',
          '_schedule_start', '_schedule_next_payment'])
      // subscription line-item product ids
      const [subItems] = await conn.query(
        `SELECT oi.order_id, im.meta_value AS product_id
         FROM ${src('woocommerce_order_items')} oi
         JOIN ${src('woocommerce_order_itemmeta')} im ON im.order_item_id = oi.order_item_id
         WHERE oi.order_id IN (?) AND oi.order_item_type='line_item' AND im.meta_key='_product_id'`, [subIds])
      const subProduct = new Map()
      for (const si of subItems) if (!subProduct.has(si.order_id)) subProduct.set(si.order_id, Number(si.product_id))

      const accessRows = []
      for (const s of subs) {
        const meta = subMeta.get(s.ID) || {}
        const email = (meta._billing_email || '').trim().toLowerCase()
        const customerId = Number(meta._customer_user) || null
        const userId = wpUserToAuthId.get(customerId) || (email ? emailToId.get(email) : null) || null
        const productWpId = subProduct.get(s.ID)
        const courseId = productWpId ? (productToCourse.get(productWpId) || null) : null
        const status = (s.post_status || '').replace(/^wc-/, '')
        const start = meta._schedule_start || null
        const next = meta._schedule_next_payment || null
        await conn.query(
          `INSERT INTO ${tgt('subscriptions')}
            (wp_subscription_id, user_id, billing_email, course_id, product_id, status, total, billing_period, start_at, next_payment_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.ID, userId, email || null, courseId,
            productWpId ? (wpProductToId.get(productWpId) || null) : null, status,
            meta._order_total ? parseFloat(meta._order_total) : null, meta._billing_period || null,
            (start && start !== '0' && !String(start).startsWith('0000')) ? start : null,
            (next && next !== '0' && !String(next).startsWith('0000')) ? next : null]
        )
        summary.subscriptions++
        // Reconcile access for active / on-hold subscribers.
        if ((status === 'active' || status === 'on-hold') && userId && courseId) {
          accessRows.push([userId, courseId])
        }
      }
      if (accessRows.length) {
        const [r] = await conn.query(
          `INSERT IGNORE INTO ${tgt('enrollments')} (user_id, course_id) VALUES ?`, [accessRows])
        summary.access_reconciled = r.affectedRows
      }
    }

    // Coupons
    const [coupons] = await conn.query(
      `SELECT ID, post_title FROM ${src('posts')} WHERE post_type='shop_coupon' AND post_status<>'trash'`
    )
    if (coupons.length) {
      const couponIds = coupons.map((c) => c.ID)
      const couponMeta = await postMetaFor(couponIds,
        ['discount_type', 'coupon_amount', 'usage_limit', 'usage_count', 'date_expires'])
      const usedCodes = new Set()
      for (const c of coupons) {
        const meta = couponMeta.get(c.ID) || {}
        let code = (c.post_title || `coupon-${c.ID}`).trim()
        if (usedCodes.has(code.toLowerCase())) code = `${code}-${c.ID}`
        usedCodes.add(code.toLowerCase())
        const expiresUnix = Number(meta.date_expires) || 0
        await conn.query(
          `INSERT INTO ${tgt('coupons')} (wp_coupon_id, code, discount_type, amount, usage_limit, usage_count, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [c.ID, code.slice(0, 190), meta.discount_type || null, parseFloat(meta.coupon_amount) || 0,
            meta.usage_limit ? Number(meta.usage_limit) : null, Number(meta.usage_count) || 0,
            expiresUnix > 0 ? new Date(expiresUnix * 1000) : null]
        )
        summary.coupons++
      }
    }
    console.log(`  products: ${summary.products}, orders: ${summary.orders}, items: ${summary.order_items}, subscriptions: ${summary.subscriptions}, coupons: ${summary.coupons}, access reconciled: ${summary.access_reconciled}`)

    // ── 14. Contact form history (Gravity Forms entries) ──
    console.log('Importing contact-form submissions...')
    summary.contact_messages = 0
    try {
      const [gfEntries] = await conn.query(
        `SELECT id, date_created FROM ${src('gf_entry')} WHERE status='active' OR status IS NULL`
      )
      if (gfEntries.length) {
        const entryIds = gfEntries.map((e) => e.id)
        const [gfMeta] = await conn.query(
          `SELECT entry_id, meta_key, meta_value FROM ${src('gf_entry_meta')} WHERE entry_id IN (?)`, [entryIds])
        const metaByEntry = new Map()
        for (const m of gfMeta) {
          if (!metaByEntry.has(m.entry_id)) metaByEntry.set(m.entry_id, {})
          metaByEntry.get(m.entry_id)[m.meta_key] = m.meta_value
        }
        // Idempotent: clear prior imported rows, keep live contact_form submissions.
        await conn.query(`DELETE FROM ${tgt('contact_messages')} WHERE source='gravity_forms'`)
        for (const e of gfEntries) {
          const m = metaByEntry.get(e.id) || {}
          const name = [m['1.3'], m['1.6']].filter(Boolean).join(' ').trim() || m['1'] || 'Unknown'
          const email = (m['3'] || '').trim()
          const message = (m['6'] || m['2'] || '').trim()
          if (!email && !message) continue
          await conn.query(
            `INSERT INTO ${tgt('contact_messages')} (name, email, message, source, created_at) VALUES (?, ?, ?, 'gravity_forms', ?)`,
            [name.slice(0, 200), (email || 'unknown@imported.local').slice(0, 320),
              message || '(no message)',
              (e.date_created && !String(e.date_created).startsWith('0000')) ? e.date_created : new Date()]
          )
          summary.contact_messages++
        }
      }
    } catch (err) {
      console.log(`  (skipped contact-form import: ${err.code || err.message})`)
    }
    console.log(`  contact_messages imported: ${summary.contact_messages}`)

    // ── Summary ──
    console.log('\n===== MIGRATION SUMMARY =====')
    console.log(`Users inserted:        ${summary.users_inserted}`)
    console.log(`Users already existed: ${summary.users_existing}`)
    console.log(`Courses:               ${summary.courses}`)
    console.log(`Lessons:               ${summary.lessons}`)
    console.log(`  using placeholder video: ${summary.lessons_placeholder_video.length}`)
    console.log(`Quizzes:               ${summary.quizzes}`)
    console.log(`Questions:             ${summary.questions}`)
    console.log(`Options:               ${summary.options}`)
    console.log(`Non-MCQ questions skipped: ${summary.questions_skipped_non_mcq}`)
    console.log(`Quizzes with no attachable lesson: ${summary.quizzes_unattached.length}`)
    console.log(`Enrollments:           ${summary.enrollments}`)
    console.log(`Instructors:           ${summary.instructors || 0}`)
    console.log(`Services:              ${summary.services || 0}`)
    console.log(`Articles (new):        ${summary.articles || 0}`)
    console.log(`Pages:                 ${summary.pages || 0}`)
    console.log(`Lesson progress:       ${summary.lesson_progress || 0}`)
    console.log(`Quiz attempts:         ${summary.quiz_attempts || 0}`)
    console.log(`Products:              ${summary.products || 0}`)
    console.log(`Orders:                ${summary.orders || 0}`)
    console.log(`Order items:           ${summary.order_items || 0}`)
    console.log(`Subscriptions:         ${summary.subscriptions || 0}`)
    console.log(`Coupons:               ${summary.coupons || 0}`)
    console.log(`Access reconciled:     ${summary.access_reconciled || 0}`)

    if (summary.enrollments_unrecoverable) {
      console.log(`\n--- Unrecoverable enrollments (manual review) ---`)
      console.log(`  ${summary.enrollments_unrecoverable} completed enrollments could not be migrated`)
      console.log(`  (tied to ${summary.deleted_authors} WordPress users with no importable account / email).`)
    }

    if (summary.lessons_placeholder_video.length) {
      console.log('\n--- Lessons using the PLACEHOLDER video (need real links) ---')
      for (const l of summary.lessons_placeholder_video) console.log(`  [course ${l.courseId}] ${l.title}`)
    }
    if (summary.quizzes_unattached.length) {
      console.log('\n--- Quizzes skipped (no preceding lesson to attach to) ---')
      for (const z of summary.quizzes_unattached) console.log(`  [course ${z.courseId}] ${z.title}`)
    }
  } finally {
    await conn.end()
  }
}

main().then(() => { console.log('\nDone.'); process.exit(0) })
  .catch((err) => { console.error('\nMigration failed:', err); process.exit(1) })
