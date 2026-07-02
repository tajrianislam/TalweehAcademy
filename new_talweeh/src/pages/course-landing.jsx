import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useAuth } from '../context/AuthContext'
import { ASSET } from '../constants/assets'

export default function CourseLandingPage() {
  const { slug } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    fetch(`/api/courses/${slug}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Course not found'))
      .then(setCourse)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setEnrolled(false); return }
    if (user.role === 'admin') { setEnrolled(true); return }
    fetch(`/api/courses/${slug}/enrollment`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { enrolled: false })
      .then((data) => setEnrolled(Boolean(data.enrolled)))
      .catch(() => setEnrolled(false))
  }, [authLoading, user, slug])

  if (loading) return (
    <div className="page-shell">
      <PageHeader />
      <main><p className="courses-status">Loading…</p></main>
      <PageFooter />
    </div>
  )

  if (error || !course) return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <p className="courses-status courses-error">{error || 'Course not found'}</p>
        <p style={{ textAlign: 'center' }}><Link to="/courses">← Back to Courses</Link></p>
      </main>
      <PageFooter />
    </div>
  )

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title={course.title} />

        <div className="course-landing-layout">
          {/* ── Left / Main ────────────────────────── */}
          <div className="course-landing-main">

            {/* Overview */}
            <section className="course-overview-section">
              <h2>Course Overview</h2>
              <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
              {course.description
                ? <p>{course.description}</p>
                : <p className="course-no-desc">No description provided.</p>}
            </section>

            {/* Instructor */}
            {course.instructor_name && (
              <section className="course-instructor-section">
                <h2>A course by</h2>
                <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
                <div className="course-instructor-card">
                  {course.instructor_avatar_url && (
                    <img src={course.instructor_avatar_url} alt={course.instructor_name} />
                  )}
                  <div>
                    <strong>{course.instructor_name}</strong>
                  </div>
                </div>
              </section>
            )}

            {/* Curriculum */}
            <section className="course-curriculum-section">
              <h2>Course Curriculum</h2>
              <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
              {course.lessons && course.lessons.length > 0 ? (
                <ol className="curriculum-list">
                  {course.lessons.map((lesson, i) => {
                    const isLocked = !lesson.is_free && !enrolled
                    return (
                      <li key={lesson.id} className="curriculum-item-group">
                        <Link
                          to={`/courses/${slug}/lesson/${lesson.id}`}
                          className={`curriculum-item${isLocked ? ' curriculum-item-locked' : ''}`}
                        >
                          <span className="curriculum-num">{i + 1}.</span>
                          <span className="curriculum-title">{lesson.title}</span>
                          {lesson.is_free ? (
                            <span className="curriculum-free">Free</span>
                          ) : isLocked ? (
                            <span className="curriculum-lock" title="Enrollment required">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            </span>
                          ) : null}
                        </Link>
                        {lesson.has_quiz && !isLocked ? (
                          <Link
                            to={`/courses/${slug}/lesson/${lesson.id}/quiz`}
                            className="curriculum-quiz-item"
                          >
                            <span className="curriculum-quiz-icon">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                                <rect x="9" y="3" width="6" height="4" rx="1"/>
                                <line x1="9" y1="12" x2="15" y2="12"/>
                                <line x1="9" y1="16" x2="13" y2="16"/>
                              </svg>
                            </span>
                            <span>{lesson.title} Quiz</span>
                          </Link>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="course-no-desc">No lessons added yet.</p>
              )}
            </section>
          </div>

          {/* ── Right / Sidebar ───────────────────── */}
          <aside className="course-landing-sidebar">
            {course.thumbnail_url && (
              <img className="course-sidebar-thumb" src={course.thumbnail_url} alt={course.title} />
            )}

            <div className="course-sidebar-meta">
              <div className="course-price-block">
                <span className="course-price">${Number(course.price).toFixed(2)}</span>
                {course.cadence && <span className="course-cadence">{course.cadence}</span>}
                <em className="course-currency">[USD]</em>
              </div>
              <button className="journey-button course-enroll-btn" type="button">
                Add to Cart
              </button>

              <div className="course-meta-list">
                {course.level && (
                  <div className="course-meta-item">
                    <span>Level</span>
                    <span>{course.level}</span>
                  </div>
                )}
                {course.category && (
                  <div className="course-meta-item">
                    <span>Category</span>
                    <span>{course.category}</span>
                  </div>
                )}
                {course.status && (
                  <div className="course-meta-item">
                    <span>Status</span>
                    <span>{course.status}</span>
                  </div>
                )}
                <div className="course-meta-item">
                  <span>Lessons</span>
                  <span>{course.lessons?.length ?? 0}</span>
                </div>
                <div className="course-meta-item">
                  <span>Last Updated</span>
                  <span>{new Date(course.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
