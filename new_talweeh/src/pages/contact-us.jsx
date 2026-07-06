/* eslint-disable react/prop-types */
import { useState } from 'react'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useContent } from '../hooks/useContent'
import { Editable } from '../components/ContentEditor'

function ContactIcon({ type }) {
  if (type === 'telegram') {
    return (
      <svg className="contact-card-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 3L2 10.5l5.5 2L9 19l3-3.5 5.5 4L22 3zM9.5 13.5L18 6l-7 8.5-.5 3-1-4z" />
      </svg>
    )
  }
  if (type === 'email') {
    return (
      <svg className="contact-card-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 5h20v14H2V5zm2 2.4V17h16V7.4l-8 5.3-8-5.3zM19.2 7H4.8L12 11.8 19.2 7z" />
      </svg>
    )
  }
  return (
    <svg className="contact-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3h16v18H4V3zm2 2v14h12V5H6zm2 3h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  )
}

export default function ContactUsPage() {
  const { content: c } = useContent('contact')
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Contact Us" />

        <section className="contact-page">
          {/* Info cards */}
          <div className="contact-info-cards">
            <Editable page="contact" sectionKey="telegram">
              <div className="contact-info-card">
                <ContactIcon type="telegram" />
                <h3>{c.telegram.heading}</h3>
                <p>
                  {c.telegram.prefix}{' '}
                  <a href={c.telegram.url} target="_blank" rel="noreferrer">
                    {c.telegram.url}
                  </a>{' '}
                  {c.telegram.suffix}
                </p>
              </div>
            </Editable>

            <Editable page="contact" sectionKey="email">
              <div className="contact-info-card">
                <ContactIcon type="email" />
                <h3>{c.email.heading}</h3>
                <p>
                  {c.email.prefix}{' '}
                  <a href={`mailto:${c.email.address}`}>{c.email.address}</a>{' '}
                  {c.email.suffix}
                </p>
              </div>
            </Editable>

            <Editable page="contact" sectionKey="formCard">
              <div className="contact-info-card">
                <ContactIcon type="form" />
                <h3>{c.formCard.heading}</h3>
                <p>{c.formCard.text}</p>
              </div>
            </Editable>
          </div>

          {/* Form */}
          <div className="contact-form-wrap">
            {submitted ? (
              <div className="contact-success">
                <h3>Thank you!</h3>
                <p>We&apos;ve received your message and will get back to you as soon as possible.</p>
                <button
                  type="button"
                  className="outline-btn-green"
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '' }) }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    placeholder="Message"
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                {error && <p className="admin-msg error">{error}</p>}
                <button type="submit" className="journey-button" disabled={saving}>
                  {saving ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
