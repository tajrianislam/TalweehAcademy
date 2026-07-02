/**
 * Self-host media off the (compromised / unreliable) live WordPress CDN.
 *
 * Collects every referenced upload URL from:
 *   - WordPress attachments (staging DB, post_type='attachment')
 *   - app DB course/article image fields (thumbnail_url, instructor_avatar_url, image_url)
 *   - a curated list of UI chrome assets referenced in code/CSS (logo, borders, fonts, …)
 *
 * Downloads each into new_talweeh/public/wp-content/uploads/<path>, mirroring the
 * path after `/wp-content/uploads/`. Existing files and dead (non-200) URLs are skipped.
 *
 * Usage: node server/scripts/download-media.js
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const fs = require('fs')
const https = require('https')
const mysql = require('mysql2/promise')

const SOURCE_DB = process.env.WP_STAGING_DB || 'talweeh_wp'
const TARGET_DB = process.env.DB_NAME || 'talweeh_test'
const PREFIX = 'nr2u8_'
const UPLOADS_HOST = 'https://talweehacademy.com'
const UPLOADS_MARKER = '/wp-content/uploads/'
const PUBLIC_ROOT = path.resolve(__dirname, '../../public')

// UI chrome assets referenced directly in JSX/CSS (not always in the attachments table).
const UI_ASSETS = [
  '/wp-content/uploads/2024/11/logo_final-scaled-600x171.webp',
  '/wp-content/uploads/2024/11/favicon_footer2.webp',
  '/wp-content/uploads/2024/08/border2.svg',
  '/wp-content/uploads/2024/08/border3.svg',
  '/wp-content/uploads/2024/08/background4.webp',
  '/wp-content/uploads/2024/12/email-1024x340.webp',
  '/wp-content/uploads/2024/08/Epilogue-Regular.woff2',
  '/wp-content/uploads/2024/08/Epilogue-SemiBold.woff2',
  '/wp-content/uploads/2024/08/Cinzel-Regular.woff2',
  '/wp-content/uploads/2024/08/Cinzel-Medium.woff2',
  '/wp-content/uploads/2024/08/Cinzel-SemiBold.woff2',
  '/wp-content/uploads/2024/08/Cinzel-Bold.woff2',
]

// Turn any absolute or relative upload reference into the path after the marker.
function uploadSubPath(url) {
  if (!url) return null
  const idx = url.indexOf(UPLOADS_MARKER)
  if (idx === -1) return null
  return url.slice(idx + UPLOADS_MARKER.length)
}

function download(url, dest) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return resolve({ ok: false, status: res.statusCode })
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      const tmp = `${dest}.part`
      const file = fs.createWriteStream(tmp)
      res.pipe(file)
      file.on('finish', () => file.close(() => {
        fs.renameSync(tmp, dest)
        resolve({ ok: true })
      }))
      file.on('error', () => { try { fs.unlinkSync(tmp) } catch { /* noop */ } resolve({ ok: false, status: 'write_error' }) })
    })
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'timeout' }) })
    req.on('error', (e) => resolve({ ok: false, status: e.code || 'error' }))
  })
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.tajDB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  })

  const subPaths = new Set()
  for (const a of UI_ASSETS) {
    const sp = uploadSubPath(a)
    if (sp) subPaths.add(sp)
  }

  try {
    const [attachments] = await conn.query(
      `SELECT guid FROM \`${SOURCE_DB}\`.\`${PREFIX}posts\` WHERE post_type='attachment'`
    )
    for (const row of attachments) {
      const sp = uploadSubPath(row.guid)
      if (sp) subPaths.add(sp)
    }

    const [courses] = await conn.query(
      `SELECT thumbnail_url, instructor_avatar_url FROM \`${TARGET_DB}\`.courses`
    )
    for (const c of courses) {
      for (const v of [c.thumbnail_url, c.instructor_avatar_url]) {
        const sp = uploadSubPath(v)
        if (sp) subPaths.add(sp)
      }
    }

    const [articles] = await conn.query(`SELECT image_url FROM \`${TARGET_DB}\`.articles`)
    for (const a of articles) {
      const sp = uploadSubPath(a.image_url)
      if (sp) subPaths.add(sp)
    }

    // instructors / services tables may not exist yet on first run — query defensively.
    for (const [table, col] of [['instructors', 'photo_url'], ['services', 'thumbnail_url']]) {
      try {
        const [rows] = await conn.query(`SELECT ${col} AS v FROM \`${TARGET_DB}\`.${table}`)
        for (const r of rows) {
          const sp = uploadSubPath(r.v)
          if (sp) subPaths.add(sp)
        }
      } catch { /* table not created yet */ }
    }

    console.log(`Collected ${subPaths.size} distinct media paths. Downloading into ${PUBLIC_ROOT}${UPLOADS_MARKER}\n`)

    let downloaded = 0, skipped = 0, failed = 0
    const failures = []
    for (const sp of subPaths) {
      const dest = path.join(PUBLIC_ROOT, 'wp-content', 'uploads', sp)
      if (fs.existsSync(dest)) { skipped++; continue }
      const url = `${UPLOADS_HOST}${UPLOADS_MARKER}${sp}`
      const result = await download(url, dest)
      if (result.ok) { downloaded++; if (downloaded % 50 === 0) console.log(`  …${downloaded} downloaded`) }
      else { failed++; failures.push(`${result.status}  ${sp}`) }
    }

    console.log('\n===== MEDIA DOWNLOAD SUMMARY =====')
    console.log(`Downloaded: ${downloaded}`)
    console.log(`Already present (skipped): ${skipped}`)
    console.log(`Failed / missing on CDN: ${failed}`)
    if (failures.length) {
      console.log('\n--- Failed downloads (likely deleted from the live site) ---')
      for (const f of failures) console.log(`  ${f}`)
    }
  } finally {
    await conn.end()
  }
}

main().then(() => { console.log('\nDone.'); process.exit(0) })
  .catch((err) => { console.error('\nMedia download failed:', err); process.exit(1) })
