/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

const ASSET = '/talweeh/wp-content/uploads'
const THUMBS = `${ASSET}/elementor/thumbs`

const navItems = [
  { label: 'Courses', to: '/courses' },
  { label: 'Services', to: '/services' },
  { label: 'Articles', to: '/articles' },
  { label: 'About', to: '/about' },
  { label: 'Instructors', to: '/instructors' },
  { label: 'Contact', to: '/contact' },
]

const categories = [
  { id: 'all', label: 'All' },
  { id: 'fiqh', label: 'Fiqh (Islamic jurisprudence)' },
  { id: 'aqidah', label: '\u2018Aq\u012Bdah (Theology)' },
  { id: 'adab', label: 'Adab (Arabic Literature)' },
  { id: 'hadith', label: '\u1E24ad\u012Bth' },
  { id: 'nahw', label: 'Na\u1E25w (Arabic syntax)' },
  { id: 'tafsir', label: 'Tafs\u012Br' },
  { id: 'tajwid', label: 'Tajw\u012Bd' },
  { id: 'usulfiqh', label: 'U\u1E63\u016Bl Al-Fiqh (Legal theory)' },
  { id: 'usulhadith', label: 'U\u1E63\u016Bl Al-\u1E24ad\u012Bth (\u1E24ad\u012Bth Nomenclature)' },
]

const AVATARS = {
  omer: `${THUMBS}/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp`,
  daud: `${THUMBS}/mohammad_daud-rea2gp5lqnx8g5vcsmhaxcm9rs3vnrbh1l4wdyfmu4.webp`,
  farhan: `${ASSET}/2026/03/Shaykh-Farhan-Ingar-300x300.webp`,
  hamza: `${ASSET}/2025/10/SheikhHamza-300x300.webp`,
}

