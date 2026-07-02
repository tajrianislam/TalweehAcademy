import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'

export default function InstructorDetailPage() {
  const { slug } = useParams()
  const [instructor, setInstructor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/instructors/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Instructor not found')))
      .then(setInstructor)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        {loading && <p className="courses-status">Loading instructor…</p>}

        {error && (
          <section className="article-detail-shell">
            <p className="courses-status courses-error">{error}</p>
            <p><Link to="/instructors">Back to Instructors</Link></p>
          </section>
        )}

        {instructor && (
          <article className="article-detail-shell">
            <nav className="article-breadcrumb">
              <Link to="/">Home</Link>
              <span>|</span>
              <Link to="/instructors">Instructors</Link>
              <span>|</span>
              <span>{instructor.name}</span>
            </nav>

            <header className="instructor-detail-header">
              {instructor.photoUrl && (
                <img className="instructor-detail-photo" src={instructor.photoUrl} alt={instructor.name} />
              )}
              <div>
                <h1>{instructor.name}</h1>
                {instructor.designation && <p className="instructor-designation">{instructor.designation}</p>}
              </div>
            </header>

            <div className="article-detail-content">
              {(instructor.bio || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {!instructor.bio && <p>No biography available.</p>}
            </div>

            {instructor.courses && instructor.courses.length > 0 && (
              <section className="instructor-detail-courses">
                <h2>Courses by {instructor.name}</h2>
                <div className="course-grid">
                  {instructor.courses.map((course) => (
                    <article className="course-card" key={course.id}>
                      <div className="course-art">
                        {course.thumbnail_url
                          ? <img src={course.thumbnail_url} alt={course.title} />
                          : <div className="course-art-placeholder" />}
                      </div>
                      <div className="course-body">
                        <h2>{course.title}</h2>
                        <div className="price-line">
                          <strong>${Number(course.price).toFixed(2)}</strong>
                          {course.cadence && <span>{course.cadence}</span>}
                          <em>[USD]</em>
                        </div>
                        <div className="course-footer">
                          <Link to={`/courses/${course.slug}`}>View Course</Link>
                          <span>{course.status}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>
      <PageFooter />
    </div>
  )
}
