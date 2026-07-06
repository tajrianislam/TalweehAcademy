/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageHeader, PageFooter } from './_shared'
import {
  InstructorsAdmin, ServicesAdmin, ArticlesAdmin, PagesAdmin, ContactInbox, CommerceAdmin, SiteContentAdmin,
} from '../components/AdminContentSections'

const CATEGORIES = [
  'Fiqh (Islamic jurisprudence)',
  '\u2018Aq\u012bdah (Theology)',
  'Adab (Arabic Literature)',
  '\u1e24ad\u012bth',
  'Na\u1e25w (Arabic syntax)',
  'Tafs\u012br',
  'Tajw\u012bd',
  'U\u1e63\u016bl Al-Fiqh (Legal theory)',
  'U\u1e63\u016bl Al-\u1e24ad\u012bth (\u1e24ad\u012bth Nomenclature)',
]

const BLANK_COURSE = {
  title: '', description: '', price: '', cadence: '', status: 'Online',
  category: '', level: 'Beginner', instructor_name: '',
  instructor_avatar_url: '', thumbnail_url: '',
}

const BLANK_LESSON = { title: '', youtube_url: '', is_free: false }

function blankQuestion() {
  return {
    _id: Math.random().toString(36).slice(2),
    question_text: '',
    options: [
      { _id: Math.random().toString(36).slice(2), option_text: '', is_correct: false },
      { _id: Math.random().toString(36).slice(2), option_text: '', is_correct: false },
      { _id: Math.random().toString(36).slice(2), option_text: '', is_correct: false },
      { _id: Math.random().toString(36).slice(2), option_text: '', is_correct: false },
    ],
  }
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase()
}

function formatPrice(price) {
  const n = parseFloat(price)
  if (Number.isNaN(n)) return '$0.00'
  return `$${n.toFixed(2)}`
}

// ── Live Course Preview ────────────────────────────────────
// Mirrors the markup of the public FeaturedCourseCard so the admin
// sees exactly how the course will appear on the site.
function CoursePreviewCard({ form }) {
  const title = form.title.trim() || 'Untitled Course'
  const instructor = form.instructor_name.trim() || 'Instructor name'
  const subtitle = form.category.trim() || 'Talweeh Academy'

  return (
    <article className="course-card">
      <div className="course-art">
        {form.thumbnail_url.trim()
          ? <img src={form.thumbnail_url} alt={title} />
          : <div className="admin-preview-art-fallback">۞</div>}
        <div className="instructor-strip">
          {form.instructor_avatar_url.trim()
            ? <img src={form.instructor_avatar_url} alt="" />
            : <span className="admin-preview-avatar-fallback">{initials(form.instructor_name)}</span>}
          <div>
            <strong>{instructor}</strong>
            <span>{subtitle}</span>
          </div>
        </div>
      </div>
      <div className="course-body">
        <h2>{title}</h2>
        <div className="price-line">
          <strong>{formatPrice(form.price)}</strong>
          {form.cadence.trim() && <span>{form.cadence}</span>}
          <em>[USD]</em>
        </div>
        <div className="course-footer">
          <a href="#" onClick={(e) => e.preventDefault()}>View Course</a>
          <span>{form.status}</span>
        </div>
      </div>
    </article>
  )
}

function CoursePreviewModal({ form, onClose }) {
  return (
    <div className="admin-preview-overlay" onClick={onClose}>
      <div className="admin-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="admin-preview-close" aria-label="Close preview" onClick={onClose}>×</button>
        <div className="admin-preview-modal-head">
          <h3>Course Preview</h3>
          <p>How this course will appear to students</p>
        </div>
        <div className="admin-preview-stage">
          <div className="admin-preview-card-wrap">
            <CoursePreviewCard form={form} />
          </div>
        </div>
        <div className="admin-preview-tags">
          {form.level && <span className="admin-preview-tag">{form.level}</span>}
          {form.category && <span className="admin-preview-tag">{form.category}</span>}
          <span className="admin-preview-tag">{form.status}</span>
        </div>
      </div>
    </div>
  )
}

