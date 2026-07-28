/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import VideoFacade from '../components/VideoFacade'
import { ASSET } from '../constants/assets'
import {
  ARABIC_LINKS, PROGRAM_HERO, LEARNING_OBJECTIVES_INTRO, LEARNING_OBJECTIVES,
  PROGRAM_MODULES, PROGRAM_CALENDAR_TEXT, PROGRAM_FACTS, PROGRAM_INVITATION,
} from '../content/arabicProgram'

export function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0)
  return (
    <div className="arb-accordion">
      {items.map((item, i) => (
        <div key={item.title || item.q} className={`arb-accordion-item${openIndex === i ? ' open' : ''}`}>
          <button
            type="button"
            aria-expanded={openIndex === i}
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
          >
            <span>{item.title || item.q}</span>
            <span className="arb-accordion-caret" aria-hidden="true">{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && <p>{item.text || item.a}</p>}
        </div>
      ))}
    </div>
  )
}

export default function ArabicProgramPage() {
  const [activeModule, setActiveModule] = useState(1)
  const current = PROGRAM_MODULES.find((m) => m.n === activeModule)

  return (
    <div className="page-shell arb-shell">
      <PageHeader />
      <main>
        {/* ── Hero ─────────────────────────────────── */}
        <section className="arb-hero">
          <h1>{PROGRAM_HERO.heading}</h1>
          <div className="arb-hero-actions">
            <a className="arb-btn-primary" href={ARABIC_LINKS.membership} target="_blank" rel="noreferrer">Become a Member</a>
            <Link className="arb-btn-secondary" to="/arabic/faq">Read the FAQs</Link>
          </div>
          <div className="arb-welcome-video">
            <VideoFacade src={PROGRAM_HERO.video.src} title="About the 2-Year Arabic Program" thumbnail={PROGRAM_HERO.video.thumbnail} />
          </div>
        </section>

        {/* ── Program at a glance ───────────────────── */}
        <section className="arb-facts">
          {PROGRAM_FACTS.map((f) => (
            <div key={f.label} className="arb-fact">
              <span>{f.label}</span>
              <strong>{f.value}</strong>
            </div>
          ))}
        </section>

        {/* ── Learning objectives ───────────────────── */}
        <section className="arb-curriculum">
          <h2>Learning Objectives</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <p className="arb-curriculum-intro">{LEARNING_OBJECTIVES_INTRO}</p>
          <div className="arb-panel-left">
            <Accordion items={LEARNING_OBJECTIVES} />
          </div>
        </section>

        {/* ── Module overviews ──────────────────────── */}
        <section className="arb-curriculum" id="modules">
          <h2>Module Overviews</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <p className="arb-curriculum-intro">
            At Talweeh Arabic, we have curated the most effective texts into a comprehensive two-year
            curriculum designed to guide you from beginner to advanced proficiency.
          </p>
          <div className="arb-module-tabs" role="tablist" aria-label="Curriculum modules">
            {PROGRAM_MODULES.map((m) => (
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
                <strong>Module {current.n} — {current.name}</strong>
                <span className="arb-module-duration">{current.duration}</span>
              </div>
            </div>
            <p>{current.overview}</p>
            <div className="arb-module-texts">
              <span className="arb-module-texts-label">Texts studied</span>
              <ul>
                {current.texts.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <Accordion items={current.sections} />
          </div>
        </section>

        {/* ── Calendar ──────────────────────────────── */}
        <section className="arb-curriculum">
          <h2>2-Year Arabic Program Calendar</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <p className="arb-curriculum-intro arb-justify">{PROGRAM_CALENDAR_TEXT}</p>
          <a className="arb-btn-primary" href={ARABIC_LINKS.calendarPdf} target="_blank" rel="noreferrer">
            📅 Student Calendar (PDF)
          </a>
        </section>

        {/* ── Invitation + sign-up ──────────────────── */}
        <section className="arb-verse">
          <p className="arb-verse-translation arb-justify">{PROGRAM_INVITATION}</p>
          <div className="arb-hero-actions arb-invite-actions">
            <a className="arb-btn-invert" href={ARABIC_LINKS.membership} target="_blank" rel="noreferrer">Become a Member</a>
            <a className="arb-btn-ghost" href={ARABIC_LINKS.signupVideo} target="_blank" rel="noreferrer">▶ How to Sign Up</a>
            <a className="arb-btn-ghost" href={ARABIC_LINKS.terms} target="_blank" rel="noreferrer">Terms &amp; Conditions</a>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
