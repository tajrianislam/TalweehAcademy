'use strict'

// Quran Mushaf reader API — proxies quran.com v4 (no API key required) so the
// frontend never talks to a third-party provider directly and responses stay
// in a stable shape regardless of provider quirks.
//
// quran.com gives us what alquran.cloud could not: Indo-Pak script text,
// word-by-word translations, and gapless full-surah audio with per-ayah
// millisecond timestamps (the fix for audible pauses between verses).
//
// Provider docs: https://api-docs.quran.com

const express = require('express')
const axios = require('axios')

const router = express.Router()

const BASE_URL = 'https://api.quran.com/api/v4'
// Mufti Taqi Usmani (verse-level translation resource on quran.com)
const DEFAULT_TRANSLATION_ID = 84
// Mishari Rashid al-`Afasy (gapless chapter recitations)
const DEFAULT_RECITATION_ID = 7

// Chapter list, translation list, and reciter list rarely change — cache them
// (and per-Surah verse/audio lookups) in memory to avoid hammering the
// upstream API on every page view.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const cache = new Map()

async function cachedGet(key, fetcher) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  const data = await fetcher()
  cache.set(key, { data, at: Date.now() })
  return data
}

function parseChapterNumber(raw, res) {
  const chapterNumber = Number(raw)
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
    res.status(400).json({ error: 'Invalid chapter number' })
    return null
  }
  return chapterNumber
}

function parseId(raw, res, label) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: `Invalid ${label}` })
    return null
  }
  return id
}

// quran.com translation text can embed <sup foot_note=...>1</sup> markers.
function stripHtml(text) {
  return (text || '').replace(/<[^>]*>/g, '').trim()
}

router.get('/health', (req, res) => {
  res.json({ ready: true, provider: 'quran.com' })
})

router.get('/chapters', async (req, res) => {
  try {
    const chapters = await cachedGet('chapters', async () => {
      const { data } = await axios.get(`${BASE_URL}/chapters`, { params: { language: 'en' } })
      return data.chapters.map((c) => ({
        id: c.id,
        name_arabic: c.name_arabic,
        english_name: c.name_simple,
        name_simple: c.name_simple,
        english_name_translation: c.translated_name?.name || '',
        verse_count: c.verses_count,
        revelation_type: c.revelation_place,
        verses_available: true,
      }))
    })
    res.json(chapters)
  } catch (err) {
    console.error('quran chapters error', err.message)
    res.status(502).json({ error: 'Unable to load chapters right now' })
  }
})

router.get('/translations', async (req, res) => {
  try {
    const translations = await cachedGet('translations', async () => {
      const { data } = await axios.get(`${BASE_URL}/resources/translations`, {
        params: { language: 'en' },
      })
      return data.translations
        .filter((t) => t.language_name === 'english')
        .map((t) => ({ id: t.id, name: t.name === t.author_name ? t.name : `${t.name} — ${t.author_name}` }))
        .sort((a, b) => a.name.localeCompare(b.name))
    })
    res.json({ translations, defaultTranslationId: DEFAULT_TRANSLATION_ID })
  } catch (err) {
    console.error('quran translations error', err.message)
    res.status(502).json({ error: 'Unable to load translations right now' })
  }
})

router.get('/audio/recitations', async (req, res) => {
  try {
    const recitations = await cachedGet('recitations', async () => {
      const { data } = await axios.get(`${BASE_URL}/resources/recitations`, {
        params: { language: 'en' },
      })
      return data.recitations.map((r) => ({
        id: r.id,
        name: r.style ? `${r.reciter_name} (${r.style})` : r.reciter_name,
      }))
    })
    res.json(recitations)
  } catch (err) {
    console.error('quran recitations error', err.message)
    res.status(502).json({ error: 'Unable to load reciters right now' })
  }
})

router.get('/chapters/:chapterNumber/verses/:translationId', async (req, res) => {
  const chapterNumber = parseChapterNumber(req.params.chapterNumber, res)
  if (chapterNumber === null) return
  const translationId = parseId(req.params.translationId || DEFAULT_TRANSLATION_ID, res, 'translation id')
  if (translationId === null) return

  try {
    const verses = await cachedGet(`verses:${chapterNumber}:${translationId}`, async () => {
      // by_chapter is paginated (max 50 verses per page) — aggregate all pages.
      const all = []
      let page = 1
      let totalPages = 1
      while (page <= totalPages) {
        const { data } = await axios.get(`${BASE_URL}/verses/by_chapter/${chapterNumber}`, {
          params: {
            fields: 'text_uthmani,text_indopak',
            words: true,
            word_fields: 'text_uthmani,text_indopak',
            word_translation_language: 'en',
            translations: translationId,
            per_page: 50,
            page,
          },
        })
        totalPages = data.pagination?.total_pages || 1
        for (const v of data.verses) {
          all.push({
            id: v.id,
            verse_number: v.id,
            verse_number_in_surah: v.verse_number,
            verse_key: v.verse_key,
            chapter_number: chapterNumber,
            text_uthmani: v.text_uthmani,
            text_indopak: v.text_indopak,
            translation_text: stripHtml(v.translations?.[0]?.text),
            words: (v.words || [])
              .filter((w) => w.char_type_name === 'word')
              .map((w) => ({
                position: w.position,
                text_uthmani: w.text_uthmani,
                text_indopak: w.text_indopak,
                translation: w.translation?.text || '',
                transliteration: w.transliteration?.text || '',
              })),
          })
        }
        page += 1
      }
      if (!all.length) throw new Error('Unexpected provider response shape')
      return all
    })
    res.json(verses)
  } catch (err) {
    console.error('quran verses error', err.message)
    res.status(502).json({ error: 'Unable to load this Surah right now' })
  }
})

// Gapless audio: one MP3 for the whole surah + per-ayah timestamps (ms) so the
// player can highlight/seek/stop without swapping audio files between verses.
router.get('/audio/surah/:recitationId/:chapterNumber', async (req, res) => {
  const chapterNumber = parseChapterNumber(req.params.chapterNumber, res)
  if (chapterNumber === null) return
  const recitationId = parseId(req.params.recitationId, res, 'reciter id')
  if (recitationId === null) return

  try {
    const audio = await cachedGet(`surah-audio:${recitationId}:${chapterNumber}`, async () => {
      const { data } = await axios.get(
        `${BASE_URL}/chapter_recitations/${recitationId}/${chapterNumber}`,
        { params: { segments: true } }
      )
      const file = data.audio_file
      if (!file?.audio_url || !file?.timestamps?.length) {
        throw new Error('Unknown reciter or no gapless audio available')
      }
      return {
        audioUrl: file.audio_url,
        timestamps: file.timestamps.map((t) => ({
          verse_key: t.verse_key,
          from: t.timestamp_from,
          to: t.timestamp_to,
        })),
      }
    })
    res.json(audio)
  } catch (err) {
    console.error('quran surah audio error', err.message)
    res.status(502).json({ error: 'Unable to load audio for this reciter right now' })
  }
})

module.exports = router
