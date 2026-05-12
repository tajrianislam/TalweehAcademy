import { PageHeader, PageHero, PageFooter } from './_shared'

const ASSET = 'https://talweehacademy.com/wp-content/uploads'
const THUMBS = `${ASSET}/elementor/thumbs`

const services = [
  {
    title: 'Advanced Hadith Studies in Mishkāt al-Maṣābīḥ',
    date: 'April 29, 2026',
    readTime: '2 Minutes',
    excerpt: '',
    image: `${THUMBS}/The-science-of-Jarḥ-wa-Taʿdil-rldpxb21taxa7cyzajyigvjjrbpq3oox5a69bw8i6s.webp`,
    href: 'https://talweehacademy.com/our-service/advanced-hadith-studies-in-mishkat-al-masabih/',
  },
  {
    title: '📚 Monday Night Readings',
    date: 'April 1, 2026',
    readTime: '1 Minutes',
    excerpt:
      "Join us on Zoom for weekly readings from Siyar A'lām al-Nubalā', the renowned work chronicling the lives of the great scholars and exemplary figures of Islam. These gatherings offer an opportunity to reflect on their",
    image: `${THUMBS}/Monday-Night-Readings-rldoxpw1247gmuny3o60kcua354fo8erx4zg7r03ro.webp`,
    href: 'https://talweehacademy.com/our-service/%f0%9f%93%9a-monday-night-readings/',
  },
]

export default function ServicesPage() {
  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Services" />

        <section className="services-archive">
          {services.map((service) => (
            <article key={service.title} className="service-post-card">
              <a href={service.href} className="service-post-thumb" target="_blank" rel="noreferrer">
                <img src={service.image} alt={service.title} />
              </a>
              <div className="service-post-body">
                <h1>
                  <a href={service.href} target="_blank" rel="noreferrer">
                    {service.title}
                  </a>
                </h1>
                <div className="article-meta">
                  <a href={service.href} target="_blank" rel="noreferrer">{service.date}</a>
                  <a href={service.href} target="_blank" rel="noreferrer">{service.readTime}</a>
                </div>
                {service.excerpt && <p>{service.excerpt}</p>}
                <a className="service-read-more" href={service.href} target="_blank" rel="noreferrer">
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
