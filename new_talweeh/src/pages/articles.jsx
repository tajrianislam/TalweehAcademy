import { useState } from 'react'
import { PageHeader, PageHero, PageFooter } from './_shared'

const ASSET = 'https://talweehacademy.com/wp-content/uploads'
const THUMBS = `${ASSET}/elementor/thumbs`

const allArticles = [
  {
    title: 'Taḥsīn & Taqbīḥ: Reason, Revelation, and the Foundations of Islamic Morality',
    date: 'January 8, 2026',
    readTime: '6 Minutes',
    excerpt: '',
    category: 'Uncategorized',
    image: `${THUMBS}/Hanafi-Uṣul-al-Fiqh-Level-01-rfkd0r9y5ilfd0ttgant6ouyfvlk6r5plneiw5s4d0.webp`,
    href: 'https://talweehacademy.com/ta%e1%b8%a5sin-taqbi%e1%b8%a5-reason-revelation-and-the-foundations-of-islamic-morality/',
  },
  {
    title: 'The Legacy of Mukhtasar al-Qudūrī',
    date: 'October 30, 2025',
    readTime: '8 Minutes',
    excerpt:
      'In this section, we will cover the century-long legacy of the Mukhtaṣar, discovering the most famous works that stem from it.',
    category: 'Scholars and Texts',
    image: `${THUMBS}/Mukhtasar-al-Quduri-Qism-al-'Ibadat-rcs7czgj7h0kpq1tbeg1jpxpnfvere6fkmiz194mxg.webp`,
    href: 'https://talweehacademy.com/the-legacy-of-mukhtasar-al-quduri/',
  },
  {
    title: 'The Nature of Islamic Finance',
    date: 'October 11, 2024',
    readTime: '18 Minutes',
    excerpt:
      "Islamic jurisprudence has demonstrated over the centuries its ability to adapt to any time or place, meet any challenge, and overcome any obstacle. This is because it is rooted within principles derived from the Qur'an",
    category: 'Islamic Finance',
    image: `${THUMBS}/A-Critical-Study-of-Uṣul-al-Sashi-rldq5z4guash9wdooaungoskz8zl373t06rgnrdst0.webp`,
    href: 'https://talweehacademy.com/the-nature-of-islamic-finance/',
  },
]

const categories = ['All', 'Islamic Finance', 'Scholars and Texts', 'Uncategorized']

export default function ArticlesPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered =
    activeCategory === 'All'
      ? allArticles
      : allArticles.filter((a) => a.category === activeCategory)

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

          {filtered.map((article) => (
            <article key={article.title} className="service-post-card">
              <a href={article.href} className="service-post-thumb" target="_blank" rel="noreferrer">
                <img src={article.image} alt={article.title} />
              </a>
              <div className="service-post-body">
                <h1>
                  <a href={article.href} target="_blank" rel="noreferrer">
                    {article.title}
                  </a>
                </h1>
                <div className="article-meta">
                  <a href={article.href} target="_blank" rel="noreferrer">{article.date}</a>
                  <a href={article.href} target="_blank" rel="noreferrer">{article.readTime}</a>
                </div>
                {article.excerpt && <p>{article.excerpt}</p>}
                <a className="service-read-more" href={article.href} target="_blank" rel="noreferrer">
                  Read More.....
                </a>
              </div>
            </article>
          ))}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