// ── Create Course Section ──────────────────────────────────
export function CreateCourseSection({ onCreated }) {
  const [form, setForm] = useState(BLANK_COURSE)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setMsg({ type: 'error', text: 'Title is required.' })
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'success', text: `Course "${data.title}" created!` })
      setForm(BLANK_COURSE)
      onCreated()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div className="admin-section-icon">＋</div>
        <div>
          <h2>Create Course</h2>
          <p>Fill in the details below to publish a new course</p>
        </div>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="form-row">
            <label>Title *</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="Course title" required />
          </div>
          <div className="form-row">
            <label>Instructor Name</label>
            <input name="instructor_name" value={form.instructor_name} onChange={handleChange} placeholder="Sh. Omer Khurshid" />
          </div>
          <div className="form-row">
            <label>Price (USD)</label>
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Cadence</label>
            <input name="cadence" value={form.cadence} onChange={handleChange} placeholder="e.g. / month for 12 months" />
          </div>
          <div className="form-row">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Online</option>
              <option>Completed</option>
              <option>Coming Soon</option>
            </select>
          </div>
          <div className="form-row">
            <label>Level</label>
            <select name="level" value={form.level} onChange={handleChange}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div className="form-row">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="">— Select —</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Thumbnail URL</label>
            <input name="thumbnail_url" value={form.thumbnail_url} onChange={handleChange} placeholder="https://…" />
          </div>
          <div className="form-row">
            <label>Instructor Avatar URL</label>
            <input name="instructor_avatar_url" value={form.instructor_avatar_url} onChange={handleChange} placeholder="https://…" />
          </div>
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea name="description" rows={4} value={form.description} onChange={handleChange} placeholder="Course overview…" />
        </div>
        {msg && <p className={msg.type === 'error' ? 'admin-msg error' : 'admin-msg success'}>{msg.text}</p>}
        <div className="admin-form-actions">
          <button type="submit" className="journey-button" disabled={saving}>
            {saving ? 'Creating…' : 'Create Course'}
          </button>
          <button type="button" className="outline-btn-green" onClick={() => setShowPreview(true)}>
            👁 Preview Course
          </button>
        </div>
      </form>
      {showPreview && <CoursePreviewModal form={form} onClose={() => setShowPreview(false)} />}
    </div>
  )
}

