import { PageHeader, PageHero, PageFooter } from './_shared'

const ASSET = 'https://talweehacademy.com/wp-content/uploads'

const highlights = [
  {
    title: 'Quality Teachers',
    description: 'Selecting teachers of piety and moral character who are sincere and devout',
  },
  {
    title: '400+ Hours of Deliverables',
    description: 'More than 400 hours of video lessons on demand.',
  },
  {
    title: 'Talweeh Society',
    description: 'Get access to our free courses and weekly lessons',
  },
  {
    title: 'Authorized Instructors',
    description: 'Expert instructors available for your online questions and support',
  },
]

const subjects = [
  'Naḥw (grammar)',
  'Ṣarf (morphology)',
  'Balāghah (rhetoric)',
  'Mantiq (logic)',
  'Tafsīr (exegesis)',
  'Uṣūl al-Ḥadīth (foundations of ḥadīth)',
  'Uṣūl al-Fiqh (foundations of jurisprudence)',
  'Fiqh (Islamic jurisprudence)',
  'Arabic for beginners',
]

export default function AboutUsPage() {
  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="About Us" />

        {/* What is Talweeh Academy */}
        <section className="about-intro-section">
          <div className="about-intro-content">
            <h2>What is Talweeh Academy?</h2>
            <p>
              Talweeh Academy is an institution dedicated to reviving Islamic academia in the West.
              Our mission is to help seekers of knowledge engage deeply with the rich legacy of
              Islamic scholarship. We achieve this by offering a carefully designed syllabus
              featuring robust, content-rich courses that delve into essential concepts within every
              Islamic science.
            </p>
            <p>
              Our courses are taught by highly qualified instructors who have years of training and
              experience in their respective fields. These instructors bring thorough research and
              expertise, ensuring that each student receives an authentic and comprehensive
              education. Our comprehensive curriculum encompasses a wide range of subjects,
              including:
            </p>
            <ol className="about-subjects-list">
              {subjects.map((s) => (
                <li key={s}><strong>{s.split(' (')[0]}</strong>{s.includes('(') ? ` (${s.split('(')[1]}` : ''}</li>
              ))}
            </ol>
          </div>
        </section>

        {/* Things that make us proud */}
        <section className="about-proud-section">
          <div className="about-proud-inner">
            <h2>Things that make us proud</h2>
            <h3>Choose your learning level</h3>
            <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <div className="about-highlights-grid">
              {highlights.map((h) => (
                <div key={h.title} className="about-highlight-card">
                  <h4>{h.title}</h4>
                  <p>{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Vision */}
        <section className="about-text-section">
          <div className="about-text-inner">
            <h2>The Vision of Talweeh Academy</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              Our academy was established with a bold vision: elevating the academic excellence of
              Islamic scholarship across all disciplines. We strive to bridge existing gaps and
              provide students with a superior educational experience that meets their highest
              expectations, enabling them to access a higher level of Islamic academia and creating
              an environment where knowledge can flourish!
            </p>
          </div>
        </section>

        {/* Qualified Guidance */}
        <section className="about-text-section about-text-section--alt">
          <div className="about-text-inner">
            <h2>Qualified Guidance</h2>
            <h3>Instructors Holding Ijāzāt (traditional authorization)</h3>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              Under the guidance of qualified scholars and experts in their respective fields, we
              ensure that each course is delivered with clarity, depth, and relevance to both
              contemporary and classical knowledge. Our esteemed instructors have undertaken
              rigorous scholarly journeys, acquiring authorization from distinguished scholars
              across the globe, and securing certifications in multiple areas, including Quranic
              recitation, Hadith studies, and Islamic sciences.
            </p>
          </div>
        </section>

        {/* Invitation to Join */}
        <section className="about-text-section">
          <div className="about-text-inner">
            <h2>Invitation to Join Us</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              We warmly invite you to join us on this enriching journey of knowledge and growth.
              Together, we will raise the bar for Islamic education, benefiting individuals and
              communities alike. Through our collaborative efforts, we hope to cultivate a
              generation of informed, engaged, and empowered individuals who can contribute
              positively to society.
            </p>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section className="about-text-section about-text-section--alt">
          <div className="about-text-inner">
            <h2>Terms &amp; Conditions</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <a
              className="outline-btn-green"
              href="https://talweehacademy.com/terms-conditions/"
              target="_blank"
              rel="noreferrer"
            >
              Read Now
            </a>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
