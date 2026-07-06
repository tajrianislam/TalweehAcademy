/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import './App.css'
import { Link, Route, Routes } from 'react-router-dom'
import CoursesPage from './pages/courses'
import ServicesPage from './pages/services'
import ServiceDetailPage from './pages/service-detail'
import ArticlesPage from './pages/articles'
import ArticleDetailPage from './pages/article-detail'
import AboutUsPage from './pages/about-us'
import InstructorsPage from './pages/instructors'
import InstructorDetailPage from './pages/instructor-detail'
import ContactUsPage from './pages/contact-us'
import AdminPage from './pages/admin'
import CourseLandingPage from './pages/course-landing'
import LessonPage from './pages/lesson'
import LessonQuizPage from './pages/lesson-quiz'
import ResetPasswordPage from './pages/reset-password'
import GenericPage from './pages/page'
import DashboardPage from './pages/dashboard'
import QuranPage from './pages/quran'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthModal from './components/AuthModal'
import { ASSET } from './constants/assets'
import { PageHeader, PageFooter } from './pages/_shared'
import { useContent } from './hooks/useContent'
import { EditModeProvider, EditModeToggle, Editable } from './components/ContentEditor'

// Red section icons (match the WP site's Elementor icon widgets).
function MasjidIcon() {
  return (
    <svg className="hl-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6c1 6-6 9-6 16h12c0-7-7-10-6-16z" />
      <rect x="10" y="34" width="6" height="22" rx="1" />
      <rect x="48" y="34" width="6" height="22" rx="1" />
      <path d="M13 24c.5 4-3 5-3 8h6c0-3-3.5-4-3-8zM51 24c.5 4-3 5-3 8h6c0-3-3.5-4-3-8z" />
      <path d="M18 40c0-8 8-10 14-16 6 6 14 8 14 16v16H36v-8a4 4 0 0 0-8 0v8H18V40z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg className="hl-icon" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="22" cy="24" r="8" />
      <path d="M8 52c0-9 6-14 14-14s14 5 14 14v2H8v-2z" />
      <circle cx="45" cy="22" r="6.5" />
      <path d="M40 37.5c1.6-.7 3.3-1 5-1 7 0 12 4.4 12 12.4V50H40.6a19 19 0 0 0-.6-12.5z" />
    </svg>
  )
}

function FeaturedCourseCard({ course }) {
  return (
    <article className="course-card">
      <div className="course-art">
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} />
          : <div className="course-art-placeholder" />}
        {course.instructor_name && (
          <div className="instructor-strip">
            {course.instructor_avatar_url && <img src={course.instructor_avatar_url} alt="" />}
            <div>
              <strong>{course.instructor_name}</strong>
              {course.category && <span>{course.category}</span>}
            </div>
          </div>
        )}
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
  )
}

function formatLandingDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function LandingPage() {
  const { content: c } = useContent('landing')
  const [slide, setSlide] = useState(0)
  const [testimonialPage, setTestimonialPage] = useState(0)
  const [courses, setCourses] = useState([])
  const [latestArticles, setLatestArticles] = useState([])

  const heroSlides = c.heroSlides
  const currentSlide = heroSlides[slide % heroSlides.length] || heroSlides[0]
  const TESTIMONIALS_PER_PAGE = 3
  const testimonialPages = Math.max(1, Math.ceil(c.testimonials.length / TESTIMONIALS_PER_PAGE))
  const visibleTestimonials = c.testimonials.slice(
    (testimonialPage % testimonialPages) * TESTIMONIALS_PER_PAGE,
    (testimonialPage % testimonialPages) * TESTIMONIALS_PER_PAGE + TESTIMONIALS_PER_PAGE
  )

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(t)
  }, [heroSlides.length])

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCourses(data.filter((c) => c.status !== 'Hidden').slice(0, 6)))
      .catch(() => setCourses([]))
    fetch('/api/articles')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLatestArticles(data.slice(0, 3)))
      .catch(() => setLatestArticles([]))
  }, [])

  return (
    <div className="landing-shell">
      <PageHeader />

      <main>
        {/* ── Hero Carousel ─────────────────────────── */}
        <Editable page="landing" sectionKey="heroSlides">
          <section
            className="landing-hero"
            style={currentSlide.imageUrl ? {
              backgroundImage: `linear-gradient(170deg, rgba(14, 24, 17, 0.72) 0%, rgba(30, 50, 36, 0.62) 100%), url("${currentSlide.imageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            <div className="landing-hero-inner">
              <Editable page="landing" sectionKey="hero">
                <p className="hero-arabic">{c.hero.arabic}</p>
              </Editable>
              <h1 key={slide} className="hero-heading">
                {currentSlide.heading}
              </h1>
              <img
                className="hero-border2"
                src={`${ASSET}/2024/08/border2.svg`}
                alt=""
              />
              <a className="hero-cta-btn" href={currentSlide.ctaHref || '#'}>
                {currentSlide.cta}
              </a>
            </div>
            <button
              type="button"
              className="hero-arrow hero-arrow-prev"
              aria-label="Previous slide"
              onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="hero-arrow hero-arrow-next"
              aria-label="Next slide"
              onClick={() => setSlide((s) => (s + 1) % heroSlides.length)}
            >
              ›
            </button>
            <div className="hero-dots">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`hero-dot${i === slide ? ' active' : ''}`}
                  onClick={() => setSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </section>
        </Editable>

        {/* ── Feature Highlights ───────────────────── */}
        <Editable page="landing" sectionKey="highlights">
          <section className="landing-highlights">
            {c.highlights.map((h, i) => (
              <article key={h.title}>
                {i === 0 ? <span className="hl-icon hl-icon-arabic">العربية</span> : i === 1 ? <MasjidIcon /> : <PeopleIcon />}
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </article>
            ))}
          </section>
        </Editable>

        {/* ── Featured Courses ─────────────────────── */}
        <Editable page="landing" sectionKey="featured">
          <section className="landing-featured">
            <h2>{c.featured.heading}</h2>
            <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <div className="landing-featured-grid">
              {courses.map((course) => (
                <FeaturedCourseCard key={course.id} course={course} />
              ))}
            </div>
            <Link className="green-button" to="/courses">
              {c.featured.buttonLabel}
            </Link>
          </section>
        </Editable>

        {/* ── Latest Articles ──────────────────────── */}
        <Editable page="landing" sectionKey="latestArticles">
        <section className="landing-articles">
          <h2>{c.latestArticles.heading}</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="landing-article-grid">
            {latestArticles.map((article) => (
              <article key={article.id}>
                {article.imageUrl && (
                  <Link className="landing-article-thumb" to={`/articles/${article.slug}`}>
                    <img src={article.imageUrl} alt="" loading="lazy" />
                  </Link>
                )}
                <div className="landing-article-body">
                  <h3>{article.title}</h3>
                  <div className="article-meta">
                    <span>{formatLandingDate(article.publishedAt)}</span>
                    <span>{article.readTime}</span>
                  </div>
                  {article.excerpt && <p>{article.excerpt}</p>}
                  <Link to={`/articles/${article.slug}`}>Read More.....</Link>
                </div>
              </article>
            ))}
          </div>
          <Link className="green-button" to="/articles">
            {c.latestArticles.buttonLabel}
          </Link>
        </section>
        </Editable>

        {/* ── About + Why ──────────────────────────── */}
        <Editable page="landing" sectionKey="aboutWhy">
          <section className="landing-about-why">
            <div className="about-why-card">
              <h4>{c.aboutWhy.aboutHeading}</h4>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <p>{c.aboutWhy.aboutText}</p>
              <Link className="red-button" to="/about-us">
                {c.aboutWhy.aboutButtonLabel}
              </Link>
            </div>
            <div className="about-why-card">
              <h4>{c.aboutWhy.whyHeading}</h4>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <p>{c.aboutWhy.whyText}</p>
              <a className="red-button" href={c.aboutWhy.whyButtonHref || '#'}>
                {c.aboutWhy.whyButtonLabel}
              </a>
            </div>
          </section>
        </Editable>

        {/* ── Join Talweeh Society ─────────────────── */}
        <Editable page="landing" sectionKey="joinSociety">
          <section className="landing-join-society">
            <div className="join-society-inner">
              <PeopleIcon />
              <div className="join-society-text">
                <h3>{c.joinSociety.heading}</h3>
                <p>{c.joinSociety.text}</p>
              </div>
              <a className="red-button" href={c.joinSociety.buttonHref || '#'}>
                {c.joinSociety.buttonLabel}
              </a>
            </div>
          </section>
        </Editable>

        {/* ── YouTube ──────────────────────────────── */}
        <Editable page="landing" sectionKey="youtube">
          <section className="landing-youtube">
            <h2>{c.youtube.heading}</h2>
            <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
            {c.youtube.videos && c.youtube.videos.length > 0 && (
              <div className="youtube-grid">
                {c.youtube.videos.map((src) => (
                  <div className="youtube-embed" key={src}>
                    <iframe
                      src={src}
                      title="Talweeh Academy video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
            <a className="youtube-btn" href={c.youtube.url} target="_blank" rel="noreferrer">
              {c.youtube.buttonLabel}
            </a>
          </section>
        </Editable>

        {/* ── Gift Sections ────────────────────────── */}
        <Editable page="landing" sectionKey="gifts">
          <section className="gift-section">
            {c.gifts.map((gift) => (
              <div className="gift-card" key={gift.title}>
                <h3>{gift.title}</h3>
                <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
                <p>{gift.text}</p>
                <a className="red-button" href={gift.href || '#'}>
                  {gift.buttonLabel}
                </a>
              </div>
            ))}
          </section>
        </Editable>

        {/* ── Testimonials ─────────────────────────── */}
        <Editable page="landing" sectionKey="testimonials">
          <section className="landing-testimonials">
            <h2>Testimonials</h2>
            <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <div className="testimonial-carousel">
              <button
                type="button"
                className="testimonial-arrow"
                aria-label="Previous testimonials"
                onClick={() => setTestimonialPage((p) => (p - 1 + testimonialPages) % testimonialPages)}
              >
                ‹
              </button>
              <div className="landing-testimonial-grid">
                {visibleTestimonials.map((item) => (
                  <article key={item.name}>
                    <p>&ldquo;{item.quote}&rdquo;</p>
                    <h4>{item.name}</h4>
                    <span>{item.location}</span>
                  </article>
                ))}
              </div>
              <button
                type="button"
                className="testimonial-arrow"
                aria-label="Next testimonials"
                onClick={() => setTestimonialPage((p) => (p + 1) % testimonialPages)}
              >
                ›
              </button>
            </div>
          </section>
        </Editable>
      </main>

      <PageFooter />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="page-shell">
      <main className="not-found-page">
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link className="green-button" to="/">Back to Home</Link>
      </main>
    </div>
  )
}

function AppInner() {
  const { modal, closeAuthModal } = useAuth()

  return (
    <EditModeProvider>
      <AuthModal open={modal.open} initialTab={modal.tab} onClose={closeAuthModal} />
      <EditModeToggle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/instructors" element={<InstructorsPage />} />
        <Route path="/instructors/:slug" element={<InstructorDetailPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/courses/:slug" element={<CourseLandingPage />} />
        <Route path="/courses/:slug/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/courses/:slug/lesson/:lessonId/quiz" element={<LessonQuizPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/p/:slug" element={<GenericPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </EditModeProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

export default App
