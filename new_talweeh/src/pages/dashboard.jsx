/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useAuth } from '../context/AuthContext'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function money(n, currency = 'USD') {
  return `${Number(n || 0).toFixed(2)} ${currency}`
}

function DashboardCourseCard({ course }) {
  const percent = course.lesson_count > 0
    ? Math.round((Number(course.completed_count) / Number(course.lesson_count)) * 100)
    : 0
  return (
    <article className="dash-course-card">
      <Link to={`/courses/${course.slug}`} className="dash-course-thumb">
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt="" loading="lazy" />
          : <span className="dash-course-thumb-fallback">۞</span>}
      </Link>
      <div className="dash-course-body">
        <Link to={`/courses/${course.slug}`} className="dash-course-title">{course.title}</Link>
        {course.instructor_name && <span className="dash-course-instructor">{course.instructor_name}</span>}
        <div className="dash-course-progress-track" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="dash-course-progress-row">
          <span>{course.completed_count}/{course.lesson_count} lessons · {percent}%</span>
          {course.completed ? (
            <span className="dash-course-done">✓ Completed</span>
          ) : (
            <Link
              className="dash-course-continue"
              to={course.first_lesson_id ? `/courses/${course.slug}/lesson/${course.first_lesson_id}` : `/courses/${course.slug}`}
            >
              {Number(course.completed_count) > 0 ? 'Continue →' : 'Start →'}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [subs, setSubs] = useState([])
  const [myCourses, setMyCourses] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portalError, setPortalError] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const [resetSent, setResetSent] = useState(false)

  const hasStripeBilling = subs.some((s) => s.stripe_subscription_id)

  async function sendPasswordReset() {
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      setResetSent(true)
    } catch {
      // Generic endpoint always succeeds; network failure just keeps the button active.
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal')
      window.location.assign(data.url)
    } catch (e) {
      setPortalError(e.message)
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetch('/api/me/orders', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/me/subscriptions', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/me/courses', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/me/profile', { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([o, s, c, p]) => { setOrders(o); setSubs(s); setMyCourses(c); setProfile(p) })
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="My Dashboard" />

        <section className="dashboard-section">
          <h2>My Courses</h2>
          {loading ? (
            <p className="courses-status">Loading…</p>
          ) : myCourses.filter((c) => !c.completed).length === 0 ? (
            <p className="courses-status">
              {myCourses.length > 0
                ? 'All of your courses are completed — well done!'
                : <>You don&apos;t have access to any courses yet. <Link to="/courses">Browse courses</Link> to get started.</>}
            </p>
          ) : (
            <div className="dash-course-grid">
              {myCourses.filter((c) => !c.completed).map((c) => (
                <DashboardCourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </section>

        {!loading && myCourses.some((c) => c.completed) && (
          <section className="dashboard-section">
            <h2>Courses Completed</h2>
            <div className="dash-course-grid">
              {myCourses.filter((c) => c.completed).map((c) => (
                <DashboardCourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <h2>My Profile</h2>
          {loading ? (
            <p className="courses-status">Loading…</p>
          ) : (
            <div className="dash-profile-card">
              <div className="dash-profile-row">
                <span>Name</span>
                <strong>{profile?.name || user.name}</strong>
              </div>
              <div className="dash-profile-row">
                <span>Email</span>
                <strong>{profile?.email || user.email}</strong>
              </div>
              <div className="dash-profile-row">
                <span>Member since</span>
                <strong>{formatDate(profile?.created_at)}</strong>
              </div>
              <div className="dash-profile-row">
                <span>Payment method</span>
                <strong>{profile?.payment_method || '—'}</strong>
              </div>
              <div className="dash-profile-row">
                <span>Password</span>
                <strong>
                  ••••••••{' '}
                  <button type="button" className="dash-profile-link" onClick={sendPasswordReset} disabled={resetSent}>
                    {resetSent ? 'Reset link sent — check your email' : 'Change password'}
                  </button>
                </strong>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>My Subscriptions</h2>
          {hasStripeBilling && (
            <p className="dashboard-billing-row">
              <button className="journey-button" type="button" onClick={openBillingPortal} disabled={portalLoading}>
                {portalLoading ? 'Opening…' : 'Manage Billing'}
              </button>
              {portalError && <span className="courses-error"> {portalError}</span>}
            </p>
          )}
          {loading ? (
            <p className="courses-status">Loading…</p>
          ) : subs.length === 0 ? (
            <p className="courses-status">You have no subscriptions.</p>
          ) : (
            <div className="admin-enrollment-table-wrap">
              <table className="admin-enrollment-table">
                <thead>
                  <tr><th>Course</th><th>Status</th><th>Amount</th><th>Started</th><th>Next Payment</th></tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.course_slug ? <Link to={`/courses/${s.course_slug}`}>{s.course_title}</Link> : (s.course_title || '—')}</td>
                      <td><span className={`sub-status sub-${s.status}`}>{s.status}</span></td>
                      <td>{s.total != null ? money(s.total) : '—'}{s.billing_period ? ` / ${s.billing_period}` : ''}</td>
                      <td>{formatDate(s.start_at)}</td>
                      <td>{formatDate(s.next_payment_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Purchase History</h2>
          {loading ? (
            <p className="courses-status">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="courses-status">You have no past orders.</p>
          ) : (
            <div className="admin-enrollment-table-wrap">
              <table className="admin-enrollment-table">
                <thead>
                  <tr><th>Order</th><th>Items</th><th>Status</th><th>Total</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.wp_order_id || o.id}</td>
                      <td>{(o.items || []).map((it) => it.name).filter(Boolean).join(', ') || '—'}</td>
                      <td><span className={`sub-status sub-${o.status}`}>{o.status}</span></td>
                      <td>{money(o.total, o.currency)}</td>
                      <td>{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
