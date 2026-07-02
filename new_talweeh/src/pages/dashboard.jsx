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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetch('/api/me/orders', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/me/subscriptions', { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([o, s]) => { setOrders(o); setSubs(s) })
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="My Dashboard" />

        <section className="dashboard-section">
          <h2>My Subscriptions</h2>
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
