/* eslint-disable react/prop-types */
// "Elementor Dashboard" — a wp-admin-style admin page (black top bar, dark
// left sidebar, gray content area with white widget boxes). Reuses the same
// section components as /admin; only the shell/styling mimics WordPress.
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  SiteContentAdmin, InstructorsAdmin, ServicesAdmin, ArticlesAdmin, PagesAdmin, ContactInbox, CommerceAdmin,
} from '../components/AdminContentSections'
import { CreateCourseSection, ManageCoursesSection, ManageEnrollmentsSection } from './admin'

const MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'elementor', label: 'Elementor', icon: '🎨' },
  { key: 'courses', label: 'Courses', icon: '🎓' },
  { key: 'enrollments', label: 'Enrollments', icon: '🧑‍🎓' },
  { key: 'instructors', label: 'Instructors', icon: '👤' },
  { key: 'services', label: 'Services', icon: '🧩' },
  { key: 'articles', label: 'Articles', icon: '📝' },
  { key: 'pages', label: 'Pages', icon: '📄' },
  { key: 'commerce', label: 'Commerce', icon: '🧾' },
  { key: 'messages', label: 'Messages', icon: '✉️' },
]

const TAB_TITLES = {
  dashboard: 'Dashboard',
  elementor: 'Elementor — Site Content',
  courses: 'Courses',
  enrollments: 'Enrollments',
  instructors: 'Instructors',
  services: 'Services',
  articles: 'Articles',
  pages: 'Pages',
  commerce: 'Commerce',
  messages: 'Messages',
}

function formatWpDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function DashboardHome({ stats, onNavigate }) {
  if (!stats) return <p className="wpadmin-loading">Loading…</p>
  const { counts, recentUsers, recentMessages } = stats
  const glance = [
    { icon: '👥', value: counts.students, label: 'Students' },
    { icon: '🎓', value: counts.courses, label: 'Courses' },
    { icon: '🧑‍🎓', value: counts.enrollments, label: 'Enrollments' },
    { icon: '📝', value: counts.articles, label: 'Articles' },
    { icon: '👤', value: counts.instructors, label: 'Instructors' },
    { icon: '✉️', value: counts.messages, label: 'Messages' },
  ]
  return (
    <div className="wpadmin-widgets">
      <div className="wpadmin-box">
        <div className="wpadmin-box-head">At a Glance</div>
        <div className="wpadmin-box-body">
          <div className="wpadmin-glance">
            {glance.map((g) => (
              <div key={g.label} className="wpadmin-glance-item">
                <span className="wpadmin-glance-icon">{g.icon}</span>
                <strong>{g.value}</strong> {g.label}
              </div>
            ))}
          </div>
          {counts.messagesThisWeek > 0 && (
            <p className="wpadmin-note">✉️ {counts.messagesThisWeek} new message{counts.messagesThisWeek === 1 ? '' : 's'} this week</p>
          )}
        </div>
      </div>

      <div className="wpadmin-box">
        <div className="wpadmin-box-head">Quick Actions</div>
        <div className="wpadmin-box-body">
          <ul className="wpadmin-links">
            <li><button type="button" onClick={() => onNavigate('elementor')}>🎨 Edit site content</button></li>
            <li><button type="button" onClick={() => onNavigate('courses')}>＋ Add a course</button></li>
            <li><button type="button" onClick={() => onNavigate('messages')}>✉️ View messages</button></li>
            <li><Link to="/">🌐 View site</Link></li>
            <li><Link to="/admin">⚙ Classic admin dashboard</Link></li>
          </ul>
        </div>
      </div>

      <div className="wpadmin-box">
        <div className="wpadmin-box-head">Recent Registrations</div>
        <div className="wpadmin-box-body">
          <ul className="wpadmin-activity">
            {recentUsers.map((u, i) => (
              <li key={i}>
                <strong>{u.name || u.username}</strong>
                <span>{formatWpDate(u.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="wpadmin-box">
        <div className="wpadmin-box-head">Recent Messages</div>
        <div className="wpadmin-box-body">
          {recentMessages.length === 0 ? (
            <p className="wpadmin-note">No messages yet.</p>
          ) : (
            <ul className="wpadmin-activity">
              {recentMessages.map((m, i) => (
                <li key={i}>
                  <strong>{m.name}</strong> <span className="wpadmin-muted">{m.email}</span>
                  <span>{formatWpDate(m.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ElementorDashboardPage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate('/')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (user?.role !== 'admin') return
    fetch('/api/admin/stats', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
    fetchCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchCourses() {
    const res = await fetch('/api/courses')
    if (res.ok) {
      const data = await res.json()
      const withLessons = await Promise.all(data.map(async (c) => {
        const r = await fetch(`/api/courses/${c.slug}`)
        return r.ok ? r.json() : c
      }))
      setCourses(withLessons)
    }
  }

  if (loading || !user || user.role !== 'admin') return null

  return (
    <div className="wpadmin-shell">
      <header className="wpadmin-topbar">
        <div className="wpadmin-topbar-left">
          <Link to="/" className="wpadmin-site-link">🏠 Talweeh Academy</Link>
          <button type="button" className="wpadmin-topbar-btn" onClick={() => setTab('courses')}>＋ New</button>
        </div>
        <div className="wpadmin-topbar-right">
          <span>Salam, {user.name}</span>
          <span className="wpadmin-avatar" aria-hidden="true">{(user.name || '?').charAt(0).toUpperCase()}</span>
          <button type="button" className="wpadmin-topbar-btn" onClick={logout}>Log Out</button>
        </div>
      </header>

      <div className="wpadmin-body">
        <nav className="wpadmin-sidebar" aria-label="Admin menu">
          {MENU.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`wpadmin-menu-item${tab === item.key ? ' active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              <span className="wpadmin-menu-icon">{item.icon}</span>
              <span className="wpadmin-menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="wpadmin-content">
          <h1 className="wpadmin-title">{TAB_TITLES[tab]}</h1>
          {tab === 'dashboard' && <DashboardHome stats={stats} onNavigate={setTab} />}
          {tab === 'elementor' && (
            <div className="wpadmin-panel">
              <p className="wpadmin-note">
                Tip: you can also edit in place — <Link to="/">open the site</Link> and press the ✎ Edit button in the corner.
              </p>
              <SiteContentAdmin />
            </div>
          )}
          {tab === 'courses' && (
            <div className="wpadmin-panel">
              <CreateCourseSection onCreated={fetchCourses} />
              <hr className="wpadmin-hr" />
              <ManageCoursesSection courses={courses} onRefresh={fetchCourses} />
            </div>
          )}
          {tab === 'enrollments' && <div className="wpadmin-panel"><ManageEnrollmentsSection courses={courses} /></div>}
          {tab === 'instructors' && <div className="wpadmin-panel"><InstructorsAdmin /></div>}
          {tab === 'services' && <div className="wpadmin-panel"><ServicesAdmin /></div>}
          {tab === 'articles' && <div className="wpadmin-panel"><ArticlesAdmin /></div>}
          {tab === 'pages' && <div className="wpadmin-panel"><PagesAdmin /></div>}
          {tab === 'commerce' && <div className="wpadmin-panel"><CommerceAdmin /></div>}
          {tab === 'messages' && <div className="wpadmin-panel"><ContactInbox /></div>}
        </main>
      </div>
    </div>
  )
}
