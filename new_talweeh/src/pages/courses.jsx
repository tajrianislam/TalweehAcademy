/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { ASSET } from '../constants/assets'
import CourseCard from '../components/CourseCard'

const CATEGORIES = [
  'All',
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

function CategoryFilter({ active, onChange }) {
  return (
    <div className="category-panel" aria-label="Course categories">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={cat === active ? 'active' : ''}
          onClick={() => onChange(cat)}
          type="button"
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

function GiftSection() {
  return (
    <section className="gift-section">
      <div className="gift-card">
        <h3>Gift a Membership</h3>
        <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>Sponsor a course which will be given to an applicant who can&apos;t afford Talweeh Academy.</p>
        <a className="red-button" href="#">
          <span>▣</span>
          Give a Gift
        </a>
      </div>
      <div className="gift-card">
        <h3>Apply for a Gift</h3>
        <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>If you can&apos;t afford a subscription, please submit an application for a course.</p>
        <a className="red-button" href="#">
          <span>▣</span>
          Apply for a Gift
        </a>
      </div>
    </section>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(setCourses)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const visible = courses.filter((c) => c.status !== 'Hidden')
  const filtered = activeCategory === 'All'
    ? visible
    : visible.filter((c) => c.category === activeCategory)

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Courses" />
        <section className="courses-section" id="courses">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
          {loading && <p className="courses-status">Loading courses…</p>}
          {error && <p className="courses-status courses-error">{error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="courses-status">No courses found.</p>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="course-grid">
              {filtered.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          )}
        </section>
        <GiftSection />
      </main>
      <PageFooter />
    </div>
  )
}
