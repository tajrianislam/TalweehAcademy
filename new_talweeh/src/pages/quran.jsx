/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, PageFooter } from './_shared'

// v2: quran.com ids (numeric) + script preference. v1 stored alquran.cloud
// string ids, which no longer exist — ignore it.
const SETTINGS_KEY = 'qmr-settings-v2'
const DEFAULT_TRANSLATION_ID = 84 // Mufti Taqi Usmani
const DEFAULT_RECITATION_ID = 10 // Sa`ud ash-Shuraym

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveSettings(patch) {
  try {
    const current = loadSettings()
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // localStorage unavailable (private mode, etc.) — settings just won't persist
  }
}

function ChapterList({ chapters, activeChapter, onSelect }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter((c) =>
      String(c.id).includes(q) ||
      c.english_name.toLowerCase().includes(q) ||
      c.english_name_translation.toLowerCase().includes(q)
    )
  }, [chapters, query])

  return (
    <div className="qmr-chapter-list">
      <input
        type="search"
        className="qmr-search"
        placeholder="Search Surah…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search Surah"
      />
      <ul>
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={c.id === activeChapter ? 'qmr-chapter-btn active' : 'qmr-chapter-btn'}
              onClick={() => onSelect(c.id)}
            >
              <span className="qmr-chapter-num">{c.id}</span>
              <span className="qmr-chapter-names">
                <strong>{c.english_name}</strong>
                <em>{c.english_name_translation}</em>
              </span>
              <span className="qmr-chapter-arabic">{c.name_arabic}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="qmr-empty">No Surah matches “{query}”.</li>}
      </ul>
    </div>
  )
}

