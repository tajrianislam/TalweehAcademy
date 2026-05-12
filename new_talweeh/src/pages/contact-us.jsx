import { useState } from 'react'
import { PageHeader, PageHero, PageFooter } from './_shared'

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Contact Us" />

        <section className="contact-page">
          {/* Info cards */}
          <div className="contact-info-cards">
            <div className="contact-info-card">
              <h3>Follow us via Telegram</h3>
              <p>
                Follow us on{' '}
                <a href="https://t.me/TalweehAcademy" target="_blank" rel="noreferrer">
                  https://t.me/TalweehAcademy
                </a>{' '}
                for updates.
              </p>
            </div>

            <div className="contact-info-card">
              <h3>Contact us via Email</h3>
              <p>
                Contact us on{' '}
                <a href="mailto:info@talweehacademy.com">info@talweehacademy.com</a>{' '}
                for any queries.
              </p>
            </div>

            <div className="contact-info-card">
              <h3>Contact us via Form</h3>
              <p>Fill out the form below and we will get back to you as soon as possible.</p>
            </div>
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

                <button type="submit" className="journey-button">
                  Send
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