// ── Quiz Builder ────────────────────────────────────────────
function QuizBuilder({ questions, setQuestions, passPercent, setPassPercent }) {
  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()])
  }

  function removeQuestion(qid) {
    setQuestions((prev) => prev.filter((q) => q._id !== qid))
  }

  function updateQuestion(qid, text) {
    setQuestions((prev) => prev.map((q) => q._id === qid ? { ...q, question_text: text } : q))
  }

  function updateOption(qid, oid, text) {
    setQuestions((prev) => prev.map((q) => q._id === qid
      ? { ...q, options: q.options.map((o) => o._id === oid ? { ...o, option_text: text } : o) }
      : q
    ))
  }

  function setCorrect(qid, oid) {
    setQuestions((prev) => prev.map((q) => q._id === qid
      ? { ...q, options: q.options.map((o) => ({ ...o, is_correct: o._id === oid })) }
      : q
    ))
  }

  function addOption(qid) {
    setQuestions((prev) => prev.map((q) => q._id === qid
      ? { ...q, options: [...q.options, { _id: Math.random().toString(36).slice(2), option_text: '', is_correct: false }] }
      : q
    ))
  }

  function removeOption(qid, oid) {
    setQuestions((prev) => prev.map((q) => q._id === qid
      ? { ...q, options: q.options.filter((o) => o._id !== oid) }
      : q
    ))
  }

  return (
    <div className="quiz-builder">
      <div className="qb-pass-row">
        <label>Pass %</label>
        <input
          type="number" min="1" max="100"
          value={passPercent}
          onChange={(e) => setPassPercent(Number(e.target.value))}
        />
      </div>

      {questions.map((q, qi) => (
        <div key={q._id} className="qb-question">
          <div className="qb-question-header">
            <span className="qb-question-num">Question {qi + 1}</span>
            <button type="button" className="qb-remove-btn" onClick={() => removeQuestion(q._id)}>Remove</button>
          </div>
          <div className="form-row">
            <input
              placeholder="Question text"
              value={q.question_text}
              onChange={(e) => updateQuestion(q._id, e.target.value)}
            />
          </div>
          <div className="qb-options">
            {q.options.map((opt, oi) => (
              <div key={opt._id} className="qb-option-row">
                <input
                  type="radio"
                  name={`correct-${q._id}`}
                  checked={opt.is_correct}
                  onChange={() => setCorrect(q._id, opt._id)}
                  title="Mark as correct answer"
                />
                <input
                  placeholder={`Option ${oi + 1}`}
                  value={opt.option_text}
                  onChange={(e) => updateOption(q._id, opt._id, e.target.value)}
                  className="qb-option-input"
                />
                {q.options.length > 2 && (
                  <button type="button" className="qb-remove-btn small" onClick={() => removeOption(q._id, opt._id)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="outline-btn-green qb-add-opt" onClick={() => addOption(q._id)}>
              + Add Option
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="outline-btn-green" onClick={addQuestion}>
        + Add Question
      </button>
    </div>
  )
}

// ── Add Lesson Form ─────────────────────────────────────────
function AddLessonForm({ course, onDone }) {
  const [form, setForm] = useState(BLANK_LESSON)
  const [hasQuiz, setHasQuiz] = useState(false)
  const [questions, setQuestions] = useState([blankQuestion()])
  const [passPercent, setPassPercent] = useState(70)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function handleChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [e.target.name]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setMsg({ type: 'error', text: 'Lesson title required.' })
    if (!form.youtube_url.trim()) return setMsg({ type: 'error', text: 'YouTube URL required.' })
    if (hasQuiz) {
      for (const q of questions) {
        if (!q.question_text.trim()) return setMsg({ type: 'error', text: 'All question texts are required.' })
        if (q.options.some((o) => !o.option_text.trim())) return setMsg({ type: 'error', text: 'All option texts are required.' })
        if (!q.options.some((o) => o.is_correct)) return setMsg({ type: 'error', text: 'Each question needs a correct answer selected.' })
      }
    }
    setSaving(true); setMsg(null)
    try {
      const lessonRes = await fetch(`/api/courses/${course.id}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, order_index: (course.lessons?.length ?? 0) }),
      })
      const lessonData = await lessonRes.json()
      if (!lessonRes.ok) throw new Error(lessonData.error)

      if (hasQuiz) {
        const quizRes = await fetch(`/api/lessons/${lessonData.id}/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pass_percent: passPercent, questions }),
        })
        const quizData = await quizRes.json()
        if (!quizRes.ok) throw new Error(quizData.error)
      }

      setMsg({ type: 'success', text: `Lesson "${lessonData.title}" added!` })
      setForm(BLANK_LESSON)
      setHasQuiz(false)
      setQuestions([blankQuestion()])
      onDone()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-form add-lesson-form" onSubmit={handleSubmit}>
      <p className="add-lesson-form-title">Add Lesson to: {course.title}</p>
      <div className="admin-form-grid">
        <div className="form-row">
          <label>Lesson Title *</label>
          <input name="title" value={form.title} onChange={handleChange} placeholder="Lesson title" required />
        </div>
        <div className="form-row">
          <label>YouTube URL *</label>
          <input name="youtube_url" value={form.youtube_url} onChange={handleChange} placeholder="https://youtube.com/watch?v=…" required />
        </div>
      </div>
      <div className="form-row form-row-inline">
        <label>
          <input type="checkbox" name="is_free" checked={form.is_free} onChange={handleChange} />
          {' '}Free lesson (publicly viewable)
        </label>
      </div>
      <div className="form-row form-row-inline">
        <label>
          <input type="checkbox" checked={hasQuiz} onChange={(e) => setHasQuiz(e.target.checked)} />
          {' '}Add a quiz to this lesson
        </label>
      </div>

      {hasQuiz && (
        <div className="quiz-builder-wrap">
          <p className="quiz-builder-title">Quiz Builder</p>
          <QuizBuilder
            questions={questions}
            setQuestions={setQuestions}
            passPercent={passPercent}
            setPassPercent={setPassPercent}
          />
        </div>
      )}

      {msg && <p className={msg.type === 'error' ? 'admin-msg error' : 'admin-msg success'}>{msg.text}</p>}
      <button type="submit" className="journey-button" disabled={saving}>
        {saving ? 'Saving…' : 'Add Lesson'}
      </button>
    </form>
  )
}

// ── Manage Courses Section ──────────────────────────────────
export function ManageCoursesSection({ courses, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null)

  const badgeClass = (status) => {
    if (status === 'Online') return 'online'
    if (status === 'Completed') return 'completed'
    return 'coming'
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div className="admin-section-icon">☰</div>
        <div>
          <h2>Manage Courses</h2>
          <p>Add lessons and quizzes to your existing courses</p>
        </div>
      </div>
      {courses.length === 0 && <p className="courses-status">No courses yet. Create one first.</p>}
      <div className="admin-course-list">
        {courses.map((course) => (
          <div key={course.id} className="admin-course-card">
            <div className="admin-course-card-header">
              <div className="admin-course-card-info">
                {course.thumbnail_url
                  ? <img className="admin-course-thumb" src={course.thumbnail_url} alt="" />
                  : <div className="admin-course-thumb-placeholder" />}
                <div className="admin-course-card-text">
                  <strong>{course.title}</strong>
                  <div className="admin-course-meta">
                    <span className={`admin-course-badge ${badgeClass(course.status)}`}>{course.status}</span>
                    <span className="admin-course-lessons-count">{course.lessons?.length ?? 0} lessons</span>
                    {course.category && <span className="admin-course-lessons-count">· {course.category}</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="outline-btn-green"
                onClick={() => setExpandedId(expandedId === course.id ? null : course.id)}
              >
                {expandedId === course.id ? '✕ Cancel' : '+ Add Lesson'}
              </button>
            </div>
            {expandedId === course.id && (
              <AddLessonForm
                course={course}
                onDone={() => { setExpandedId(null); onRefresh() }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Manage Enrollments Section ──────────────────────────────
export function ManageEnrollmentsSection({ courses }) {
  const [enrollments, setEnrollments] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [email, setEmail] = useState('')
  const [courseId, setCourseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function fetchEnrollments() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/enrollments', { credentials: 'include' })
      if (res.ok) setEnrollments(await res.json())
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { fetchEnrollments() }, [])

  async function handleGrant(e) {
    e.preventDefault()
    if (!email.trim() || !courseId) return setMsg({ type: 'error', text: 'Email and course are required.' })
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_email: email.trim(), course_id: Number(courseId) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'success', text: `Enrolled ${data.user.name} in "${data.course.title}".` })
      setEmail('')
      setCourseId('')
      fetchEnrollments()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(enrollmentId, label) {
    if (!window.confirm(`Revoke enrollment for ${label}?`)) return
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to revoke')
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div className="admin-section-icon">🎓</div>
        <div>
          <h2>Manage Enrollments</h2>
          <p>Grant or revoke student access to courses</p>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleGrant}>
        <p className="add-lesson-form-title">Grant Course Access</p>
        <div className="admin-form-grid">
          <div className="form-row">
            <label>Student Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              required
            />
          </div>
          <div className="form-row">
            <label>Course *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
              <option value="">— Select Course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
        {msg && <p className={msg.type === 'error' ? 'admin-msg error' : 'admin-msg success'}>{msg.text}</p>}
        <button type="submit" className="journey-button" disabled={saving}>
          {saving ? 'Granting…' : 'Grant Enrollment'}
        </button>
      </form>

      <div className="admin-section-spaced">
        <p className="add-lesson-form-title">Current Enrollments</p>
        {loadingList ? (
          <p className="courses-status">Loading enrollments…</p>
        ) : enrollments.length === 0 ? (
          <p className="courses-status">No enrollments yet.</p>
        ) : (
          <div className="admin-enrollment-table-wrap">
            <table className="admin-enrollment-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Granted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enr) => (
                  <tr key={enr.id}>
                    <td>{enr.user_name}</td>
                    <td>{enr.user_email}</td>
                    <td>{enr.course_title}</td>
                    <td>{new Date(enr.granted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <button
                        type="button"
                        className="qb-remove-btn"
                        onClick={() => handleRevoke(enr.id, `${enr.user_name} from "${enr.course_title}"`)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin Page ──────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('create')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/')
    }
  }, [user, loading, navigate])

  async function fetchCourses() {
    const res = await fetch('/api/courses')
    if (res.ok) {
      const data = await res.json()
      // also fetch lessons for each course
      const withLessons = await Promise.all(data.map(async (c) => {
        const r = await fetch(`/api/courses/${c.slug}`)
        return r.ok ? r.json() : c
      }))
      setCourses(withLessons)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') fetchCourses()
  }, [user])

  if (loading || !user || user.role !== 'admin') return null

  return (
    <div className="page-shell admin-shell">
      <PageHeader />
      <main>
        <div className="admin-hero">
          <div className="admin-hero-inner">
            <div className="admin-hero-icon">⚙</div>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Manage courses, lessons, and quizzes</p>
            </div>
          </div>
        </div>

        <div className="admin-layout">
          <nav className="admin-sidebar">
            <span className="admin-sidebar-label">Navigation</span>
            <Link className="admin-nav-btn" to="/elementor-dashboard">
              <span className="admin-nav-icon">🎨</span>
              Elementor Dashboard
            </Link>
            <button
              type="button"
              className={`admin-nav-btn${tab === 'create' ? ' active' : ''}`}
              onClick={() => setTab('create')}
            >
              <span className="admin-nav-icon">＋</span>
              Create Course
            </button>
            <button
              type="button"
              className={`admin-nav-btn${tab === 'manage' ? ' active' : ''}`}
              onClick={() => { setTab('manage'); fetchCourses() }}
            >
              <span className="admin-nav-icon">☰</span>
              Manage Courses
            </button>
            <button
              type="button"
              className={`admin-nav-btn${tab === 'enrollments' ? ' active' : ''}`}
              onClick={() => { setTab('enrollments'); fetchCourses() }}
            >
              <span className="admin-nav-icon">🎓</span>
              Enrollments
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'instructors' ? ' active' : ''}`} onClick={() => setTab('instructors')}>
              <span className="admin-nav-icon">👤</span>
              Instructors
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'services' ? ' active' : ''}`} onClick={() => setTab('services')}>
              <span className="admin-nav-icon">🧩</span>
              Services
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'articles' ? ' active' : ''}`} onClick={() => setTab('articles')}>
              <span className="admin-nav-icon">📝</span>
              Articles
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'siteContent' ? ' active' : ''}`} onClick={() => setTab('siteContent')}>
              <span className="admin-nav-icon">🖋</span>
              Site Content
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'pages' ? ' active' : ''}`} onClick={() => setTab('pages')}>
              <span className="admin-nav-icon">📄</span>
              Pages
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'commerce' ? ' active' : ''}`} onClick={() => setTab('commerce')}>
              <span className="admin-nav-icon">🧾</span>
              Commerce
            </button>
            <button type="button" className={`admin-nav-btn${tab === 'contact' ? ' active' : ''}`} onClick={() => setTab('contact')}>
              <span className="admin-nav-icon">✉️</span>
              Messages
            </button>
          </nav>

          <div className="admin-content">
            {tab === 'create' && (
              <CreateCourseSection onCreated={() => { fetchCourses(); setTab('manage') }} />
            )}
            {tab === 'manage' && (
              <ManageCoursesSection courses={courses} onRefresh={fetchCourses} />
            )}
            {tab === 'enrollments' && (
              <ManageEnrollmentsSection courses={courses} />
            )}
            {tab === 'instructors' && <InstructorsAdmin />}
            {tab === 'services' && <ServicesAdmin />}
            {tab === 'articles' && <ArticlesAdmin />}
            {tab === 'siteContent' && <SiteContentAdmin />}
            {tab === 'pages' && <PagesAdmin />}
            {tab === 'commerce' && <CommerceAdmin />}
            {tab === 'contact' && <ContactInbox />}
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
