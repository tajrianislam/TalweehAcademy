/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, PageFooter } from './_shared'

const SETTINGS_KEY = 'qmr-settings-v1'

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
  const [translationId, setTranslationId] = useState(initialSettings.translationId || 'en.sahih')
  const [recitationId, setRecitationId] = useState(initialSettings.recitationId || 'ar.alafasy')
  const [arabicSize, setArabicSize] = useState(initialSettings.arabicSize || 30)
  const [translationSize, setTranslationSize] = useState(initialSettings.translationSize || 17)

  const [verses, setVerses] = useState([])
  const [versesLoading, setVersesLoading] = useState(true)
  const [versesError, setVersesError] = useState(null)

  const [audioState, setAudioState] = useState('idle') // idle | loading | playing | paused
  const [audioMode, setAudioMode] = useState(null) // 'ayah' | 'surah'
  const [currentAyahKey, setCurrentAyahKey] = useState(null)
  const [audioErrorMsg, setAudioErrorMsg] = useState(null)
  const [repeatAyah, setRepeatAyah] = useState(false)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)

  const audioRef = useRef(null)
  const ayahRefs = useRef(new Map())
  const playlistRef = useRef([]) // sorted [{ ayahNumber, verseKey, url }] for current chapter+recitation
  const playlistKeyRef = useRef(null) // `${recitationId}:${chapterNumber}` the playlist above belongs to
  const audioModeRef = useRef(null)
  const repeatAyahRef = useRef(false)
  const loopEnabledRef = useRef(false)

  useEffect(() => { audioModeRef.current = audioMode }, [audioMode])
  useEffect(() => { repeatAyahRef.current = repeatAyah }, [repeatAyah])
  useEffect(() => { loopEnabledRef.current = loopEnabled }, [loopEnabled])

  const activeChapterInfo = chapters.find((c) => c.id === chapterNumber)

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
  // over content the user is no longer looking at.
  useEffect(() => {
    stopAudio()
  }, [chapterNumber, recitationId])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    saveSettings({ chapterNumber, translationId, recitationId, arabicSize, translationSize })
  }, [chapterNumber, translationId, recitationId, arabicSize, translationSize])

  useEffect(() => {
    if (currentAyahKey && audioState === 'playing') {
      const el = ayahRefs.current.get(currentAyahKey)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentAyahKey, audioState])

  async function getPlaylist(chapterNum, recId) {
    const key = `${recId}:${chapterNum}`
    if (playlistKeyRef.current === key && playlistRef.current.length > 0) {
      return playlistRef.current
    }
    const res = await fetch(`/api/quran/audio/verse/${recId}/${chapterNum}`)
    if (!res.ok) throw new Error('Unable to load audio for this reciter')
    const rows = await res.json()
    const playlist = rows
      .slice()
      .sort((a, b) => a.ayah_number - b.ayah_number)
      .map((r) => ({ ayahNumber: r.ayah_number, verseKey: r.verse_key, url: r.url }))
    playlistRef.current = playlist
    playlistKeyRef.current = key
    return playlist
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setAudioState('idle')
    setAudioMode(null)
    setCurrentAyahKey(null)
  }

  function pauseAudio() {
    audioRef.current?.pause()
    setAudioState('paused')
  }

  function resumeAudio() {
    audioRef.current?.play().catch(() => setAudioErrorMsg('Playback was blocked by the browser.'))
    setAudioState('playing')
  }

  async function playFromPlaylistIndex(mode, index) {
    const playlist = playlistRef.current
    const item = playlist[index]
    if (!item || !audioRef.current) return
    setAudioMode(mode)
    audioModeRef.current = mode
    setCurrentAyahKey(item.verseKey)
    setAudioErrorMsg(null)
    audioRef.current.src = item.url
    audioRef.current.volume = volume
    audioRef.current.playbackRate = playbackRate
    try {
      await audioRef.current.play()
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
      const playlist = await getPlaylist(chapterNumber, recitationId)
      const index = playlist.findIndex((p) => p.verseKey === verseKey)
      if (index === -1) throw new Error('Audio not found for this ayah')
      await playFromPlaylistIndex('ayah', index)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  async function playSurahFromStart() {
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      await getPlaylist(chapterNumber, recitationId)
      await playFromPlaylistIndex('surah', 0)
    } catch (err) {
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  function currentIndex() {
    return playlistRef.current.findIndex((p) => p.verseKey === currentAyahKey)
  }

  function goToOffset(offset) {
    if (audioModeRef.current !== 'surah') return
    const idx = currentIndex()
    if (idx === -1) return
    const target = idx + offset
    if (target < 0 || target >= playlistRef.current.length) return
    playFromPlaylistIndex('surah', target)
  }

  function handleEnded() {
    if (repeatAyahRef.current) {
      const idx = currentIndex()
      if (idx !== -1) {
        playFromPlaylistIndex(audioModeRef.current, idx)
        return
      }
    }
    if (audioModeRef.current === 'surah') {
      const idx = currentIndex()
      const nextIdx = idx + 1
      if (nextIdx < playlistRef.current.length) {
        playFromPlaylistIndex('surah', nextIdx)
        return
      }
      if (loopEnabledRef.current) {
        playFromPlaylistIndex('surah', 0)
        return
      }
    }
    stopAudio()
  }

  function registerAyahRef(verseKey, el) {
    if (el) ayahRefs.current.set(verseKey, el)
    else ayahRefs.current.delete(verseKey)
  }

  return (
    <div className="page-shell qmr-shell">
      <PageHeader />
      <main>
        <section className="qmr-hero">
          <h1>Quran Mushaf</h1>
          <p>Read the Qurʾān with translation, and listen to your choice of reciter — ayah by ayah or the full Surah.</p>
        </section>

        <section className="qmr-layout">
          <aside className="qmr-sidebar">
            {chaptersError ? (
              <p className="qmr-status qmr-error">{chaptersError}</p>
            ) : chapters.length === 0 ? (
              <p className="qmr-status">Loading Surahs…</p>
            ) : (
              <ChapterList chapters={chapters} activeChapter={chapterNumber} onSelect={setChapterNumber} />
            )}
          </aside>

          <div className="qmr-reader">
            <div className="qmr-toolbar">
              <div className="qmr-toolbar-row">
                <label className="qmr-select">
                  Translation
                  <select value={translationId} onChange={(e) => setTranslationId(e.target.value)}>
                    {translations.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
                <ReciterPicker
                  recitations={recitations}
                  activeId={recitationId}
                  onChange={setRecitationId}
                  disabled={recitations.length === 0}
                />
              </div>
              <div className="qmr-toolbar-row">
                <label className="qmr-font-control">
                  Arabic size
                  <button type="button" onClick={() => setArabicSize((s) => Math.max(20, s - 2))}>–</button>
                  <button type="button" onClick={() => setArabicSize((s) => Math.min(48, s + 2))}>+</button>
                </label>
                <label className="qmr-font-control">
                  Translation size
                  <button type="button" onClick={() => setTranslationSize((s) => Math.max(13, s - 1))}>–</button>
                  <button type="button" onClick={() => setTranslationSize((s) => Math.min(26, s + 1))}>+</button>
                </label>
              </div>
            </div>

            {activeChapterInfo && (
              <header className="qmr-surah-header">
                <h2>
                  {activeChapterInfo.id}. {activeChapterInfo.english_name}
                  <span className="qmr-surah-arabic">{activeChapterInfo.name_arabic}</span>
                </h2>
                <p>
                  {activeChapterInfo.english_name_translation} · {activeChapterInfo.revelation_type} · {activeChapterInfo.verse_count} Ayahs
                </p>
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
                      <div className="qmr-ayah-controls">
                        <span className="qmr-ayah-badge">{v.verse_number_in_surah}</span>
                        <button
                          type="button"
                          className="qmr-ayah-play"
                          aria-label={isActive && audioState === 'playing' ? 'Pause ayah' : 'Play ayah'}
                          onClick={() => {
                            if (isActive && audioState === 'playing') pauseAudio()
                            else if (isActive && audioState === 'paused') resumeAudio()
                            else playAyah(v.verse_key)
                          }}
                        >
                          {isActive && audioState === 'playing' ? '⏸' : '▶'}
                        </button>
                      </div>
                      <div className="qmr-ayah-text">
                        <p className="qmr-arabic" dir="rtl" lang="ar">{v.text_uthmani}</p>
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
          </div>
        </section>
      </main>

      <div className="qmr-audio-bar">
        {audioErrorMsg && <span className="qmr-audio-error">{audioErrorMsg}</span>}
        <div className="qmr-audio-controls">
          <button type="button" onClick={() => goToOffset(-1)} disabled={audioMode !== 'surah'} aria-label="Previous ayah">⏮</button>
          {audioState === 'playing' ? (
            <button type="button" className="qmr-audio-main" onClick={pauseAudio} aria-label="Pause">⏸</button>
          ) : audioState === 'paused' ? (
            <button type="button" className="qmr-audio-main" onClick={resumeAudio} aria-label="Resume">▶</button>
          ) : (
            <button type="button" className="qmr-audio-main" onClick={playSurahFromStart} disabled={versesLoading || audioState === 'loading'} aria-label="Play Surah">
              {audioState === 'loading' ? '…' : '▶'}
            </button>
          )}
          <button type="button" onClick={() => goToOffset(1)} disabled={audioMode !== 'surah'} aria-label="Next ayah">⏭</button>
          <button type="button" onClick={stopAudio} disabled={audioState === 'idle'} aria-label="Stop">⏹</button>
        </div>
        <div className="qmr-audio-meta">
          {currentAyahKey ? <span>Ayah {currentAyahKey}</span> : <span>Play Surah or tap an ayah</span>}
        </div>
        <div className="qmr-audio-toggles">
          <label>
            <input type="checkbox" checked={repeatAyah} onChange={(e) => setRepeatAyah(e.target.checked)} />
            Repeat ayah
          </label>
          <label>
            <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
            Loop Surah
          </label>
          <label className="qmr-speed">
            Speed
            <select value={playbackRate} onChange={(e) => setPlaybackRate(Number(e.target.value))}>
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          </label>
          <label className="qmr-volume">
            Vol
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </label>
        </div>
        <audio ref={audioRef} onEnded={handleEnded} onError={() => setAudioErrorMsg('This audio file failed to load.')} />
      </div>

      <PageFooter />
    </div>
  )
}
