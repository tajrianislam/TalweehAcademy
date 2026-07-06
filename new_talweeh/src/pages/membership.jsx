import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useAuth } from '../context/AuthContext'

// Talweeh Society membership — join via Stripe Checkout (subscription mode).
export default function MembershipPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [searchParams] = useSearchParams()
  const canceled = searchParams.get('canceled') === '1'
  const [config, setConfig] = useState(null)
  const [hasActive, setHasActive] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setConfig)
      .catch(() => setConfig({}))
  }, [])

  useEffect(() => {
    if (authLoading || !user) { setHasActive(false); return }
    fetch('/api/me/subscriptions', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((subs) => setHasActive(subs.some((s) => ['active', 'trialing'].includes(s.status))))
      .catch(() => setHasActive(false))
  }, [authLoading, user])

  async function handleJoin() {
    if (!user) {
      openAuthModal('login')
      return
    }
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'membership' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.assign(data.url)
    } catch (e) {
      setError(e.message)
      setJoining(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Talweeh Society" />
        <section className="dashboard-section membership-section">
          <p className="courses-status">
            Join Talweeh Society for access to members-only courses, uplifting reminders,
            and our free weekly lessons — a monthly membership supporting sacred knowledge.
          </p>
          {canceled && (
            <p className="courses-status">Checkout was canceled — you have not been charged.</p>
          )}
          {hasActive ? (
            <>
              <p className="courses-status">Your membership is active. Thank you for your support!</p>
              <p className="status-back-link"><Link to="/dashboard">Manage it from your dashboard</Link></p>
            </>
          ) : config && config.membership_enabled ? (
            <>
              <button
                className="journey-button course-enroll-btn"
                type="button"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? 'Redirecting…' : user ? 'Join Talweeh Society' : 'Sign in to Join'}
              </button>
              {error && <p className="courses-status courses-error">{error}</p>}
            </>
          ) : (
            <p className="courses-status">
              Online membership signup is opening soon. <Link to="/contact-us">Contact us</Link> to join.
            </p>
          )}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
