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
import TestPage from './pages/test'
import AdminPage from './pages/admin'
import CourseLandingPage from './pages/course-landing'
import LessonPage from './pages/lesson'
import LessonQuizPage from './pages/lesson-quiz'
import ResetPasswordPage from './pages/reset-password'
import GenericPage from './pages/page'
import DashboardPage from './pages/dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthModal from './components/AuthModal'
import { ASSET } from './constants/assets'

const heroSlides = [
  { heading: '2 Year Arabic Program', cta: 'Explore Arabic Program' },
  { heading: 'Discover! Enlighten! Empower!', cta: 'Start your Journey' },
  { heading: 'Revolutionizing your experience with Islamic Academia', cta: 'Start your Journey' },
]

const testimonials = [
  {
    quote:
      'Learning Arabic has been a transformative experience, especially under the guidance of my respected teachers Shaykh Daud and Shaykh Omer. Their dedication to teaching not only helped me in grasping the language but also enriched my appreciation for the Ulama of the past, and respect for all seekers of knowledge.',
    name: 'Mustafa Khan',
    location: 'Toronto, Canada',
  },
  {
    quote:
      "Mashallah, this academy changed the way I look at online courses. The level of sharpness of the instructors is unreal. They do not shy away from mentioning nuances, grammar benefits, and differences in opinions over any text.",
    name: 'Muhammed Ince',
    location: 'Turkey',
  },
  {
    quote:
      'Studying with Sheikh Omer really opened my mind to see how the Islamic sciences work in tandem. I have not had a better teacher in explaining the details and intricacies of all the sciences especially in fiqh and usool ul fiqh.',
    name: 'Mohammed Kaleelurrahman',
    location: 'Dallas, USA',
  },
  {
    quote:
      "Having studied with Mufti Dawud for over a year, I have benefitted greatly from his teaching. His way of teaching has been easy to understand, and he challenges us to push ourselves. As a convert, I found studying with him to be very inclusive and helpful.",
    name: 'Aldo Gjataj',
    location: 'Ashford, England',
  },
  {
    quote:
      'What I really love about the way Sheikh teaches is that whenever we learn a new rule, we immediately apply it. The practicality in his teaching method brings life to the theory which many students find difficult to grasp.',
    name: 'Muhammad Patel',
    location: 'Botswana',
  },
]

