import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const { resetPassword, openAuthModal } = useAuth()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('No reset token found. Please request a new password reset link.')
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.')
    }
    if (password !== confirm) {
      return setError('Passwords do not match.')
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rp-page">
      <div className="rp-card">
        <Link to="/" className="rp-logo">Talweeh Academy</Link>

        {success ? (
          <div className="rp-success">
            <div className="rp-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 12.5l3.5 3.5 6-7" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Password updated!</h2>
            <p>Your password has been changed. You can now log in with your new password.</p>
            <button
              type="button"
              className="rp-submit-btn"
              onClick={() => openAuthModal('login')}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <h2 className="rp-title">Set a new password</h2>
            <p className="rp-subtitle">Choose a strong password for your account.</p>
            <form className="rp-form" onSubmit={handleSubmit} noValidate>
              <div className="rp-field">
                <label htmlFor="rp-password">New password</label>
                <input
                  id="rp-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>
              <div className="rp-field">
                <label htmlFor="rp-confirm">Confirm password</label>
                <input
                  id="rp-confirm"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>
              {error && <p className="rp-error">{error}</p>}
              <button
                type="submit"
                className="rp-submit-btn"
                disabled={submitting || !token}
              >
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>
            <p className="rp-back">
              <Link to="/" onClick={() => openAuthModal('login')}>← Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
