import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'

function formatArticleDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ArticlesPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to fetch articles')))
      .then((data) => setArticles(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean)))]

  const filtered =
    activeCategory === 'All'
      ? articles
      : articles.filter((a) => a.category === activeCategory)

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Articles" />

        <section className="services-archive">
          <div className="articles-filter-bar">
            <h6>Filter Articles</h6>
            <div className="articles-filter-buttons">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={activeCategory === cat ? 'active' : ''}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              className="articles-filter-select"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              aria-label="Filter by category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {loading && <p className="courses-status">Loading articles...</p>}
          {error && <p className="courses-status courses-error">{error}</p>}

          {filtered.map((article) => (
            <article key={article.title} className="service-post-card">
              <Link to={`/articles/${article.slug}`} className="service-post-thumb">
                <img src={article.imageUrl} alt={article.title} />
              </Link>
              <div className="service-post-body">
                <h1>
                  <Link to={`/articles/${article.slug}`}>
                    {article.title}
                  </Link>
                </h1>
                <div className="article-meta">
                  <Link to={`/articles/${article.slug}`}>{formatArticleDate(article.publishedAt)}</Link>
                  <Link to={`/articles/${article.slug}`}>{article.readTime}</Link>
                </div>
                {article.excerpt && <p>{article.excerpt}</p>}
                <Link className="service-read-more" to={`/articles/${article.slug}`}>
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
