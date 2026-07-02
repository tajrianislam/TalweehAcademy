import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { extractVideoId } from '../utils/youtube'

function formatArticleDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getArticleEmbedUrl(url) {
  const videoId = extractVideoId(url)
  if (!videoId) return null

  const params = new URLSearchParams({
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
  })

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch(`/api/articles/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Article not found')))
      .then((data) => setArticle(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [slug])

  const embedUrl = getArticleEmbedUrl(article?.youtubeUrl)

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        {loading && <p className="courses-status">Loading article…</p>}

        {error && (
          <section className="article-detail-shell">
            <p className="courses-status courses-error">{error}</p>
            <p><Link to="/articles">Back to Articles</Link></p>
          </section>
        )}

        {article && (
          <article className="article-detail-shell">
            <nav className="article-breadcrumb">
              <Link to="/">Home</Link>
              <span>|</span>
              <Link to="/articles">Articles</Link>
              <span>|</span>
              <span>{article.category}</span>
            </nav>

            <header className="article-detail-header">
              <h1>{article.title}</h1>
              <div className="article-meta">
                <span>{formatArticleDate(article.publishedAt)}</span>
                <span>{article.readTime}</span>
              </div>
            </header>

            {article.imageUrl && (
              <img className="article-detail-image" src={article.imageUrl} alt={article.title} />
            )}

            {embedUrl && (
              <div className="article-video-wrapper">
                <iframe
                  src={embedUrl}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}

            <div className="article-detail-content">
              {article.content?.map((block, index) => {
                const key = `${block.type}-${index}`
                if (block.type === 'heading') return <h2 key={key}>{block.text}</h2>
                if (block.type === 'subheading') return <h3 key={key}>{block.text}</h3>
                if (block.type === 'video') {
                  const blockEmbedUrl = getArticleEmbedUrl(block.url)
                  if (!blockEmbedUrl) return null
                  return (
                    <div className="article-video-wrapper inline" key={key}>
                      <iframe
                        src={blockEmbedUrl}
                        title={block.title || article.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )
                }
                return <p key={key}>{block.text}</p>
              })}
            </div>
          </article>
        )}
      </main>
      <PageFooter />
    </div>
  )
}
