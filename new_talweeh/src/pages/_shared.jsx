/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ASSET } from '../constants/assets'
import { useContent } from '../hooks/useContent'
import { Editable } from '../components/ContentEditor'

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

export function SocialIcons({ social, className = 'social-links' }) {
  return (
    <div className={className}>
      {social.map((s) => (
        <a
          key={s.label}
          href={s.href || '#'}
          aria-label={s.label}
          {...(s.href && s.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {s.icon}
        </a>
      ))}
    </div>
  )
}

export function PageHeader() {
  const { user, logout, openAuthModal } = useAuth()
  const { content: g } = useContent('global')
  const [promoOpen, setPromoOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      {promoOpen && (
        <Editable page="global" sectionKey="promoBar">
          <div className="promo-bar">
            <span>
              {g.promoBar.text}{' '}
              <Link to={g.promoBar.linkTo}>{g.promoBar.linkLabel}</Link>
            </span>
            <button type="button" aria-label="Close announcement" onClick={() => setPromoOpen(false)}>×</button>
          </div>
        </Editable>
      )}
      <div className="site-header-top">
        <div className="top-bar-links">
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
        </div>
        <SocialIcons social={g.footer.social} className="top-bar-social" />
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src={`${ASSET}/2024/11/logo_final-scaled-600x171.webp`} alt="Talweeh Academy" />
        </Link>
        <button
          type="button"
          className="nav-burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div
          className={menuOpen ? 'nav-links open' : 'nav-links'}
          onClick={() => setMenuOpen(false)}
          role="presentation"
        >
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
  const { content: g } = useContent('global')

  return (
    <Editable page="global" sectionKey="footer">
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
            <SocialIcons social={g.footer.social} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>{g.footer.copyright}</span>
          <button
            type="button"
            aria-label="Scroll to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ⌃
          </button>
        </div>
      </footer>
    </Editable>
  )
}
