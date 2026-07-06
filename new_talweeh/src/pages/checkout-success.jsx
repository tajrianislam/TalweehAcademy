import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useAuth } from '../context/AuthContext'

// Landing page after Stripe Checkout. Confirms payment via the server (which
// also runs idempotent fulfillment in case the redirect beat the webhook) and
// polls briefly while the payment is still processing.
export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { user, loading: authLoading } = useAuth()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const attempts = useRef(0)

  useEffect(() => {
    if (authLoading || !sessionId) return
    if (!user) { setError('Please sign in to view your order confirmation.'); return }

    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`/api/checkout/session/${sessionId}`, { credentials: 'include' })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Could not confirm your payment')
        if (data.payment_status === 'paid' || attempts.current >= 5) {
          setSession(data)
        } else {
          attempts.current += 1
          setTimeout(check, 2000)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }
    check()
    return () => { cancelled = true }
  }, [authLoading, user, sessionId])

  const paid = session?.payment_status === 'paid'

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title={paid ? 'Thank You!' : 'Order Status'} />
        <section className="dashboard-section checkout-success-section">
          {!sessionId ? (
            <p className="courses-status courses-error">Missing checkout session.</p>
          ) : error ? (
            <p className="courses-status courses-error">{error}</p>
          ) : !session ? (
            <p className="courses-status">Confirming your payment…</p>
          ) : paid ? (
            <>
              <p className="courses-status">
                Your payment of <strong>{session.amount_total.toFixed(2)} {session.currency}</strong>
                {session.item_name ? <> for <strong>{session.item_name}</strong></> : null} was successful.
                A receipt has been emailed to you.
              </p>
              <p className="courses-status">
                {session.kind === 'membership'
                  ? 'Your Talweeh Society membership is now active.'
                  : 'You now have full access to your course.'}
              </p>
              <p className="status-back-link">
                <Link to="/dashboard">Go to My Dashboard</Link>
                {' · '}
                <Link to="/courses">Browse Courses</Link>
              </p>
            </>
          ) : (
            <p className="courses-status">
              Your payment is still processing. You&rsquo;ll receive an email once it completes —
              check <Link to="/dashboard">your dashboard</Link> in a few minutes.
            </p>
          )}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
