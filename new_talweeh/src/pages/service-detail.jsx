import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ServiceDetailPage() {
  const { slug } = useParams()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/services/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Service not found')))
      .then(setService)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        {loading && <p className="courses-status">Loading service…</p>}

        {error && (
          <section className="article-detail-shell">
            <p className="courses-status courses-error">{error}</p>
            <p><Link to="/services">Back to Services</Link></p>
          </section>
        )}

        {service && (
          <article className="article-detail-shell">
            <nav className="article-breadcrumb">
              <Link to="/">Home</Link>
              <span>|</span>
              <Link to="/services">Services</Link>
              <span>|</span>
              <span>{service.title}</span>
            </nav>

            <header className="article-detail-header">
              <h1>{service.title}</h1>
              {service.publishedAt && (
                <div className="article-meta"><span>{formatDate(service.publishedAt)}</span></div>
              )}
            </header>

            {service.thumbnailUrl && (
              <img className="article-detail-image" src={service.thumbnailUrl} alt={service.title} />
            )}

            <div className="article-detail-content">
              {(service.body || '').split(/\n{2,}/).filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {!service.body && <p>No details available.</p>}
            </div>
          </article>
        )}
      </main>
      <PageFooter />
    </div>
  )
}
