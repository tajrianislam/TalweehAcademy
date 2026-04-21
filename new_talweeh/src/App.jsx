/* eslint-disable react/prop-types */
import './App.css'

const ASSET = 'https://talweehacademy.com/wp-content/uploads'
const THUMBS = `${ASSET}/elementor/thumbs`

const navItems = ['Courses', 'Services', 'Articles', 'About', 'Instructors', 'Contact']

const categories = [
  'All',
  'Fiqh (Islamic jurisprudence)',
  '‘Aqīdah (Theology)',
  'Adab (Arabic Literature)',
  'Ḥadīth',
  'Naḥw (Arabic syntax)',
  'Tafsīr',
  'Tajwīd',
  'Uṣūl Al-Fiqh (Legal theory)',
  'Uṣūl Al-Ḥadīth (Ḥadīth Nomenclature)',
]

const courses = [
  {
    title: 'A Critical Study of Uṣūl al-Shāshī',
    price: '$30.00',
    cadence: '/ month for 12 months',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/A-Critical-Study-of-Uṣul-al-Sashi-rldq5z4guash9wdooaungoskz8zl373t06rgnrdst0.webp`,
    avatar: `${THUMBS}/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp`,
  },
  {
    title: 'Al Jarḥ wa al-Taʿdīl (Criticism and Accreditation of Narrators)',
    price: '$75.00',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/The-science-of-Jarḥ-wa-Taʿdil-rldpxb21taxa7cyzajyigvjjrbpq3oox5a69bw8i6s.webp`,
    avatar: `${THUMBS}/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp`,
  },
  {
    title: 'Monday Night Readings',
    price: '$0.00',
    status: 'Online | Free',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Monday-Night-Readings-rldoxpw1247gmuny3o60kcua354fo8erx4zg7r03ro.webp`,
    avatar: `${THUMBS}/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp`,
  },
  {
    title: 'Musallam Al-Thubūt',
    price: '$125.00',
    status: 'Completed',
    instructor: 'M. Mohammad Daud',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Hanafi-Uṣul-al-Fiqh-Level-01-rfkd0r9y5ilfd0ttgant6ouyfvlk6r5plneiw5s4d0.webp`,
    avatar: `${THUMBS}/mohammad_daud-rea2gp5lqnx8g5vcsmhaxcm9rs3vnrbh1l4wdyfmu4.webp`,
  },
  {
    title: 'Tadrīb al-Rāwī: An In-Depth Study of Al-Suyūṭī’s Work',
    price: '$50.00',
    cadence: '/ month',
    status: 'Online',
    instructor: 'Sh. Omer Khurshid',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Tadrib-al-Rawi-rhqii7iwegqq5g24jzmp05qz6ei1o0do237liqtzbo.webp`,
    avatar: `${THUMBS}/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp`,
  },
  {
    title: 'Mukhtasar al-Qudūrī: Qism al-‘Ibādāt',
    price: '$50.00',
    cadence: '/ month',
    status: 'Online',
    instructor: 'M. Mohammad Daud',
    school: 'Islamic University Medina',
    image: `${THUMBS}/Mukhtasar-al-Quduri-Qism-al-‘Ibadat-rcs7czgj7h0kpq1tbeg1jpxpnfvere6fkmiz194mxg.webp`,
    avatar: `${THUMBS}/mohammad_daud-rea2gp5lqnx8g5vcsmhaxcm9rs3vnrbh1l4wdyfmu4.webp`,
  },
]

const footerLinks = {
  Home: ['About Us', 'Courses', 'Admission', 'Instructors', 'Services', 'Articles'],
  'Login/Register': ['Login as a Student', 'Register as a Student', 'Dashboard Panel'],
  Miscellaneous: ['My Profile', 'Enrolled Courses', 'Purchase History', 'My Quiz Attempts', 'Enrolled Courses'],
}

function Header() {
  return (
    <header className="site-header">
      <div className="promo-bar">
        <span>
          Up to 50% off on Selective Courses, <a href="#courses">See Now</a>
        </span>
        <button aria-label="Close announcement">×</button>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <a className="brand" href="#">
          <img src={`${ASSET}/2024/11/logo_final-scaled-600x171.webp`} alt="Talweeh Academy" />
        </a>
        <div className="nav-links">
          {navItems.map((item) => (
            <a href="#" key={item}>
              {item}
            </a>
          ))}
        </div>
        <div className="nav-actions">
          <button className="cart-button" aria-label="Cart">
            <span>▤</span>
          </button>
          <button className="journey-button">
            <span>☻</span>
            My Journey
          </button>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <h1>Courses</h1>
        <img className="hero-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>
          <a href="#">Home</a> | Courses
        </p>
      </div>
    </section>
  )
}

function CategoryFilter() {
  return (
    <div className="category-panel" aria-label="Course categories">
      {categories.map((category) => (
        <button className={category === 'All' ? 'active' : ''} key={category}>
          {category}
        </button>
      ))}
    </div>
  )
}

function CourseCard({ course }) {
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
          <a href="#">View Course</a>
          <span>{course.status}</span>
        </div>
      </div>
    </article>
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

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <img className="footer-seal" src={`${ASSET}/2024/11/favicon_footer2.webp`} alt="Talweeh Academy seal" />
        {Object.entries(footerLinks).map(([heading, links]) => (
          <div className="footer-column" key={heading}>
            <h4>{heading}</h4>
            {links.map((link) => (
              <a href="#" key={link}>
                {link}
              </a>
            ))}
          </div>
        ))}
        <div className="footer-column social-column">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="#" aria-label="X">
              X
            </a>
            <a href="#" aria-label="YouTube">
              ▶
            </a>
            <a href="#" aria-label="Telegram">
              ◉
            </a>
            <a href="#" aria-label="Instagram">
              ◎
            </a>
            <a href="#" aria-label="WhatsApp">
              ☎
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© All rights reserved by Talweeh Academy 2025</span>
        <button aria-label="Scroll to top">⌃</button>
      </div>
    </footer>
  )
}

function App() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <Hero />
        <section className="courses-section" id="courses">
          <CategoryFilter />
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard course={course} key={course.title} />
            ))}
          </div>
        </section>
        <GiftSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
