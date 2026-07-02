/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/

export default function AuthModal({ open, initialTab = 'login', onClose }) {
  const { login, register, requestPasswordReset } = useAuth()
  const [tab, setTab] = useState(initialTab)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    setTab(initialTab)
    setError(null)
    setForm(EMPTY_FORM)
    setForgotSent(false)
  }, [open, initialTab])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function switchTab(t) {
    setTab(t)
    setError(null)
    setForgotSent(false)
    setForm(EMPTY_FORM)
  }

  function validate() {
    if (tab === 'register') {
      if (!form.first_name.trim()) return 'First name is required.'
      if (form.first_name.trim().length < 2) return 'First name must be at least 2 characters.'
      if (!form.last_name.trim()) return 'Last name is required.'
      if (form.last_name.trim().length < 2) return 'Last name must be at least 2 characters.'
      if (!form.username.trim()) return 'Username is required.'
      if (!USERNAME_REGEX.test(form.username.trim())) {
        return 'Username must be 3–30 characters: letters, numbers, underscores, or dots only.'
      }
      if (!form.email.trim()) return 'Email is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.'
      if (!form.password) return 'Password is required.'
      if (form.password.length < 8) return 'Password must be at least 8 characters.'
      if (form.password !== form.password_confirmation) return 'Passwords do not match.'
      return null
    }
    if (tab === 'login') {
      if (!form.username.trim()) return 'Username is required.'
      if (!form.password) return 'Password is required.'
      return null
    }
    if (tab === 'forgot') {
      if (!form.email.trim()) return 'Email is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email address.'
      return null
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (tab === 'login') {
        await login(form.username.trim(), form.password)
        onClose()
      } else if (tab === 'register') {
        await register({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation: form.password_confirmation,
        })
        onClose()
      } else if (tab === 'forgot') {
        await requestPasswordReset(form.email.trim())
        setForgotSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {tab !== 'forgot' && (
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`modal-tab${tab === 'register' ? ' active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Register
            </button>
          </div>
        )}

        {tab === 'forgot' ? (
          forgotSent ? (
            <div className="modal-forgot-sent">
              <div className="modal-forgot-icon">✉</div>
              <h3>Check your email</h3>
              <p>
                If an account exists for <strong>{form.email.trim()}</strong>, a
                password reset link has been sent. The link expires in 60 minutes.
              </p>
              <button
                type="button"
                className="outline-btn-green"
                onClick={() => switchTab('login')}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div className="modal-forgot-header">
                <h3>Forgot your password?</h3>
                <p>Enter your email address and we&apos;ll send you a reset link.</p>
              </div>
              <form className="modal-form" onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <label htmlFor="auth-forgot-email">Email</label>
                  <input
                    id="auth-forgot-email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
                {error && <p className="modal-error">{error}</p>}
                <button type="submit" className="journey-button" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="modal-switch">
                <button type="button" onClick={() => switchTab('login')}>← Back to Login</button>
              </p>
            </>
          )
        ) : (
          <>
            <form className="modal-form" onSubmit={handleSubmit} noValidate>

              {/* ── Register-only fields ── */}
              {tab === 'register' && (
                <>
                  <div className="form-row-half">
                    <div className="form-row">
                      <label htmlFor="auth-first-name">First Name</label>
                      <input
                        id="auth-first-name"
                        name="first_name"
                        type="text"
                        placeholder="First Name"
                        value={form.first_name}
                        onChange={handleChange}
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="form-row">
                      <label htmlFor="auth-last-name">Last Name</label>
                      <input
                        id="auth-last-name"
                        name="last_name"
                        type="text"
                        placeholder="Last Name"
                        value={form.last_name}
                        onChange={handleChange}
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── Username (login + register) ── */}
              <div className="form-row">
                <label htmlFor="auth-username">Username or email</label>
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  placeholder="User Name"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>

              {/* ── Register-only: email ── */}
              {tab === 'register' && (
                <div className="form-row">
                  <label htmlFor="auth-email">E-Mail</label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    placeholder="E-Mail"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              )}

              {/* ── Password ── */}
              <div className="form-row">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  placeholder={tab === 'register' ? 'At least 8 characters' : 'Password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {/* ── Register-only: password confirmation ── */}
              {tab === 'register' && (
                <div className="form-row">
                  <label htmlFor="auth-password-confirm">Password Confirmation</label>
                  <input
                    id="auth-password-confirm"
                    name="password_confirmation"
                    type="password"
                    placeholder="Password Confirmation"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}

              {tab === 'login' && (
                <div className="modal-forgot-link-row">
                  <button type="button" onClick={() => switchTab('forgot')}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <p className="modal-error">{error}</p>}

              <button type="submit" className="journey-button" disabled={submitting}>
                {submitting ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <p className="modal-switch">
              {tab === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => switchTab('register')}>Register</button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchTab('login')}>Login</button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