const footerLinks = {
  Home: [
    { label: 'About Us', to: '/about-us' },
    { label: 'Courses', to: '/courses' },
    { label: 'Instructors', to: '/instructors' },
    { label: 'Services', to: '/services' },
    { label: 'Articles', to: '/articles' },
  ],
  'Login/Register': [
    { label: 'Courses', to: '/courses' },
    { label: 'Dashboard Panel', to: '/dashboard' },
    { label: 'Contact', to: '/contact-us' },
  ],
  Miscellaneous: [
    { label: 'My Dashboard', to: '/dashboard' },
    { label: 'Enrolled Courses', to: '/dashboard' },
    { label: 'Purchase History', to: '/dashboard' },
    { label: 'Terms & Conditions', to: '/p/terms-conditions' },
  ],
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
  const { user, logout, openAuthModal } = useAuth()
  const [slide, setSlide] = useState(0)
  const [promoOpen, setPromoOpen] = useState(true)
  const [courses, setCourses] = useState([])
  const [latestArticles, setLatestArticles] = useState([])

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(t)
  }, [])

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
      {promoOpen && (
        <div className="promo-bar">
          <span>
            Up to 50% off on Select Courses,{' '}
            <Link to="/courses">See Now</Link>
          </span>
          <button type="button" aria-label="Close announcement" onClick={() => setPromoOpen(false)}>
            ×
          </button>
        </div>
      )}

      <header className="landing-header">
        <div className="landing-top">
          {user ? (
            <>
              <span className="top-bar-user">Welcome, {user.name}</span>
              <button type="button" className="top-bar-btn" onClick={logout}>Logout</button>
              <Link to="/dashboard">Dashboard</Link>
            </>
          ) : (
            <>
              <button type="button" className="top-bar-btn" onClick={() => openAuthModal('login')}>Login as a Student</button>
              <button type="button" className="top-bar-btn" onClick={() => openAuthModal('register')}>Register as a Student</button>
            </>
          )}
          <a href="mailto:info@talweehacademy.com">info@talweehacademy.com</a>
        </div>
        <nav className="landing-nav">
          <Link className="brand" to="/">
            <img src={`${ASSET}/2024/11/logo_final-scaled-600x171.webp`} alt="Talweeh Academy" />
          </Link>
          <div className="landing-nav-links">
            <Link to="/courses">Courses</Link>
            <Link to="/services">Services</Link>
            <Link to="/articles">Articles</Link>
            <Link to="/about-us">About</Link>
            <Link to="/instructors">Instructors</Link>
            <Link to="/contact-us">Contact</Link>
            <Link to="/test">Test</Link>
            {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          </div>
          <div className="landing-nav-actions">
            <button className="cart-button" type="button" aria-label="Cart">
              ▤
            </button>
            <button className="journey-button" type="button">
              My Journey
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero Carousel ─────────────────────────── */}
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <p className="hero-arabic">رَبِّ زِدْنِي عِلْمًا</p>
            <h1 key={slide} className="hero-heading">
              {heroSlides[slide].heading}
            </h1>
            <img
              className="hero-border2"
              src={`${ASSET}/2024/08/border2.svg`}
              alt=""
            />
            <a className="hero-cta-btn" href="#">
              {heroSlides[slide].cta}
            </a>
          </div>
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

        {/* ── Feature Highlights ───────────────────── */}
        <section className="landing-highlights">
          <article>
            <h3>Arabic Program</h3>
            <p>A step by step 2 year program to learn the Arabic language.</p>
          </article>
          <article>
            <h3>Talweeh Society</h3>
            <p>Get access to our free courses and weekly lessons.</p>
          </article>
          <article>
            <h3>Authorized Instructors</h3>
            <p>Qualified instructors navigating your path.</p>
          </article>
        </section>

        {/* ── Featured Courses ─────────────────────── */}
        <section className="landing-featured">
          <h2>Featured Courses</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="landing-featured-grid">
            {courses.map((course) => (
              <FeaturedCourseCard key={course.id} course={course} />
            ))}
          </div>
          <Link className="green-button" to="/courses">
            Load all Courses
          </Link>
        </section>

        {/* ── Latest Articles ──────────────────────── */}
        <section className="landing-articles">
          <h2>Latest Articles</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="landing-article-grid">
            {latestArticles.map((article) => (
              <article key={article.id}>
                <h3>{article.title}</h3>
                <div className="article-meta">
                  <span>{formatLandingDate(article.publishedAt)}</span>
                  <span>{article.readTime}</span>
                </div>
                {article.excerpt && <p>{article.excerpt}</p>}
                <Link to={`/articles/${article.slug}`}>Read More.....</Link>
              </article>
            ))}
          </div>
          <Link className="green-button" to="/articles">
            View Articles
          </Link>
        </section>

        {/* ── About + Why ──────────────────────────── */}
        <section className="landing-about-why">
          <div className="about-why-card">
            <h4>About Talweeh Academy</h4>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              At Talweeh Academy, our mission is to elevate academic awareness across all levels,
              offering comprehensive programs tailored for laypersons, students, and scholars. Our
              curriculum spans a broad range of Islamic academic disciplines.
            </p>
            <Link className="outline-btn-green" to="/about-us">
              About Us
            </Link>
          </div>
          <div className="about-why-card">
            <h4>Why Talweeh Academy</h4>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              Our instructors possess authorizations (ijāzāt) from esteemed scholars worldwide and
              have uniquely integrated traditional and academic methods in their quest for knowledge.
              Join us and check out the first few lessons of our courses for free.
            </p>
            <a className="outline-btn-green" href="#">
              Sign UP
            </a>
          </div>
        </section>

        {/* ── Join Talweeh Society ─────────────────── */}
        <section className="landing-join-society">
          <h3>Join Talweeh Society</h3>
          <p>
            Join us as we share uplifting reminders and insights from various texts, along with
            access to our free weekly lessons.
          </p>
          <a className="journey-button" href="#">
            Join Us
          </a>
        </section>

        {/* ── YouTube ──────────────────────────────── */}
        <section className="landing-youtube">
          <h2>Youtube Videos</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <a
            className="youtube-btn"
            href="https://www.youtube.com/@Talweeh.Academy"
            target="_blank"
            rel="noreferrer"
          >
            ▶ Subscribe to our YouTube
          </a>
        </section>

        {/* ── Gift Sections ────────────────────────── */}
        <section className="gift-section">
          <div className="gift-card">
            <h3>Gift a Membership</h3>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>Sponsor a course which will be given to an applicant who can&apos;t afford Talweeh Academy.</p>
            <a className="red-button" href="#">
              Give a Gift
            </a>
          </div>
          <div className="gift-card">
            <h3>Apply for a Gift</h3>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>If you can&apos;t afford a subscription, please submit an application for a course.</p>
            <a className="red-button" href="#">
              Apply for a Gift
            </a>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────── */}
        <section className="landing-testimonials">
          <h2>Testimonials</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="landing-testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.name}>
                <p>&ldquo;{item.quote}&rdquo;</p>
                <h4>{item.name}</h4>
                <span>{item.location}</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-content">
          <img className="footer-seal" src={`${ASSET}/2024/11/favicon_footer2.webp`} alt="Talweeh Academy seal" />
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div className="footer-column" key={heading}>
              <h4>{heading}</h4>
              {links.map(({ label, to }) => (
                <Link to={to} key={label}>{label}</Link>
              ))}
            </div>
          ))}
          <div className="footer-column">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#" aria-label="X / Twitter">𝕏</a>
              <a href="https://www.youtube.com/@Talweeh.Academy" aria-label="YouTube" target="_blank" rel="noreferrer">▶</a>
              <a href="#" aria-label="Telegram">◉</a>
              <a href="#" aria-label="Instagram">◎</a>
              <a href="#" aria-label="WhatsApp">☎</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© All rights reserved by Talweeh Academy 2025</span>
          <button
            type="button"
            aria-label="Scroll to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ⌃
          </button>
        </div>
      </footer>
    </div>
  )
}

function AppInner() {
  const { modal, closeAuthModal } = useAuth()

  return (
    <>
      <AuthModal open={modal.open} initialTab={modal.tab} onClose={closeAuthModal} />
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
        <Route path="/test" element={<TestPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/courses/:slug" element={<CourseLandingPage />} />
        <Route path="/courses/:slug/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/courses/:slug/lesson/:lessonId/quiz" element={<LessonQuizPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/p/:slug" element={<GenericPage />} />
      </Routes>
    </>
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