function ReciterPicker({ recitations, activeId, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const active = recitations.find((r) => r.id === activeId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recitations
    return recitations.filter((r) => r.name.toLowerCase().includes(q))
  }, [recitations, query])

  return (
    <div className="qmr-reciter-picker">
      <button
        type="button"
        className="qmr-reciter-toggle"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        🎙 {active ? active.name : 'Choose reciter'}
      </button>
      {open && (
        <div className="qmr-reciter-dropdown">
          <input
            type="search"
            placeholder="Search reciters…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <ul>
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={r.id === activeId ? 'active' : ''}
                  onClick={() => {
                    onChange(r.id)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  {r.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="qmr-empty">No reciters found.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function QuranPage() {
  const initialSettings = useMemo(loadSettings, [])

  const [chapters, setChapters] = useState([])
  const [chaptersError, setChaptersError] = useState(null)
  const [translations, setTranslations] = useState([])
  const [recitations, setRecitations] = useState([])

  const [chapterNumber, setChapterNumber] = useState(initialSettings.chapterNumber || 1)
  const [translationId, setTranslationId] = useState(Number(initialSettings.translationId) || DEFAULT_TRANSLATION_ID)
  // Only honor a saved reciter the user explicitly picked — settings are
  // auto-saved on every visit, so without this flag nobody would ever see a
  // new default.
  const [recitationId, setRecitationId] = useState(
    initialSettings.recitationChosen ? (Number(initialSettings.recitationId) || DEFAULT_RECITATION_ID) : DEFAULT_RECITATION_ID
  )
  const [script, setScript] = useState(initialSettings.script === 'indopak' ? 'indopak' : 'uthmani')
  const [arabicSize, setArabicSize] = useState(initialSettings.arabicSize || 30)
  const [translationSize, setTranslationSize] = useState(initialSettings.translationSize || 17)

  const [verses, setVerses] = useState([])
  const [versesLoading, setVersesLoading] = useState(true)
  const [versesError, setVersesError] = useState(null)

  const [audioState, setAudioState] = useState('idle') // idle | loading | playing | paused
  const [audioMode, setAudioMode] = useState(null) // 'ayah' | 'surah' | 'range'
  const [currentAyahKey, setCurrentAyahKey] = useState(null)
  const [audioErrorMsg, setAudioErrorMsg] = useState(null)
  const [repeatAyah, setRepeatAyah] = useState(false)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [rangeFrom, setRangeFrom] = useState(1)
  const [rangeTo, setRangeTo] = useState(1)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false)
  const [audioPos, setAudioPos] = useState({ t: 0, d: 0 })

  const audioRef = useRef(null)
  const subbarRef = useRef(null)
  const audioPosSecRef = useRef(-1)
  const ayahRefs = useRef(new Map())
  // Gapless track for the current chapter+reciter: one MP3 for the whole
  // Surah plus per-ayah millisecond timestamps. No per-verse file swaps.
  const trackRef = useRef(null) // { key, audioUrl, timestamps: [{verse_key, from, to}] }
  const audioModeRef = useRef(null)
  const repeatAyahRef = useRef(false)
  const loopEnabledRef = useRef(false)
  const stopAtMsRef = useRef(null) // stop boundary for ayah/range modes
  const rangeRef = useRef(null) // { fromMs, toMs } for range looping
  const currentKeyRef = useRef(null)

  useEffect(() => { audioModeRef.current = audioMode }, [audioMode])
  useEffect(() => { repeatAyahRef.current = repeatAyah }, [repeatAyah])
  useEffect(() => { loopEnabledRef.current = loopEnabled }, [loopEnabled])

  const activeChapterInfo = chapters.find((c) => c.id === chapterNumber)
  const verseCount = activeChapterInfo?.verse_count || 1

  // The surah bar sticks below the site header on desktop (where the header
  // is sticky) and at the very top on mobile (where the header is static and
  // scrolls away). Track both the header's height and its computed position.
  useEffect(() => {
    const subbar = subbarRef.current
    const header = document.querySelector('.site-header')
    if (!subbar || !header) return
    const apply = () => {
      const headerIsPinned = ['sticky', 'fixed'].includes(getComputedStyle(header).position)
      subbar.style.setProperty('--qmr-subbar-top', headerIsPinned ? `${header.offsetHeight}px` : '0px')
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  function goToChapter(offset) {
    setChapterNumber((n) => Math.min(114, Math.max(1, n + offset)))
  }

  useEffect(() => {
    fetch('/api/quran/chapters')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to load chapters')))
      .then(setChapters)
      .catch((e) => setChaptersError(String(e)))

    fetch('/api/quran/translations')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to load translations')))
      .then((d) => {
        setTranslations(d.translations || [])
        setTranslationId((prev) => prev || d.defaultTranslationId)
      })
      .catch(() => setTranslations([]))

    fetch('/api/quran/audio/recitations')
      .then((r) => (r.ok ? r.json() : Promise.reject('Failed to load reciters')))
      .then(setRecitations)
      .catch(() => setRecitations([]))
  }, [])

  useEffect(() => {
    if (!translationId) return
    let cancelled = false
    setVersesLoading(true)
    setVersesError(null)
    fetch(`/api/quran/chapters/${chapterNumber}/verses/${translationId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject('Unable to load this Surah')))
      .then((data) => {
        if (cancelled) return
        setVerses(data)
      })
      .catch((e) => {
        if (cancelled) return
        setVerses([])
        setVersesError(String(e))
      })
      .finally(() => {
        if (!cancelled) setVersesLoading(false)
      })
    return () => { cancelled = true }
  }, [chapterNumber, translationId])

  // Stop playback whenever the Surah or reciter changes so audio never plays
  // over content the user is no longer looking at. Also reset range bounds.
  useEffect(() => {
    stopAudio()
    setRangeFrom(1)
    setRangeTo(activeChapterInfo?.verse_count || 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterNumber, recitationId, activeChapterInfo?.verse_count])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    saveSettings({ chapterNumber, translationId, recitationId, script, arabicSize, translationSize })
  }, [chapterNumber, translationId, recitationId, script, arabicSize, translationSize])

  useEffect(() => {
    if (currentAyahKey && audioState === 'playing') {
      const el = ayahRefs.current.get(currentAyahKey)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentAyahKey, audioState])

  // Load the gapless surah track (one MP3 + timestamps) and point the single
  // <audio> element at it. Only refetches when chapter/reciter changes.
  async function loadTrack() {
    const key = `${recitationId}:${chapterNumber}`
    if (trackRef.current?.key === key) return trackRef.current
    const res = await fetch(`/api/quran/audio/surah/${recitationId}/${chapterNumber}`)
    if (!res.ok) throw new Error('Unable to load audio for this reciter')
    const data = await res.json()
    const track = { key, audioUrl: data.audioUrl, timestamps: data.timestamps }
    trackRef.current = track
    if (audioRef.current && audioRef.current.src !== data.audioUrl) {
      audioRef.current.src = data.audioUrl
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
    }
    return track
  }

  function tsForVerse(track, verseNumberInSurah) {
    return track.timestamps.find((t) => t.verse_key === `${chapterNumber}:${verseNumberInSurah}`)
  }

  function tsForKey(track, verseKey) {
    return track.timestamps.find((t) => t.verse_key === verseKey)
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    stopAtMsRef.current = null
    rangeRef.current = null
    currentKeyRef.current = null
    audioPosSecRef.current = -1
    setAudioState('idle')
    setAudioMode(null)
    setCurrentAyahKey(null)
    setPlayerMenuOpen(false)
    setAudioPos({ t: 0, d: 0 })
  }

  // Manual scrub on the player's seek bar. Clears any ayah/range stop
  // boundary — once the listener takes the wheel, play through to the end.
  function seekTo(seconds) {
    const el = audioRef.current
    if (!el) return
    stopAtMsRef.current = null
    rangeRef.current = null
    audioModeRef.current = 'surah'
    setAudioMode('surah')
    el.currentTime = seconds
    updateCurrentAyah(seconds * 1000)
    setAudioPos((p) => ({ ...p, t: seconds }))
  }

  function formatTime(totalSeconds = 0) {
    const s = Math.max(0, Math.floor(totalSeconds))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function pauseAudio() {
    audioRef.current?.pause()
    setAudioState('paused')
  }

  function resumeAudio() {
    audioRef.current?.play().catch(() => setAudioErrorMsg('Playback was blocked by the browser.'))
    setAudioState('playing')
  }

  async function startPlayback(mode, seekMs, stopMs) {
    setAudioErrorMsg(null)
    setAudioMode(mode)
    audioModeRef.current = mode
    stopAtMsRef.current = stopMs ?? null
    const el = audioRef.current
    if (!el) return
    el.currentTime = seekMs / 1000
    try {
      await el.play()
      setAudioState('playing')
    } catch {
      setAudioState('idle')
      setAudioErrorMsg('Playback was blocked by the browser — press play again.')
    }
  }

  async function playAyah(verseKey) {
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = await loadTrack()
      const ts = tsForKey(track, verseKey)
      if (!ts) throw new Error('Audio not found for this ayah')
      rangeRef.current = null
      await startPlayback('ayah', ts.from, ts.to)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  // Continuous play: start at this ayah and keep going to the end of the
  // Surah (no stop boundary, unlike playAyah).
  async function playFromAyah(verseKey) {
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = await loadTrack()
      const ts = tsForKey(track, verseKey)
      if (!ts) throw new Error('Audio not found for this ayah')
      rangeRef.current = null
      await startPlayback('surah', ts.from, null)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  async function playSurahFromStart() {
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      await loadTrack()
      rangeRef.current = null
      await startPlayback('surah', 0, null)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  async function playRange() {
    const from = Math.min(Math.max(1, rangeFrom), verseCount)
    const to = Math.min(Math.max(from, rangeTo), verseCount)
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = await loadTrack()
      const fromTs = tsForVerse(track, from)
      const toTs = tsForVerse(track, to)
      if (!fromTs || !toTs) throw new Error('Audio not found for that range')
      rangeRef.current = { fromMs: fromTs.from, toMs: toTs.to }
      await startPlayback('range', fromTs.from, toTs.to)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  function currentTsIndex() {
    const track = trackRef.current
    if (!track) return -1
    return track.timestamps.findIndex((t) => t.verse_key === currentKeyRef.current)
  }

  function goToOffset(offset) {
    const track = trackRef.current
    const el = audioRef.current
    if (!track || !el || !audioModeRef.current) return
    const idx = currentTsIndex()
    if (idx === -1) return
    const target = track.timestamps[idx + offset]
    if (!target) return
    // In ayah mode, keep stopping at the (new) ayah's end.
    if (audioModeRef.current === 'ayah') stopAtMsRef.current = target.to
    el.currentTime = target.from / 1000
    updateCurrentAyah(target.from)
  }

  function updateCurrentAyah(ms) {
    const track = trackRef.current
    if (!track) return
    const ts = track.timestamps.find((t) => ms >= t.from && ms < t.to)
    const key = ts ? ts.verse_key : null
    if (key && key !== currentKeyRef.current) {
      currentKeyRef.current = key
      setCurrentAyahKey(key)
    }
  }

  // The gapless engine: one MP3 keeps playing; this handler tracks which ayah
  // the playhead is inside (for highlighting) and enforces stop/repeat/loop
  // boundaries by seeking — never by swapping audio files.
  function handleTimeUpdate() {
    const el = audioRef.current
    const track = trackRef.current
    if (!el || !track || el.paused) return
    const ms = el.currentTime * 1000

    // Feed the slim player's seek bar (1s granularity to keep rerenders cheap).
    const wholeSec = Math.floor(el.currentTime)
    if (wholeSec !== audioPosSecRef.current) {
      audioPosSecRef.current = wholeSec
      setAudioPos({ t: wholeSec, d: el.duration || 0 })
    }

    // Repeat current ayah: jump back to its start when crossing its end.
    if (repeatAyahRef.current && currentKeyRef.current) {
      const ts = track.timestamps.find((t) => t.verse_key === currentKeyRef.current)
      if (ts && ms >= ts.to) {
        el.currentTime = ts.from / 1000
        return
      }
    }

    // Stop boundary (ayah / range modes).
    if (stopAtMsRef.current !== null && ms >= stopAtMsRef.current) {
      if (audioModeRef.current === 'range' && loopEnabledRef.current && rangeRef.current) {
        el.currentTime = rangeRef.current.fromMs / 1000
        updateCurrentAyah(rangeRef.current.fromMs)
        return
      }
      stopAudio()
      return
    }

    // Some reciters' files carry recorded silence between an ayah's end and
    // the next ayah's start (a hole between consecutive timestamps). Skip
    // over it so verses flow together without a pause.
    for (let i = 0; i < track.timestamps.length - 1; i++) {
      const cur = track.timestamps[i]
      const next = track.timestamps[i + 1]
      if (ms >= cur.to && ms < next.from) {
        if (stopAtMsRef.current === null || next.from < stopAtMsRef.current) {
          el.currentTime = next.from / 1000
          updateCurrentAyah(next.from)
        }
        return
      }
      if (ms < cur.to) break
    }

    updateCurrentAyah(ms)
  }

  // Natural end of the surah file (surah mode reaches here).
  function handleEnded() {
    if (audioModeRef.current === 'surah' && loopEnabledRef.current && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      return
    }
    stopAudio()
  }

  function registerAyahRef(verseKey, el) {
    if (el) ayahRefs.current.set(verseKey, el)
    else ayahRefs.current.delete(verseKey)
  }

  function renderArabic(v) {
    const indopak = script === 'indopak'
    const cls = indopak ? 'qmr-arabic qmr-arabic--indopak' : 'qmr-arabic'
    if (v.words && v.words.length > 0) {
      return (
        <p className={cls} dir="rtl" lang="ar">
          {v.words.map((w, i) => (
            <span key={w.position}>
              {i > 0 ? ' ' : ''}
              <span
                className="qmr-word"
                tabIndex={0}
                data-tip={w.transliteration ? `${w.translation}\n${w.transliteration}` : w.translation}
              >
                {indopak ? w.text_indopak : w.text_uthmani}
              </span>
            </span>
          ))}
        </p>
      )
    }
    return <p className={cls} dir="rtl" lang="ar">{indopak ? v.text_indopak : v.text_uthmani}</p>
  }

  return (
    <div className="page-shell qmr-shell">
      <PageHeader />
      <main>
        {/* ── Sticky surah bar (quran.com-style) ─────────── */}
        <div className="qmr-subbar" ref={subbarRef}>
          <div className="qmr-subbar-inner">
            <button
              type="button"
              className="qmr-surah-select"
              onClick={() => { setPickerOpen((o) => !o); setSettingsOpen(false) }}
              aria-expanded={pickerOpen}
            >
              {activeChapterInfo ? `${activeChapterInfo.id}. ${activeChapterInfo.english_name}` : 'Select Surah'}
              <span className="qmr-caret" aria-hidden="true">▾</span>
            </button>
            <div className="qmr-subbar-right">
              {activeChapterInfo && (
                <span className="qmr-subbar-meta">
                  {activeChapterInfo.revelation_type} · {activeChapterInfo.verse_count} Ayahs
                </span>
              )}
              <button
                type="button"
                className="qmr-icon-btn"
                aria-label="Reader settings"
                title="Reader settings"
                onClick={() => { setSettingsOpen((o) => !o); setPickerOpen(false) }}
              >
                ⚙
              </button>
            </div>
          </div>
          {pickerOpen && (
            <div className="qmr-surah-dropdown">
              {chaptersError ? (
                <p className="qmr-status qmr-error">{chaptersError}</p>
              ) : chapters.length === 0 ? (
                <p className="qmr-status">Loading Surahs…</p>
              ) : (
                <ChapterList
                  chapters={chapters}
                  activeChapter={chapterNumber}
                  onSelect={(id) => { setChapterNumber(id); setPickerOpen(false) }}
                />
              )}
            </div>
          )}
        </div>
        {pickerOpen && <div className="qmr-overlay" onClick={() => setPickerOpen(false)} />}

        <section className="qmr-reader-page">
          {/* ── Surah header ──────────────────────────────── */}
          {activeChapterInfo && (
            <header className="qmr-surah-head">
              <button
                type="button"
                className="qmr-surah-nav"
                aria-label="Previous Surah"
                disabled={chapterNumber <= 1}
                onClick={() => goToChapter(-1)}
              >
                ‹
              </button>
              <div className="qmr-surah-head-body">
                <p className="qmr-surah-head-arabic">{activeChapterInfo.name_arabic}</p>
                <h1>{activeChapterInfo.id}. Surah {activeChapterInfo.english_name}</h1>
                <p className="qmr-surah-head-meta">
                  {activeChapterInfo.english_name_translation} · {activeChapterInfo.revelation_type} · {activeChapterInfo.verse_count} Ayahs
                </p>
                <div className="qmr-surah-head-actions">
                  <button
                    type="button"
                    className="qmr-play-surah"
                    onClick={playSurahFromStart}
                    disabled={versesLoading || audioState === 'loading'}
                  >
                    {audioState === 'loading' ? '…' : '▶'} Play Surah
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="qmr-surah-nav"
                aria-label="Next Surah"
                disabled={chapterNumber >= 114}
                onClick={() => goToChapter(1)}
              >
                ›
              </button>
            </header>
          )}

          {versesLoading && <p className="qmr-status">Loading verses…</p>}
          {versesError && <p className="qmr-status qmr-error">{versesError}</p>}

            {!versesLoading && !versesError && verses.length > 0 && (
              <ol className="qmr-ayah-list" style={{ '--qmr-arabic-size': `${arabicSize}px`, '--qmr-translation-size': `${translationSize}px` }}>
                {verses.map((v) => {
                  const isActive = v.verse_key === currentAyahKey
                  return (
                    <li
                      key={v.verse_key}
                      ref={(el) => registerAyahRef(v.verse_key, el)}
                      className={isActive ? 'qmr-ayah active' : 'qmr-ayah'}
                    >
                      <div className="qmr-ayah-toprow">
                        <span className="qmr-ayah-key">{v.verse_key}</span>
                        <button
                          type="button"
                          className="qmr-ayah-play"
                          aria-label={isActive && audioState === 'playing' ? 'Pause ayah' : 'Play ayah'}
                          title="Play this ayah"
                          onClick={() => {
                            if (isActive && audioState === 'playing') pauseAudio()
                            else if (isActive && audioState === 'paused') resumeAudio()
                            else playAyah(v.verse_key)
                          }}
                        >
                          {isActive && audioState === 'playing' ? '⏸' : '▶'}
                        </button>
                        <button
                          type="button"
                          className="qmr-ayah-play qmr-ayah-play-continuous"
                          aria-label="Play from this ayah onwards"
                          title="Play from here to the end of the Surah"
                          onClick={() => playFromAyah(v.verse_key)}
                        >
                          ▶▶
                        </button>
                      </div>
                      <div className="qmr-ayah-text">
                        {renderArabic(v)}
                        <p className="qmr-translation">{v.translation_text}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            {!versesLoading && !versesError && verses.length === 0 && (
              <p className="qmr-status">No verses available for this Surah right now.</p>
            )}
        </section>
      </main>

      {/* ── Settings drawer (quran.com-style) ───────────── */}
      {settingsOpen && (
        <>
          <div className="qmr-overlay" onClick={() => setSettingsOpen(false)} />
          <aside className="qmr-drawer" role="dialog" aria-label="Reader settings">
            <div className="qmr-drawer-head">
              <h3>Settings</h3>
              <button type="button" className="qmr-icon-btn" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>
            <div className="qmr-drawer-body">
              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Translation</span>
                <select value={translationId} onChange={(e) => setTranslationId(Number(e.target.value))}>
                  {translations.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Reciter</span>
                <ReciterPicker
                  recitations={recitations}
                  activeId={recitationId}
                  onChange={(id) => {
                    setRecitationId(id)
                    saveSettings({ recitationChosen: true })
                  }}
                  disabled={recitations.length === 0}
                />
              </div>

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Arabic script</span>
                <div className="qmr-script-toggle" role="group" aria-label="Arabic script">
                  <button
                    type="button"
                    className={script === 'uthmani' ? 'active' : ''}
                    onClick={() => setScript('uthmani')}
                  >
                    Uthmani
                  </button>
                  <button
                    type="button"
                    className={script === 'indopak' ? 'active' : ''}
                    onClick={() => setScript('indopak')}
                  >
                    Indo-Pak
                  </button>
                </div>
              </div>

              <div className="qmr-drawer-group qmr-drawer-inline">
                <span className="qmr-drawer-label">Arabic size</span>
                <div className="qmr-stepper">
                  <button type="button" onClick={() => setArabicSize((s) => Math.max(20, s - 2))}>–</button>
                  <span>{arabicSize}</span>
                  <button type="button" onClick={() => setArabicSize((s) => Math.min(48, s + 2))}>+</button>
                </div>
              </div>

              <div className="qmr-drawer-group qmr-drawer-inline">
                <span className="qmr-drawer-label">Translation size</span>
                <div className="qmr-stepper">
                  <button type="button" onClick={() => setTranslationSize((s) => Math.max(13, s - 1))}>–</button>
                  <span>{translationSize}</span>
                  <button type="button" onClick={() => setTranslationSize((s) => Math.min(26, s + 1))}>+</button>
                </div>
              </div>

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Play a range of ayahs</span>
                <div className="qmr-range" aria-label="Play a range of ayahs">
                  <input
                    type="number"
                    min={1}
                    max={verseCount}
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(Number(e.target.value))}
                    aria-label="From ayah"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    min={1}
                    max={verseCount}
                    value={rangeTo}
                    onChange={(e) => setRangeTo(Number(e.target.value))}
                    aria-label="To ayah"
                  />
                  <button
                    type="button"
                    onClick={() => { playRange(); setSettingsOpen(false) }}
                    disabled={versesLoading || audioState === 'loading'}
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Slim audio player (appears while playing) ───── */}
      {audioState !== 'idle' && (
        <div className="qmr-player">
          <input
            type="range"
            className="qmr-player-seek"
            min={0}
            max={Math.max(1, Math.floor(audioPos.d))}
            value={Math.min(audioPos.t, Math.floor(audioPos.d) || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            style={{ '--qmr-seek-fill': `${audioPos.d ? (audioPos.t / audioPos.d) * 100 : 0}%` }}
          />
          <div className="qmr-player-row">
            <span className="qmr-player-time">{formatTime(audioPos.t)}</span>
            <div className="qmr-player-controls">
              <div className="qmr-player-menu-wrap">
                <button
                  type="button"
                  className="qmr-player-btn"
                  aria-label="Playback options"
                  aria-expanded={playerMenuOpen}
                  onClick={() => setPlayerMenuOpen((o) => !o)}
                >
                  ⋯
                </button>
                {playerMenuOpen && (
                  <div className="qmr-player-menu">
                    <label>
                      <input type="checkbox" checked={repeatAyah} onChange={(e) => setRepeatAyah(e.target.checked)} />
                      Repeat ayah
                    </label>
                    <label>
                      <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
                      Loop
                    </label>
                    <label className="qmr-player-menu-row">
                      Speed
                      <select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))}>
                        <option value={0.75}>0.75×</option>
                        <option value={1}>1×</option>
                        <option value={1.25}>1.25×</option>
                        <option value={1.5}>1.5×</option>
                      </select>
                    </label>
                    <label className="qmr-player-menu-row qmr-player-volume">
                      Volume
                      <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                    </label>
                  </div>
                )}
              </div>
              <button type="button" className="qmr-player-btn" onClick={() => goToOffset(-1)} disabled={!audioMode} aria-label="Previous ayah">⏮</button>
              {audioState === 'playing' ? (
                <button type="button" className="qmr-player-btn qmr-player-main" onClick={pauseAudio} aria-label="Pause">⏸</button>
              ) : (
                <button type="button" className="qmr-player-btn qmr-player-main" onClick={resumeAudio} aria-label="Resume">▶</button>
              )}
              <button type="button" className="qmr-player-btn" onClick={() => goToOffset(1)} disabled={!audioMode} aria-label="Next ayah">⏭</button>
              <button type="button" className="qmr-player-btn" onClick={stopAudio} aria-label="Stop and close player">✕</button>
            </div>
            <span className="qmr-player-time qmr-player-time-right">
              {currentAyahKey ? `${currentAyahKey} · ` : ''}{formatTime(audioPos.d)}
            </span>
          </div>
          {audioErrorMsg && <p className="qmr-player-error">{audioErrorMsg}</p>}
        </div>
      )}
      {audioErrorMsg && audioState === 'idle' && (
        <div className="qmr-player qmr-player-error-only">
          <p className="qmr-player-error">{audioErrorMsg}</p>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setAudioErrorMsg('This audio file failed to load.')}
      />

      <PageFooter />
    </div>
  )
}
