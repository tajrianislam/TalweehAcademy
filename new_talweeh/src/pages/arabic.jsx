/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import VideoFacade from '../components/VideoFacade'
import { ASSET } from '../constants/assets'

// Content migrated from talweeharabic.com (the owner's Arabic-program site) —
// media is hotlinked from that site's own uploads.
const TA = 'https://talweeharabic.com/wp-content/uploads'
const PROGRAM_URL = 'https://talweeharabic.com/2-years-arabic-program/'
const MEMBERSHIP_URL = 'https://talweeharabic.com/membership-pricing/'
const TELEGRAM_URL = 'https://t.me/TalweehAcademy'

const WELCOME_VIDEO = {
  src: 'https://youtu.be/l0KZW4zK6JM',
  thumbnail: `${TA}/2026/03/Welcome-to-Talweeh-Arabic-logo.webp`,
}

const MODULES = [
  {
    n: 1,
    duration: '3 months',
    text: 'Module 1 marks the student’s formal entry into structured Arabic study. Over three months, it lays firm foundations through a detailed and systematic overview of the language. Students explore words, phrases, and sentence structures while being introduced to the core sciences of Ṣarf and Naḥw. Lessons are supported by applied exercises and carefully selected examples from the Qur’an, ensuring that theory is immediately practiced. Technical terminology and analytical habits are gradually developed. By the end of the module, students possess the essential tools required for structured reading and are fully prepared to begin studying complete Arabic texts in Module 2.',
  },
  {
    n: 2,
    duration: '6 months',
    text: 'Module 2 marks a substantial advancement in the student’s Arabic journey. Over six months, previously learned theory is brought to life through Qaṣaṣ al-Nabiyyīn, which serves as the practical backbone of the module. Students expand Qurʾānic vocabulary and master systematic tarkīb, progressing to accurate iʿrāb and detailed sentence analysis. Alongside applied reading, further concepts in Naḥw and Ṣarf are introduced through Abū Ḥayyān’s Al-Shadharat al-Dhahabiyyah and the morphology manual Binā al-Afʿāl. Each concept is immediately reinforced within the narratives, ensuring constant integration between theory and text. By completion, students demonstrate measurable growth in fluency, structure recognition, and analytical confidence.',
  },
  {
    n: 3,
    duration: '3 months',
    text: 'Module 3 marks the transition to the intermediate stage, cultivating independence in reading and analysis. Over three months, students engage in structured study combining applied grammar, refined morphology, ethics literature, and poetry. The central text, Min Ādāb al-Islām, provides sustained reading practice, training students to read and translate unvowelled texts with confidence. Grammar advances through Al-Tuḥfat al-Saniyyah with strong emphasis on application, while poetry is introduced through Tā’iyyat al-Ilbīrī. The ṣarf manual Taṣrīf al-ʿIzzī strengthens mastery of verb patterns and derivatives. Students emerge capable of approaching intermediate classical texts with analytical clarity and consistency.',
  },
  {
    n: 4,
    duration: '5 months',
    text: 'Module 4 ushers students into advanced grammatical and literary study. Across five months, Mutammimah al-Ājurrūmiyyah deepens mastery of expanded Nahw discussions, variant grammatical views, and complex syntactic structures. Students refine evaluative skills, distinguishing stronger positions within classical debates. Ṣarf is expanded through Sawāṭiʿ al-Jumān, strengthening morphological precision and recognition of advanced forms. Literary analysis is cultivated through Lāmiyyat Abī Ṭālib, where poetic language, structure, and thematic depth are examined alongside detailed parsing. By the end of the module, students are prepared for linguistic Tafsīr, higher Balāghah, and independent engagement with sophisticated classical works.',
  },
  {
    n: 5,
    duration: 'Final stage',
    text: 'Module 5 represents the crux and culmination of all prior study. Grammar, morphology, and analysis now converge in direct academic engagement with the Qur’an. Al-Iʿrāb ʿan Qawāʿid al-Iʿrāb refines methodological parsing, training students to evaluate syntactic possibilities and understand how iʿrāb shapes tafsīr and translation. Then comes Linguistic Tafsīr of Juzʾ ʿAmma, engaging Ibn ʿĀshūr, Abū Ḥayyān, and Abū Suʿūd. Students encounter multiple tafāsīr, translations, and rhetorical nuances, learning to translate the Qur’an while grasping meanings beyond translation. Rhetorical insights are later gathered in Balāghah 101, and Intro to the Islamic Sciences opens pathways for further scholarly study.',
  },
]

const TESTIMONIALS = [
  { name: 'Mustafa Haq', location: 'USA', src: 'https://www.youtube.com/watch?v=3h37hfGTRDk', thumbnail: `${TA}/2026/02/Mustafa-Haq-USA.webp` },
  { name: 'Nawid Ibrahim', location: 'Netherlands', src: 'https://www.youtube.com/watch?v=_47XnzMtcdk', thumbnail: `${TA}/2026/02/Nawid-Ibrahim-Netherlands.webp` },
  { name: 'Talha', location: 'USA', src: 'https://www.youtube.com/watch?v=PnHG4Lg5Xic', thumbnail: `${TA}/2026/02/Talha-Vohra.webp` },
  { name: 'Muhammed Huseyin', location: 'Toronto', src: 'https://www.youtube.com/watch?v=7T31J90xwR4', thumbnail: `${TA}/2026/03/Muhammade-Hosein.webp` },
]

