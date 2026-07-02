import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'

export default function GenericPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/pages/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Page not found')))
      .then(setPage)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title={page?.title || 'Page'} />
        <section className="static-page">
          {loading && <p className="courses-status">Loading…</p>}
          {error && (
            <>
              <p className="courses-status courses-error">{error}</p>
              <p className="status-back-link"><Link to="/">← Back home</Link></p>
            </>
          )}
          {page && (
            <div
              className="static-page-content"
              // Content is admin/migration-controlled WordPress markup.
              dangerouslySetInnerHTML={{ __html: page.contentHtml || '' }}
            />
          )}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
