import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { ASSET } from '../constants/assets'

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/instructors')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to fetch instructors')))
      .then(setInstructors)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Instructors" />

        <section className="instructors-intro">
          <div className="instructors-intro-inner">
            <h2>Get to know your instructors</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              Talweeh Academy stands as a beacon of knowledge, uniquely combining traditional wisdom
              with modern academic excellence. Our esteemed instructors possess a rich tapestry of
              experience, having earned Ijāzāt from respected traditional scholars while also holding
              degrees from prestigious universities worldwide. This dual foundation equips them to
              impart knowledge with depth and nuance.
            </p>
            <p>
              We take particular pride in our educators who have graduated from the blessed city of
              the Messenger, peace be upon him. Their firsthand experience in this sacred environment
              enriches their teachings and offers students a profound connection to both heritage and
              scholarship. At Talweeh Academy, we are dedicated to nurturing a vibrant learning
              community that honors tradition while embracing contemporary understanding, fostering a
              holistic educational experience for all.
            </p>
          </div>
        </section>

        <section className="instructors-grid-section">
          <div className="instructors-grid-inner">
            <h2>Our Instructors</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />

            {loading && <p className="courses-status">Loading instructors…</p>}
            {error && <p className="courses-status courses-error">{error}</p>}
            {!loading && !error && instructors.length === 0 && (
              <p className="courses-status">No instructors found.</p>
            )}

            <div className="instructors-grid">
              {instructors.map((instructor) => (
                <article key={instructor.id} className="instructor-card-simple">
                  <div className="instructor-card-simple-photo">
                    {instructor.photoUrl
                      ? <img src={instructor.photoUrl} alt={instructor.name} />
                      : <div className="course-art-placeholder" />}
                  </div>
                  <h3>{instructor.name}</h3>
                  {instructor.designation && <p className="instructor-designation">{instructor.designation}</p>}
                  <Link className="read-bio-btn" to={`/instructors/${instructor.slug}`}>
                    Read Bio
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
