import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import Quiz from '../components/Quiz'
import { useAuth } from '../context/AuthContext'

function formatSeconds(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function normalizeProgress(p) {
  if (!p) return null
  return {
    lessonId: p.lessonId,
    seconds: p.currentTime || p.seconds || 0,
    duration: p.duration || 0,
    percent: p.watchPercentage || p.percent || 0,
    completed: Boolean(p.completed),
  }
}

export default function LessonQuizPage() {
  const { slug, lessonId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [lesson, setLesson]   = useState(null)
  const [course, setCourse]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [courseProgress, setCourseProgress] = useState({})

  // Fetch lesson + course
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/lessons/${lessonId}`).then((r) => r.ok ? r.json() : Promise.reject('Lesson not found')),
      fetch(`/api/courses/${slug}`).then((r) => r.ok ? r.json() : Promise.reject('Course not found')),
    ])
      .then(([l, c]) => { setLesson(l); setCourse(c) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug, lessonId])

  // Fetch course-wide progress for sidebar completion indicators
  const fetchProgress = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/courses/${slug}/progress`, { credentials: 'include' })
      if (!res.ok) return
      const rows = await res.json()
      const map = {}
      rows.forEach((row) => {
        const n = normalizeProgress(row)
        map[String(n.lessonId)] = n
      })
      setCourseProgress(map)
    } catch { /* non-critical */ }
  }, [user, slug])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  // Loading / error states
  if (loading) return (
    <div className="page-shell">
      <PageHeader />
      <main><p className="courses-status">Loading quiz…</p></main>
      <PageFooter />
    </div>
  )

  if (error || !lesson || !course) return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <p className="courses-status courses-error">{error || 'Not found'}</p>
        <p className="status-back-link"><Link to={`/courses/${slug}`}>← Back to Course</Link></p>
      </main>
      <PageFooter />
    </div>
  )

  if (!lesson.quiz) {
    // No quiz — redirect back to the lesson
    navigate(`/courses/${slug}/lesson/${lessonId}`, { replace: true })
    return null
  }

  const lessons = course.lessons || []
  const completedLessons = lessons.filter((l) => courseProgress[String(l.id)]?.completed).length
  const coursePercent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0

  return (
    <div className="page-shell">
      <PageHeader />
      <main className="lesson-main">
        <div className="lesson-layout">

          {/* ── Sidebar ── */}
          <aside className="lesson-sidebar">
            <div className="lesson-sidebar-header">
              <Link to={`/courses/${slug}`} className="lesson-course-back">← {course.title}</Link>
            </div>
            <p className="lesson-sidebar-label">Course Curriculum</p>
            <div className="lesson-course-progress">
              <div className="lesson-course-progress-top">
                <strong>{completedLessons}/{lessons.length}</strong>
                <span>{coursePercent}% Complete</span>
              </div>
              <div className="lesson-course-progress-track" aria-hidden="true">
                <span style={{ width: `${coursePercent}%` }} />
              </div>
            </div>
            <ol className="lesson-sidebar-list">
              {lessons.map((l, i) => {
                const isCurrentLesson = String(l.id) === String(lessonId)
                const lessonProgress  = courseProgress[String(l.id)]
                const isDone          = Boolean(lessonProgress?.completed)
                return (
                  <li key={l.id} className={`lesson-sidebar-item${isCurrentLesson ? ' active' : ''}${isDone ? ' completed' : ''}`}>
                    <Link to={`/courses/${slug}/lesson/${l.id}`}>
                      <span className="lesson-sidebar-num">{i + 1}.</span>
                      <span className="lesson-sidebar-copy">
                        <span className="lesson-sidebar-title">{l.title}</span>
                        <span className="lesson-sidebar-meta">
                          {lessonProgress?.duration ? formatSeconds(lessonProgress.duration) : 'Video lesson'}
                          {lessonProgress?.percent > 0 && !isDone ? ` · ${lessonProgress.percent}%` : ''}
                        </span>
                      </span>
                      <span className="lesson-sidebar-status">
                        {isDone
                          ? (
                            <span className="lesson-done-mark" title="Completed">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="12" fill="currentColor"/>
                                <polyline points="6 12 10 16 18 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )
                          : l.is_free ? <span className="curriculum-free">Free</span> : null
                        }
                      </span>
                    </Link>
                    {l.has_quiz && (
                      <Link
                        to={`/courses/${slug}/lesson/${l.id}/quiz`}
                        className={`lesson-sidebar-quiz-item${isCurrentLesson ? ' active' : ''}`}
                      >
                        <span className="lesson-sidebar-quiz-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                            <rect x="9" y="3" width="6" height="4" rx="1"/>
                            <line x1="9" y1="12" x2="15" y2="12"/>
                            <line x1="9" y1="16" x2="13" y2="16"/>
                          </svg>
                        </span>
                        <span className="lesson-sidebar-quiz-label">{l.title} Quiz</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </aside>

          {/* ── Main content ── */}
          <div className="lesson-content">
            {/* Breadcrumb back to lesson */}
            <div className="lqp-breadcrumb">
              <Link to={`/courses/${slug}/lesson/${lessonId}`} className="lqp-back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back to lesson
              </Link>
            </div>

            <h1 className="lesson-title">{lesson.title} — Quiz</h1>

            <div className="lqp-meta-bar">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle', marginRight:5}}>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <line x1="9" y1="12" x2="15" y2="12"/>
                  <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                {lesson.quiz.questions?.length ?? 0} Questions
              </span>
              <span>Pass mark: {lesson.quiz.pass_percent ?? 70}%</span>
            </div>

            <Quiz quiz={lesson.quiz} lessonId={lessonId} />
          </div>

        </div>
      </main>
      <PageFooter />
    </div>
  )
}
