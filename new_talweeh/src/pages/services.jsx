import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/services')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to fetch services')))
      .then(setServices)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Services" />

        <section className="services-archive">
          {loading && <p className="courses-status">Loading services...</p>}
          {error && <p className="courses-status courses-error">{error}</p>}
          {!loading && !error && services.length === 0 && (
            <p className="courses-status">No services found.</p>
          )}

          {services.map((service) => (
            <article key={service.id} className="service-post-card">
              <Link to={`/services/${service.slug}`} className="service-post-thumb">
                {service.thumbnailUrl
                  ? <img src={service.thumbnailUrl} alt={service.title} />
                  : <div className="course-art-placeholder" />}
              </Link>
              <div className="service-post-body">
                <h1>
                  <Link to={`/services/${service.slug}`}>{service.title}</Link>
                </h1>
                <div className="article-meta">
                  {service.publishedAt && <span>{formatDate(service.publishedAt)}</span>}
                </div>
                {service.excerpt && <p>{service.excerpt}</p>}
                <Link className="service-read-more" to={`/services/${service.slug}`}>
                  Read More.....
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