const courses = [
  {
    title: 'Al-Athb\u0101t wa al-Fah\u0101ris',
    price: '$50.00',
    status: 'Online',
    instructor: 'M. Mohammad Daud',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Al-Athbat-wal-Faharis-Poster-rmfb706nbzs3d1sp5jpf5mupaudrbvkqvhzop40pp0.webp`,
    avatar: AVATARS.daud,
    cats: ['hadith', 'usulhadith'],
  },
  {
    title: 'A Critical Study of U\u1E63\u016Bl al-Sh\u0101sh\u012B',
    price: '$30.00',
    cadence: '/ month for 12 months',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/A-Critical-Study-of-U\u1E63ul-al-Sashi-rldq5z4guash9wdooaungoskz8zl373t06rgnrdst0.webp`,
    avatar: AVATARS.omer,
    cats: ['fiqh', 'usulfiqh'],
  },
  {
    title: 'Al Jar\u1E25 wa al-Ta\u02BFd\u012Bl (Criticism and Accreditation of Narrators)',
    price: '$75.00',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/The-science-of-Jar\u1E25-wa-Ta\u02BFdil-rldpxb21taxa7cyzajyigvjjrbpq3oox5a69bw8i6s.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith', 'usulhadith'],
  },
  {
    title: 'Monday Night Readings',
    price: '$0.00',
    status: 'Online | Free',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Monday-Night-Readings-rldoxpw1247gmuny3o60kcua354fo8erx4zg7r03ro.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith'],
  },
  {
    title: 'Tajw\u012Bd Mastery Level 1',
    price: '$100.00',
    cadence: '3 Months',
    status: 'Online',
    instructor: 'Shaykh Farhan Ingar',
    school: 'Talweeh Academy',
    image: `${THUMBS}/Tajwid-Mastery-Level-1-rl6hesh7y0fy7jsf8n0gbifmll85mkmt1xri2lusr8.webp`,
    avatar: AVATARS.farhan,
    cats: ['tajwid'],
  },
  {
    title: 'Arabic Program',
    price: '$99.00',
    cadence: '2 Year',
    status: 'Online',
    instructor: 'M. Mohammad Daud Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Arabic-Program-rjggyk57use5994o9j1m2nlb740ctxbps4hopamsyc.webp`,
    avatar: AVATARS.daud,
    cats: ['nahw', 'adab'],
  },
  {
    title: 'Tadr\u012Bb al-R\u0101w\u012B: An In-Depth Study of Al-Suy\u016B\u1E6D\u012B\u2019s Work',
    price: '$50.00',
    cadence: '/ month',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Tadrib-al-Rawi-rhqii7iwegqq5g24jzmp05qz6ei1o0do237liqtzbo.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith', 'usulhadith'],
  },
  {
    title: 'Tadw\u012Bn al-Sunnah (Codification of the Sunnah)',
    price: '$40.00',
    status: 'Completed',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Tadwin-al-Sunnah-rhlhg4iyc3z769xsl0g15h40hzay7t1gwklmo19ct0.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith', 'usulhadith'],
  },
  {
    title: 'Mak\u0101nat al-Sunnah (Sunnah as a Legal Authority)',
    price: '$50.00',
    status: 'Completed',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Makanat-al-Sunnah-rhk401q3n36oazlmzkav6o6lgt2x7296u06kfklkb8.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith', 'usulhadith'],
  },
  {
    title: 'T\u0101\u02BCiyyah of Al-Ilb\u012Br\u012B',
    price: '$30.00',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${ASSET}/2024/12/Taiyyah-poster-websiteqw.webp`,
    avatar: AVATARS.omer,
    cats: ['adab', 'aqidah'],
  },
  {
    title: 'Mukhtasar al-Qud\u016Br\u012B: Qism al-\u02BFUq\u016Bb\u0101t',
    price: '$50.00',
    cadence: '/ month',
    status: 'Online',
    instructor: 'Shaikh Hamza Aktas',
    school: 'IKAN University',
    image: `${ASSET}/2024/12/11.webp`,
    avatar: AVATARS.hamza,
    cats: ['fiqh'],
  },
  {
    title: 'Al-Tamh\u012Bd Li Qaw\u0101\u02BFid al-Tawh\u012Bd',
    price: '$50.00',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${ASSET}/2026/02/Al-Tamhid-Li-Qawaaid-al-Tawhid.webp`,
    avatar: AVATARS.omer,
    cats: ['aqidah'],
  },
  {
    title: 'Hadith Studies (Specialization)',
    price: '$150.00',
    cadence: '/ month for 24 months',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${ASSET}/2025/08/Hadith-Studies.webp`,
    avatar: AVATARS.omer,
    cats: ['hadith', 'usulhadith'],
  },
]

const articles = [
  {
    title: 'Ta\u1E25s\u012Bn & Taqb\u012B\u1E25: Reason, Revelation, and the Foundations of Islamic Morality',
    date: 'January 8, 2026',
    minutes: '6 Minutes',
    excerpt:
      'A study of the classical debate on whether moral truths are accessible by reason alone or require revelation to be known.',
    image: `${THUMBS}/6377745d-0c9b-4bc7-8aff-89741e33bd80-rhgij4a8qwjvgphd68yf4ucsg06lej1d8navz70brs.webp`,
  },
  {
    title: 'The Legacy of Mukhtasar al-Qud\u016Br\u012B',
    date: 'October 30, 2025',
    minutes: '8 Minutes',
    excerpt:
      'A century-long survey of one of the most influential Hanafi legal compendiums, including the most famous works that stem from it.',
    image: `${THUMBS}/The-Legacy-of-Mukhta\u1E63ar-al-Quduri1-rdzcu6bbga7nf97o49pa8p1nu7pcgcnlgpss89w908.webp`,
  },
  {
    title: 'The Nature of Islamic Finance',
    date: 'October 11, 2024',
    minutes: '18 Minutes',
    excerpt:
      'Islamic jurisprudence has demonstrated over the centuries its ability to adapt to any time or place, meet any challenge, and overcome any obstacle.',
    image: `${THUMBS}/1695772403610-qw7x79r4agxnc088e5ffozvglmjyn9os6d70vtvt7c.webp`,
  },
]

const instructors = [
  {
    name: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    bio: 'Specialist in Hadith sciences and Usul al-Fiqh, with multiple ijazat in classical Islamic disciplines.',
    avatar: `${ASSET}/2025/02/shomarkhurshid-300x300.webp`,
  },
  {
    name: 'M. Mohammad Daud',
    school: 'Islamic University Medina',
    bio: 'Mufti and Arabic instructor focused on Hanafi fiqh, Arabic grammar, and morphology.',
    avatar: `${ASSET}/2025/11/mohammad_daud-300x300.webp`,
  },
  {
    name: 'Shaykh Farhan Ingar',
    school: 'Talweeh Academy',
    bio: 'Tajwid and Quranic recitation instructor, leading the Tajwid Mastery program.',
    avatar: `${ASSET}/2026/03/Shaykh-Farhan-Ingar-300x300.webp`,
  },
  {
    name: 'Shaikh Hamza Aktas',
    school: 'IKAN University',
    bio: 'Hanafi fiqh instructor focused on classical compendiums and applied jurisprudence.',
    avatar: `${ASSET}/2025/10/SheikhHamza-300x300.webp`,
  },
]

const footerLinks = {
  Home: [
    { label: 'About Us', to: '/about' },
    { label: 'Courses', to: '/courses' },
    { label: 'Admission', to: '/contact' },
    { label: 'Instructors', to: '/instructors' },
    { label: 'Services', to: '/services' },
    { label: 'Articles', to: '/articles' },
  ],
  'Login/Register': [
    { label: 'Login as a Student', to: '/contact' },
    { label: 'Register as a Student', to: '/contact' },
    { label: 'Dashboard Panel', to: '/contact' },
  ],
  Miscellaneous: [
    { label: 'My Profile', to: '/contact' },
    { label: 'Enrolled Courses', to: '/courses' },
    { label: 'Purchase History', to: '/contact' },
    { label: 'My Quiz Attempts', to: '/contact' },
  ],
}

function Header() {
  const navigate = useNavigate()
  return (
    <header className="site-header">
      <div className="promo-bar">
        <span>
          Up to 50% off on Selective Courses, <Link to="/courses">See Now</Link>
        </span>
        <button aria-label="Close announcement" onClick={(e) => (e.currentTarget.parentElement.style.display = 'none')}>
          {'\u00D7'}
        </button>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="Talweeh Academy home">
          <img src={`${ASSET}/2024/11/logo_final-scaled-600x171.webp`} alt="Talweeh Academy" />
        </Link>
        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <button className="cart-button" aria-label="Cart" onClick={() => navigate('/courses')}>
            <span>{'\u25A4'}</span>
          </button>
          <button className="journey-button" onClick={() => navigate('/contact')}>
            <span>{'\u263B'}</span>
            My Journey
          </button>
        </div>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <img className="footer-seal" src={`${ASSET}/2024/11/favicon_footer2.webp`} alt="Talweeh Academy seal" />
        {Object.entries(footerLinks).map(([heading, links]) => (
          <div className="footer-column" key={heading}>
            <h4>{heading}</h4>
            {links.map((link) => (
              <Link to={link.to} key={link.label}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="footer-column social-column">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">X</a>
            <a href="https://www.youtube.com/@talweehacademy" target="_blank" rel="noreferrer" aria-label="YouTube">{'\u25B6'}</a>
            <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram">{'\u25C9'}</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">{'\u25CE'}</a>
            <a href="https://wa.me" target="_blank" rel="noreferrer" aria-label="WhatsApp">{'\u260E'}</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{'\u00A9'} All rights reserved by Talweeh Academy 2025</span>
        <button aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {'\u2303'}
        </button>
      </div>
    </footer>
  )
}

function PageBanner({ title, breadcrumb }) {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <h1>{title}</h1>
        <img className="hero-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>
          <Link to="/">Home</Link> | {breadcrumb}
        </p>
      </div>
    </section>
  )
}

function CourseCard({ course }) {
  const navigate = useNavigate()
  return (
    <article className="course-card">
      <div className="course-art">
        <img src={course.image} alt="" />
        <div className="instructor-strip">
          <img src={course.avatar} alt="" />
          <div>
            <strong>{course.instructor}</strong>
            <span>{course.school}</span>
          </div>
        </div>
      </div>
      <div className="course-body">
        <h2>{course.title}</h2>
        <div className="price-line">
          <strong>{course.price}</strong>
          {course.cadence && <span>{course.cadence}</span>}
          <em>[USD]</em>
        </div>
        <div className="course-footer">
          <button type="button" className="link-button" onClick={() => navigate('/courses')}>
            View Course
          </button>
          <span>{course.status}</span>
        </div>
      </div>
    </article>
  )
}

function CategoryFilter({ active, onChange }) {
  return (
    <div className="category-panel" aria-label="Course categories">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={category.id === active ? 'active' : ''}
          onClick={() => onChange(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}

function GiftSection() {
  const navigate = useNavigate()
  return (
    <section className="gift-section">
      <div className="gift-card">
        <h3>Gift a Membership</h3>
        <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>Sponsor a course which will be given to an applicant who can&apos;t afford Talweeh Academy.</p>
        <button type="button" className="red-button" onClick={() => navigate('/contact')}>
          <span>{'\u25A3'}</span> Give a Gift
        </button>
      </div>
      <div className="gift-card">
        <h3>Apply for a Gift</h3>
        <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>If you can&apos;t afford a subscription, please submit an application for a course.</p>
        <button type="button" className="red-button" onClick={() => navigate('/contact')}>
          <span>{'\u25A3'}</span> Apply for a Gift
        </button>
      </div>
    </section>
  )
}

function HomePage() {
  const navigate = useNavigate()
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-overlay">
          <span className="home-hero-arabic">{'\u0631\u064E\u0628\u0651\u0650 \u0632\u0650\u062F\u0652\u0646\u0650\u064A \u0639\u0650\u0644\u0652\u0645\u064B\u0627'}</span>
          <h1>The Gateway to Islamic Scholarship</h1>
          <p>Discover. Enlighten. Empower.</p>
          <button type="button" className="red-button" onClick={() => navigate('/courses')}>
            Explore Our Courses
          </button>
        </div>
      </section>

      <section className="home-features">
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

      <section className="courses-section">
        <h2 className="section-title">Featured Courses</h2>
        <div className="course-grid">
          {courses.slice(0, 4).map((course) => (
            <CourseCard course={course} key={course.title} />
          ))}
        </div>
        <div className="section-cta">
          <button type="button" className="red-button" onClick={() => navigate('/courses')}>
            Load all Courses
          </button>
        </div>
      </section>

      <section className="home-articles">
        <h2 className="section-title">Latest Articles</h2>
        <div className="article-list">
          {articles.map((a) => (
            <article key={a.title} className="article-row">
              {a.image ? (
                <img src={a.image} alt="" loading="lazy" className="article-thumb" />
              ) : null}
              <div>
                <small>{a.date} {'\u00B7'} {a.minutes}</small>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
                <button type="button" className="link-button" onClick={() => navigate('/articles')}>
                  Read More
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <GiftSection />
    </>
  )
}

function CoursesPage() {
  const [active, setActive] = useState('all')
  const filtered = useMemo(
    () => (active === 'all' ? courses : courses.filter((c) => c.cats.includes(active))),
    [active],
  )

  return (
    <>
      <PageBanner title="Courses" breadcrumb="Courses" />
      <section className="courses-section">
        <CategoryFilter active={active} onChange={setActive} />
        {filtered.length === 0 ? (
          <p className="empty-state">No courses match this category yet.</p>
        ) : (
          <div className="course-grid">
            {filtered.map((course) => (
              <CourseCard course={course} key={course.title} />
            ))}
          </div>
        )}
      </section>
      <GiftSection />
    </>
  )
}

function ServicesPage() {
  return (
    <>
      <PageBanner title="Services" breadcrumb="Services" />
      <section className="content-section">
        <h2>What We Offer</h2>
        <ul className="service-list">
          <li><strong>Structured Programs</strong> - Long-form curricula across Arabic, fiqh, hadith, and more.</li>
          <li><strong>Live Classes</strong> - Interactive lessons with qualified instructors.</li>
          <li><strong>Self-Paced Library</strong> - On-demand video lessons and readings.</li>
          <li><strong>Talweeh Society</strong> - Free weekly reminders and lessons.</li>
          <li><strong>Gifted Memberships</strong> - Sponsor or receive subsidized course access.</li>
        </ul>
      </section>
    </>
  )
}

function ArticlesPage() {
  return (
    <>
      <PageBanner title="Articles" breadcrumb="Articles" />
      <section className="content-section">
        <div className="article-list">
          {articles.map((a) => (
            <article key={a.title} className="article-row">
              {a.image ? (
                <img src={a.image} alt="" loading="lazy" className="article-thumb" />
              ) : null}
              <div>
                <small>{a.date} {'\u00B7'} {a.minutes}</small>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function AboutPage() {
  return (
    <>
      <PageBanner title="About Us" breadcrumb="About" />
      <section className="content-section">
        <h2>What is Talweeh Academy?</h2>
        <p>
          Talweeh Academy is an institution dedicated to reviving Islamic academia in the West.
          Our mission is to help seekers of knowledge engage deeply with the rich legacy of Islamic scholarship
          through carefully designed, content-rich courses across the Islamic sciences.
        </p>
        <h2>Our Vision</h2>
        <p>
          Elevating academic excellence across all Islamic disciplines, bridging existing gaps,
          and creating an environment where knowledge can flourish.
        </p>
        <h2>Qualified Guidance</h2>
        <p>
          Our instructors hold ij\u0101z\u0101t (traditional authorizations) from distinguished scholars worldwide
          and have integrated traditional and academic methodologies in their pursuit of knowledge.
        </p>
      </section>
    </>
  )
}

function InstructorsPage() {
  return (
    <>
      <PageBanner title="Instructors" breadcrumb="Instructors" />
      <section className="content-section">
        <div className="instructor-grid">
          {instructors.map((i) => (
            <article key={i.name} className="instructor-card">
              <img src={i.avatar} alt={i.name} />
              <h3>{i.name}</h3>
              <small>{i.school}</small>
              <p>{i.bio}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  return (
    <>
      <PageBanner title="Contact" breadcrumb="Contact" />
      <section className="content-section">
        <h2>Get in Touch</h2>
        <p>Email: <a href="mailto:info@talweehacademy.com">info@talweehacademy.com</a></p>

        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(true)
          }}
        >
          <label>
            Name
            <input type="text" name="name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Message
            <textarea name="message" rows="5" required />
          </label>
          <button type="submit" className="red-button">Send Message</button>
          {submitted && <p className="success-note">Thanks - we&apos;ll get back to you shortly.</p>}
        </form>
      </section>
    </>
  )
}

function NotFoundPage() {
  return (
    <>
      <PageBanner title="Page Not Found" breadcrumb="404" />
      <section className="content-section">
        <p>The page you&apos;re looking for does not exist.</p>
        <Link className="red-button" to="/">Back to Home</Link>
      </section>
    </>
  )
}

function App() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/instructors" element={<InstructorsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
