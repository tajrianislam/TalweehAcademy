/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ASSET } from '../constants/assets'

const navLinks = [
  { label: 'Courses', to: '/courses' },
  { label: 'Services', to: '/services' },
  { label: 'Quran', to: '/quran' },
  { label: 'Articles', to: '/articles' },
  { label: 'About', to: '/about-us' },
  { label: 'Instructors', to: '/instructors' },
  { label: 'Contact', to: '/contact-us' },
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

export function PageHeader() {
  const { user, logout, openAuthModal } = useAuth()

  return (
    <header className="site-header">
      <div className="promo-bar">
        <span>
          Up to 50% off on Select Courses,{' '}
          <Link to="/courses">See Now</Link>
        </span>
        <button type="button" aria-label="Close announcement">×</button>
      </div>
      <div className="site-header-top">
        {user ? (
          <>
            <span className="top-bar-user">Welcome, {user.name}</span>
            <button type="button" className="top-bar-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <button type="button" className="top-bar-btn" onClick={() => openAuthModal('login')}>Login as a Student</button>
            <button type="button" className="top-bar-btn" onClick={() => openAuthModal('register')}>Register as a Student</button>
          </>
        )}
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className="brand" to="/">
          <img src={`${ASSET}/2024/11/logo_final-scaled-600x171.webp`} alt="Talweeh Academy" />
        </Link>
        <div className="nav-links">
          {navLinks.map(({ label, to }) => (
            <Link to={to} key={label}>{label}</Link>
          ))}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        </div>
        <div className="nav-actions">
          <button className="cart-button" type="button" aria-label="Cart">
            <span>▤</span>
          </button>
          <button className="journey-button" type="button">
            <span>☻</span>
            My Journey
          </button>
        </div>
      </nav>
    </header>
  )
}

export function PageHero({ title }) {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <h1>{title}</h1>
        <img className="hero-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
        <p>
          <Link to="/">Home</Link> | {title}
        </p>
      </div>
    </section>
  )
}

export function PageFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <img
          className="footer-seal"
          src={`${ASSET}/2024/11/favicon_footer2.webp`}
          alt="Talweeh Academy seal"
        />
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
  )
}
