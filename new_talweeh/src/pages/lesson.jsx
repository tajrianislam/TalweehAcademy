import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import AdminInlineQuizBuilder from '../components/AdminInlineQuizBuilder'
import { useAuth } from '../context/AuthContext'
import YouTubePlayer from '../components/YouTubePlayer'
import usePlaybackTracker from '../hooks/usePlaybackTracker'
import { extractVideoId } from '../utils/youtube'

const RESUME_THRESHOLD_SECONDS = 10

function AdminQuizPanel({ lessonId, lesson, onQuizUpdated }) {
  const [open, setOpen] = useState(false)
  const quiz = lesson?.quiz ?? null

  function handleSaved() {
    setOpen(false)
    onQuizUpdated?.()
  }

  return (
    <div className="admin-quiz-panel">
      <div className="admin-quiz-panel-bar">
        <div className="admin-quiz-panel-bar-left">
          <span className="admin-quiz-panel-badge">Admin</span>
          <span className="admin-quiz-panel-label">
            {quiz ? `Quiz · ${quiz.questions?.length ?? 0} questions` : 'No quiz attached to this lesson'}
          </span>
        </div>
        <button
          type="button"
          className={open ? 'outline-btn-green' : 'journey-button'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cancel' : quiz ? 'Edit Quiz' : 'Add Quiz'}
        </button>
      </div>

      {open && (
        <AdminInlineQuizBuilder
          lessonId={lessonId}
          existingQuiz={quiz}
          onSaved={handleSaved}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  )
}
const LESSON_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes', label: 'Notes' },
  { id: 'comments', label: 'Comments' },
]

function formatSeconds(totalSeconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function normalizeProgress(progress) {
  if (!progress) return null

  return {
    lessonId: progress.lessonId,
    seconds: progress.currentTime || progress.seconds || 0,
    duration: progress.duration || 0,
    percent: progress.watchPercentage || progress.percent || 0,
    completed: Boolean(progress.completed),
    updatedAt: progress.updatedAt,
  }
}

export default function LessonPage() {
  const { slug, lessonId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [progress, setProgress] = useState(null)
  const [courseProgress, setCourseProgress] = useState({})
  const [progressLoading, setProgressLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(false)
  const [accessDenied, setAccessDenied] = useState(null)
  const [resumeStartSeconds, setResumeStartSeconds] = useState(0)
  const [player, setPlayer] = useState(null)
  const [resumedAutomatically, setResumedAutomatically] = useState(false)
  const [activeLessonTab, setActiveLessonTab] = useState('overview')
  const [noteDraft, setNoteDraft] = useState('')
  const [savedNoteAt, setSavedNoteAt] = useState(null)
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [lessonTabsLoading, setLessonTabsLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setAccessDenied(null)
    setPlayer(null)
    setProgress(null)
    setCompleted(false)
    setResumeStartSeconds(0)
    setResumedAutomatically(false)
    const lessonFetch = fetch(`/api/lessons/${lessonId}`)
      .then(async (r) => {
        if (r.status === 401) { setAccessDenied('auth'); return null }
        if (r.status === 403) { setAccessDenied('enrollment'); return null }
        if (!r.ok) throw new Error('Lesson not found')
        return r.json()
      })
    Promise.all([
      lessonFetch,
      fetch(`/api/courses/${slug}`).then((r) => r.ok ? r.json() : Promise.reject('Course not found')),
    ])
      .then(([l, c]) => { setLesson(l); setCourse(c) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug, lessonId])

  useEffect(() => {
    setActiveLessonTab('overview')
    setCommentDraft('')

    if (!user) {
      setNoteDraft('')
      setSavedNoteAt(null)
      setComments([])
      return
    }

    let cancelled = false
    setLessonTabsLoading(true)

    Promise.all([
      fetch(`/api/lessons/${lessonId}/note`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : Promise.reject('Note not found')),
      fetch(`/api/lessons/${lessonId}/comments`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : Promise.reject('Comments not found')),
    ])
      .then(([note, lessonComments]) => {
        if (cancelled) return
        setNoteDraft(note.body || '')
        setSavedNoteAt(note.updatedAt || null)
        setComments(lessonComments)
      })
      .catch(() => {
        if (!cancelled) {
          setNoteDraft('')
          setSavedNoteAt(null)
          setComments([])
        }
      })
      .finally(() => {
        if (!cancelled) setLessonTabsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [lessonId, user])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setProgress(null)
      setCourseProgress({})
      setCompleted(false)
      setResumeStartSeconds(0)
      setProgressLoading(false)
      setEnrolled(false)
      return
    }

    let cancelled = false
    setProgressLoading(true)

    const enrollmentFetch = user.role === 'admin'
      ? Promise.resolve({ enrolled: true })
      : fetch(`/api/courses/${slug}/enrollment`, { credentials: 'include' })
          .then((r) => r.ok ? r.json() : { enrolled: false })
          .catch(() => ({ enrolled: false }))

    Promise.all([
      fetch(`/api/lessons/${lessonId}/progress`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : Promise.reject('Progress not found')),
      fetch(`/api/courses/${slug}/progress`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : []),
      enrollmentFetch,
    ])
      .then(([lessonProgress, courseProgressRows, enrollmentData]) => {
        if (cancelled) return

        const normalizedLessonProgress = normalizeProgress(lessonProgress)
        const normalizedCourseProgress = {}

        courseProgressRows.forEach((row) => {
          const normalized = normalizeProgress(row)
          normalizedCourseProgress[String(normalized.lessonId)] = normalized
        })

        setProgress(normalizedLessonProgress)
        setCourseProgress(normalizedCourseProgress)
        setCompleted(Boolean(normalizedLessonProgress?.completed))
        setEnrolled(Boolean(enrollmentData.enrolled))
        setResumeStartSeconds(
          normalizedLessonProgress?.seconds > RESUME_THRESHOLD_SECONDS && !normalizedLessonProgress.completed
            ? normalizedLessonProgress.seconds
            : 0
        )
      })
      .catch(() => {
        if (!cancelled) {
          setProgress(null)
          setCourseProgress({})
          setEnrolled(false)
        }
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user, lessonId, slug])

  function applyProgress(nextProgress) {
    if (!nextProgress) return
    setProgress(nextProgress)
    setCourseProgress((prev) => ({
      ...prev,
      [String(nextProgress.lessonId)]: nextProgress,
    }))
    setCompleted(Boolean(nextProgress.completed))
  }

  const {
    saveProgress,
    startTracking,
    stopTracking,
  } = usePlaybackTracker({
    player,
    lessonId,
    enabled: Boolean(user),
    onProgress: applyProgress,
    onComplete: applyProgress,
  })

  async function saveManualProgress(nextProgress) {
    const response = await fetch(`/api/lessons/${lessonId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(nextProgress),
    })

    if (!response.ok) return null

    const saved = normalizeProgress(await response.json())
    applyProgress(saved)
    return saved
  }

  async function markComplete() {
    if (!user) {
      openAuthModal('login')
      return
    }

    const saved = await saveProgress(true)
    if (!saved) {
      await saveManualProgress({
        currentTime: progress?.duration || progress?.seconds || 0,
        duration: progress?.duration || 0,
        watchPercentage: 100,
        completed: true,
      })
    }
  }

  async function startLessonOver() {
    if (player?.seekTo) player.seekTo(0, true)
    setResumeStartSeconds(0)
    setResumedAutomatically(false)

    await saveManualProgress({
      currentTime: 0,
      duration: progress?.duration || 0,
      watchPercentage: 0,
      completed: false,
    })
  }

  function handlePlayerReady(event) {
    const nextPlayer = event.target
    setPlayer(nextPlayer)

    if (resumeStartSeconds > RESUME_THRESHOLD_SECONDS) {
      nextPlayer.seekTo(resumeStartSeconds, true)
      setResumedAutomatically(true)
    }
  }

  function handlePlayerPause() {
    saveProgress()
    stopTracking()
  }

  function handlePlayerEnd() {
    saveProgress(true)
    stopTracking()
  }

  async function saveNote() {
    if (!user) {
      openAuthModal('login')
      return
    }

    const response = await fetch(`/api/lessons/${lessonId}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body: noteDraft }),
    })
    if (!response.ok) return

    const savedNote = await response.json()
    setNoteDraft(savedNote.body || '')
    setSavedNoteAt(savedNote.updatedAt || null)
  }

  async function addComment(event) {
    event.preventDefault()
    if (!user) {
      openAuthModal('login')
      return
    }

    const trimmed = commentDraft.trim()
    if (!trimmed) return

    const response = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body: trimmed }),
    })
    if (!response.ok) return

    const savedComment = await response.json()
    setComments((prev) => [savedComment, ...prev])
    setCommentDraft('')
  }

  if (loading) return (
    <div className="page-shell">
      <PageHeader />
      <main><p className="courses-status">Loading lesson…</p></main>
      <PageFooter />
    </div>
  )

  if (!loading && (accessDenied === 'auth' || accessDenied === 'enrollment') && course) {
    return (
      <div className="page-shell">
        <PageHeader />
        <main>
          <div className="lesson-access-gate">
            <div className="lesson-access-gate-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2>{course.title}</h2>
            {accessDenied === 'auth' ? (
              <>
                <p>Log in to access this lesson.</p>
                <button type="button" className="journey-button" onClick={() => openAuthModal('login')}>
                  Log In to Continue
                </button>
              </>
            ) : (
              <>
                <p>This course requires enrollment to access its lessons.</p>
                {Number(course.price) > 0 && (
                  <div className="lesson-access-gate-price">
                    <strong>${Number(course.price).toFixed(2)}</strong>
                    {course.cadence && <span> {course.cadence}</span>}
                  </div>
                )}
                <Link to={`/courses/${slug}`} className="journey-button">View Course</Link>
              </>
            )}
          </div>
        </main>
        <PageFooter />
      </div>
    )
  }

  if (error || !lesson || !course) return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <p className="courses-status courses-error">{error || 'Not found'}</p>
        <p style={{ textAlign: 'center' }}><Link to={`/courses/${slug}`}>← Back to Course</Link></p>
      </main>
      <PageFooter />
    </div>
  )

  const lessons = course.lessons || []
  const currentIndex = lessons.findIndex((l) => String(l.id) === String(lessonId))
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
  const videoId = extractVideoId(lesson.youtube_url)
  const hasSavedProgress = progress?.seconds > RESUME_THRESHOLD_SECONDS && !progress.completed
  const remainingSeconds = progress?.duration ? Math.max(progress.duration - (progress.seconds || 0), 0) : 0
  const completedLessons = lessons.filter((l) => courseProgress[String(l.id)]?.completed).length
  const coursePercent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0
  const lessonPercent = completed ? 100 : progress?.percent || 0
  const overviewText = lesson.description || course.description || 'No overview has been added for this lesson yet.'

  return (
    <div className="page-shell">
      <PageHeader />
      <main className="lesson-main">
        <div className="lesson-layout">
          {/* ── Sidebar ──────────────────────────── */}
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
                const isActive = String(l.id) === String(lessonId)
                const lessonProgress = courseProgress[String(l.id)]
                const isDone = Boolean(lessonProgress?.completed)
                return (
                  <li key={l.id} className={`lesson-sidebar-item${isActive ? ' active' : ''}${isDone ? ' completed' : ''}`}>
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
                                <circle cx="12" cy="12" r="12" fill="#3a5a40"/>
                                <polyline points="6 12 10 16 18 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )
                          : l.is_free
                            ? <span className="curriculum-free">Free</span>
                            : !enrolled
                              ? (
                                <span className="lesson-sidebar-lock" title="Enrollment required">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                  </svg>
                                </span>
                              )
                              : null
                        }
                      </span>
                    </Link>
                    {l.has_quiz && (
                      <Link
                        to={`/courses/${slug}/lesson/${l.id}/quiz`}
                        className="lesson-sidebar-quiz-item"
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

          {/* ── Main Content ─────────────────────── */}
          <div className="lesson-content">
            <h1 className="lesson-title">{lesson.title}</h1>

            <div className="lesson-completion-panel">
              <div>
                <span className="lesson-completion-kicker">Lesson Progress</span>
                <strong>{lessonPercent}% Complete</strong>
                <p>
                  {completed
                    ? 'This lesson is marked complete.'
                    : progress?.seconds > 0
                      ? `You have watched ${formatSeconds(progress.seconds)}${progress.duration ? ` of ${formatSeconds(progress.duration)}` : ''}.`
                      : 'Start watching to begin tracking your progress.'}
                </p>
              </div>
              <div className="lesson-completion-meter" aria-hidden="true">
                <span style={{ width: `${lessonPercent}%` }} />
              </div>
            </div>

            {videoId && (
              <>
                {user && hasSavedProgress && (
                  <div className="lesson-progress-card">
                    <div>
                      <strong>Resume from {formatSeconds(progress.seconds)}</strong>
                      <span>
                        {progress.percent || 0}% watched
                        {remainingSeconds > 0 ? ` · ${formatSeconds(remainingSeconds)} left` : ''}
                      </span>
                    </div>
                    <button type="button" className="outline-btn-green" onClick={startLessonOver}>
                      Start over
                    </button>
                  </div>
                )}

                {(() => {
                  const needsEnrollment = !lesson.is_free && (!user || !enrolled)
                  const isLocked = authLoading || needsEnrollment
                  return (
                    <div className={`lesson-video-wrapper${isLocked ? ' lesson-video-locked' : ''}`}>
                      {authLoading ? (
                        <div className="lesson-video-message">
                          <p>Checking your account…</p>
                        </div>
                      ) : !lesson.is_free && !user ? (
                        <div className="lesson-video-message">
                          <p className="lesson-video-lock-title">Log in to watch this lesson</p>
                          <span>Your progress will be saved so you can continue later.</span>
                          <button type="button" className="journey-button" onClick={() => openAuthModal('login')}>
                            Log in to Continue
                          </button>
                        </div>
                      ) : !lesson.is_free && user && progressLoading ? (
                        <div className="lesson-video-message">
                          <p>Loading your saved progress…</p>
                        </div>
                      ) : !lesson.is_free && user && !enrolled ? (
                        <div className="lesson-video-message">
                          <p className="lesson-video-lock-title">Course enrollment required</p>
                          <span>Purchase this course to access all lessons.</span>
                          {Number(course.price) > 0 && (
                            <div className="lesson-lock-price">
                              <strong>${Number(course.price).toFixed(2)}</strong>
                              {course.cadence && <span> {course.cadence}</span>}
                            </div>
                          )}
                          <Link to={`/courses/${slug}`} className="journey-button">View Course</Link>
                        </div>
                      ) : user && progressLoading ? (
                        <div className="lesson-video-message">
                          <p>Loading your saved progress…</p>
                        </div>
                      ) : (
                        <YouTubePlayer
                          key={`${videoId}-${resumeStartSeconds}`}
                          videoId={videoId}
                          title={lesson.title}
                          badge={activeLessonTab === 'overview' ? 'Overview' : lesson.title}
                          instructor={course.instructor_name}
                          startSeconds={resumeStartSeconds}
                          onReady={handlePlayerReady}
                          onPlay={startTracking}
                          onPause={handlePlayerPause}
                          onEnd={handlePlayerEnd}
                        />
                      )}
                    </div>
                  )
                })()}

                {user && progress && (
                  <p className="lesson-progress-note">
                    Watched {formatSeconds(progress.seconds)}
                    {progress.duration ? ` of ${formatSeconds(progress.duration)} (${progress.percent || 0}%)` : ''}
                    {resumedAutomatically ? ' · resumed automatically' : ''}
                  </p>
                )}
              </>
            )}

            <section className="lesson-tabs-card" aria-label="Lesson details">
              <div className="lesson-tabs" role="tablist" aria-label="Lesson sections">
                {LESSON_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={activeLessonTab === tab.id ? 'active' : ''}
                    role="tab"
                    aria-selected={activeLessonTab === tab.id}
                    onClick={() => setActiveLessonTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="lesson-tab-panel">
                {activeLessonTab === 'overview' && (
                  <div className="lesson-overview-panel">
                    <h2>Lesson Overview</h2>
                    <p>{overviewText}</p>
                  </div>
                )}

                {activeLessonTab === 'notes' && (
                  <div className="lesson-notes-panel">
                    {user && lessonTabsLoading ? (
                      <p className="lesson-tab-muted">Loading your notes…</p>
                    ) : user ? (
                      <>
                        <div className="lesson-tab-heading">
                          <h2>My Notes</h2>
                          {savedNoteAt && <span>Saved {new Date(savedNoteAt).toLocaleString()}</span>}
                        </div>
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder="Write private notes for this lesson..."
                          rows={7}
                        />
                        <button type="button" className="journey-button" onClick={saveNote}>
                          Save Notes
                        </button>
                      </>
                    ) : (
                      <div className="lesson-tab-empty">
                        <p>Log in to save private notes for this lesson.</p>
                        <button type="button" className="journey-button" onClick={() => openAuthModal('login')}>
                          Log in to Take Notes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeLessonTab === 'comments' && (
                  <div className="lesson-comments-panel">
                    {user && lessonTabsLoading ? (
                      <p className="lesson-tab-muted">Loading comments…</p>
                    ) : user ? (
                      <>
                        <form className="lesson-comment-form" onSubmit={addComment}>
                          <label htmlFor="lesson-comment">Join the discussion</label>
                          <textarea
                            id="lesson-comment"
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="Ask a question or share a reflection..."
                            rows={4}
                          />
                          <button type="submit" className="journey-button">Post Comment</button>
                        </form>

                        <div className="lesson-comments-list">
                          {comments.length > 0 ? comments.map((comment) => (
                            <article key={comment.id} className="lesson-comment">
                              <div>
                                <strong>{comment.author}</strong>
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <p>{comment.body}</p>
                            </article>
                          )) : (
                            <p className="lesson-tab-muted">No comments yet. Start the conversation.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="lesson-tab-empty">
                        <p>Log in to view and post comments for this lesson.</p>
                        <button type="button" className="journey-button" onClick={() => openAuthModal('login')}>
                          Log in to Comment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <div className="lesson-actions">
              <button
                type="button"
                className={completed ? 'green-button' : 'outline-btn-green'}
                onClick={markComplete}
                disabled={completed}
              >
                {completed ? '✓ Completed' : 'Mark as Complete'}
              </button>
            </div>

            {/* Prev / Next navigation */}
            <div className="lesson-nav">
              {prevLesson ? (
                <button
                  type="button"
                  className="outline-btn-green"
                  onClick={() => navigate(`/courses/${slug}/lesson/${prevLesson.id}`)}
                >
                  ← Previous
                </button>
              ) : <span />}
              {nextLesson ? (
                <button
                  type="button"
                  className="journey-button"
                  onClick={() => navigate(`/courses/${slug}/lesson/${nextLesson.id}`)}
                >
                  Next →
                </button>
              ) : (
                <Link className="journey-button" to={`/courses/${slug}`}>
                  Back to Course
                </Link>
              )}
            </div>

            {/* Quiz link prompt — visible to non-admin users when a quiz exists */}
            {lesson.quiz && user?.role !== 'admin' && (
              <div className="lesson-quiz-cta">
                <div className="lesson-quiz-cta-left">
                  <span className="lesson-quiz-cta-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                      <line x1="9" y1="12" x2="15" y2="12"/>
                      <line x1="9" y1="16" x2="13" y2="16"/>
                    </svg>
                  </span>
                  <div>
                    <strong>Quiz available</strong>
                    <span>{lesson.quiz.questions?.length ?? 0} questions · Pass mark {lesson.quiz.pass_percent ?? 70}%</span>
                  </div>
                </div>
                <Link to={`/courses/${slug}/lesson/${lessonId}/quiz`} className="journey-button">
                  Take Quiz →
                </Link>
              </div>
            )}

            {/* Admin: Quiz Management */}
            {user?.role === 'admin' && (
              <AdminQuizPanel
                lessonId={lessonId}
                lesson={lesson}
                onQuizUpdated={() => {
                  setLesson(null)
                  setLoading(true)
                  Promise.all([
                    fetch(`/api/lessons/${lessonId}`).then((r) => r.ok ? r.json() : Promise.reject('Lesson not found')),
                    fetch(`/api/courses/${slug}`).then((r) => r.ok ? r.json() : Promise.reject('Course not found')),
                  ])
                    .then(([l, c]) => { setLesson(l); setCourse(c) })
                    .catch((e) => setError(String(e)))
                    .finally(() => setLoading(false))
                }}
              />
            )}
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
