/* eslint-disable react/prop-types */
import { Link, useNavigate } from 'react-router-dom'

// Mirrors the server's slugify() so instructor names map to /instructors/:slug.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function CoursePrice({ course }) {
  const price = Number(course.price)
  const original = Number(course.original_price)
  const discounted = original > price
  return (
    <>
      {discounted && <s className="price-original">${original.toFixed(2)}</s>}
      <strong>${price.toFixed(2)}</strong>
      {course.cadence && <span>{course.cadence}</span>}
      <em>[USD]</em>
    </>
  )
}

// Clickable course card used on the landing page and the Courses page.
// Click zones: instructor strip -> instructor page, price -> straight to
// payment, anywhere else (image, title, the green) -> course info page.
export default function CourseCard({ course, showCategory = false }) {
  const navigate = useNavigate()
  const courseUrl = `/courses/${course.slug}`

  function openCourse(e) {
    // Let real links inside the card (View Course) handle themselves.
    if (e.target.closest('a')) return
    navigate(courseUrl)
  }

  return (
    <article
      className="course-card course-card-clickable"
      onClick={openCourse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) navigate(courseUrl)
      }}
      role="link"
      tabIndex={0}
      aria-label={course.title}
    >
      <div className="course-art">
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} />
          : <div className="course-art-placeholder" />}
        {course.instructor_name && (
          <div
            className="instructor-strip"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/instructors/${slugify(course.instructor_name)}`)
            }}
            title={`View ${course.instructor_name}'s profile`}
          >
            {course.instructor_avatar_url && <img src={course.instructor_avatar_url} alt="" />}
            <div>
              <strong>{course.instructor_name}</strong>
              {showCategory && course.category && <span>{course.category}</span>}
            </div>
          </div>
        )}
      </div>
      <div className="course-body">
        <h2>{course.title}</h2>
        <div
          className="price-line price-line-clickable"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`${courseUrl}?buy=1`)
          }}
          title="Go straight to payment"
        >
          <CoursePrice course={course} />
        </div>
        <div className="course-footer">
          <Link to={courseUrl}>View Course</Link>
          <span>{course.status}</span>
        </div>
      </div>
    </article>
  )
}