export default function ArabicPage() {
  const [activeModule, setActiveModule] = useState(1)
  const current = MODULES.find((m) => m.n === activeModule)

  return (
    <div className="page-shell arb-shell">
      <PageHeader />
      <main>
        {/* ── Hero ─────────────────────────────────── */}
        <section className="arb-hero">
          <img className="arb-hero-bismillah" src={`${TA}/2025/12/bismilla-e1755384561119-300.webp`} alt="" />
          <h1>Unlock the Language of the Qur’an Beyond Translation</h1>
          <div className="arb-hero-actions">
            <Link className="arb-btn-primary" to="/arabic/program">Explore Arabic Program</Link>
            <a className="arb-btn-secondary" href={MEMBERSHIP_URL} target="_blank" rel="noreferrer">Become a Member</a>
          </div>
          <nav className="arb-subnav" aria-label="Arabic program pages">
            <NavLink to="/arabic" end>Overview</NavLink>
            <NavLink to="/arabic/program">Full Program</NavLink>
            <NavLink to="/arabic/faq">FAQs</NavLink>
            <NavLink to="/arabic/about">About</NavLink>
          </nav>
          <div className="arb-welcome-video">
            <VideoFacade src={WELCOME_VIDEO.src} title="Welcome to Talweeh Arabic" thumbnail={WELCOME_VIDEO.thumbnail} />
          </div>
        </section>

        {/* ── Quranic verse ─────────────────────────── */}
        <section className="arb-verse">
          <p className="arb-verse-arabic" dir="rtl" lang="ar">إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا لَّعَلَّكُمْ تَعْقِلُونَ</p>
          <p className="arb-verse-translation">Indeed, We have sent it down as an Arabic Qur&apos;an that you might understand.</p>
          <p className="arb-verse-ref">Surah Yusuf 12:2</p>
        </section>

        {/* ── Curriculum ────────────────────────────── */}
        <section className="arb-curriculum" id="curriculum">
          <h2>Master the Sciences of the Arabic Language</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <p className="arb-curriculum-intro">
            At Talweeh Arabic, we have curated the most effective texts into a comprehensive two-year
            curriculum designed to guide you from beginner to advanced proficiency.
          </p>
          <div className="arb-module-tabs" role="tablist" aria-label="Curriculum modules">
            {MODULES.map((m) => (
              <button
                key={m.n}
                type="button"
                role="tab"
                aria-selected={activeModule === m.n}
                className={activeModule === m.n ? 'active' : ''}
                onClick={() => setActiveModule(m.n)}
              >
                Module {m.n}
              </button>
            ))}
          </div>
          <div className="arb-module-panel">
            <div className="arb-module-panel-head">
              <span className="arb-module-num">{current.n}</span>
              <div>
                <strong>Module {current.n}</strong>
                <span className="arb-module-duration">{current.duration}</span>
              </div>
            </div>
            <p>{current.text}</p>
            <Link className="arb-btn-outline" to="/arabic/program">Learn More</Link>
          </div>
        </section>

        {/* ── Journey split ─────────────────────────── */}
        <section className="arb-journey">
          <article className="arb-journey-card">
            <img src={`${TA}/2026/02/start-your-journey.webp`} alt="" loading="lazy" />
            <h3>Take your first devoted steps towards Arabic</h3>
            <p>Start your journey to embrace Arabic — take your first steps towards understanding the Quran.</p>
            <a className="arb-btn-primary" href={PROGRAM_URL} target="_blank" rel="noreferrer">Explore Arabic Program</a>
          </article>
          <article className="arb-journey-card">
            <img src={`${TA}/2026/02/talweeharabic_icon.webp`} alt="" loading="lazy" />
            <h3>Learning Arabic is just the beginning of your journey</h3>
            <p>Visit Talweeh Academy for further Islamic studies across the classical disciplines.</p>
            <Link className="arb-btn-primary" to="/courses">Browse Academy Courses</Link>
          </article>
        </section>

        {/* ── Testimonials ──────────────────────────── */}
        <section className="arb-testimonials">
          <h2>Testimonials</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="arb-testimonial-grid">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="arb-testimonial-card">
                <VideoFacade src={t.src} title={`${t.name} — student testimonial`} thumbnail={t.thumbnail} />
                <h4>{t.name}</h4>
                <span>{t.location}</span>
              </article>
            ))}
          </div>
        </section>

        {/* ── Join Talweeh Society ──────────────────── */}
        <section className="landing-join-society">
          <div className="join-society-inner">
            <div className="join-society-text">
              <h3>Join Talweeh Society</h3>
              <p>Join us as we share uplifting reminders and insights from various texts, along with access to our free weekly lessons.</p>
            </div>
            <a className="red-button" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              Join Us on Telegram
            </a>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
