'use strict'

// Quran Mushaf reader API — proxies Al Quran Cloud (no API key required) so the
// frontend never talks to a third-party provider directly and responses stay
// in a stable shape regardless of provider quirks.
//
// Provider docs: https://alquran.cloud/api

const express = require('express')
const axios = require('axios')

const router = express.Router()

const BASE_URL = 'https://api.alquran.cloud/v1'
const ARABIC_EDITION = 'quran-uthmani'
const DEFAULT_TRANSLATION_ID = 'en.sahih'

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

function verseKey(chapterNumber, numberInSurah) {
  return `${chapterNumber}:${numberInSurah}`
}

function parseChapterNumber(raw, res) {
  const chapterNumber = Number(raw)
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
    res.status(400).json({ error: 'Invalid chapter number' })
    return null
  }
  return chapterNumber
}

router.get('/health', (req, res) => {
  res.json({ ready: true, provider: 'alquran.cloud' })
})

router.get('/chapters', async (req, res) => {
  try {
    const chapters = await cachedGet('chapters', async () => {
      const { data } = await axios.get(`${BASE_URL}/surah`)
      return data.data.map((s) => ({
        id: s.number,
        name_arabic: s.name,
        english_name: s.englishName,
        name_simple: s.englishName,
        english_name_translation: s.englishNameTranslation,
        verse_count: s.numberOfAyahs,
        revelation_type: s.revelationType,
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
      const { data } = await axios.get(`${BASE_URL}/edition`, {
        params: { format: 'text', type: 'translation', language: 'en' },
      })
      return data.data.map((e) => ({ id: e.identifier, name: e.englishName || e.name }))
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
      const { data } = await axios.get(`${BASE_URL}/edition`, {
        params: { format: 'audio', language: 'ar' },
      })
      return data.data.map((e) => ({ id: e.identifier, name: e.englishName || e.name }))
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
  const translationId = req.params.translationId || DEFAULT_TRANSLATION_ID

  try {
    const verses = await cachedGet(`verses:${chapterNumber}:${translationId}`, async () => {
      const { data } = await axios.get(
        `${BASE_URL}/surah/${chapterNumber}/editions/${ARABIC_EDITION},${translationId}`
      )
      const [arabicEdition, translationEdition] = data.data || []
      if (!arabicEdition?.ayahs || !translationEdition?.ayahs) {
        throw new Error('Unexpected provider response shape')
      }
      return arabicEdition.ayahs.map((ayah, i) => ({
        id: ayah.number,
        verse_number: ayah.number,
        verse_number_in_surah: ayah.numberInSurah,
        verse_key: verseKey(chapterNumber, ayah.numberInSurah),
        chapter_number: chapterNumber,
        text_uthmani: ayah.text,
        translation_text: translationEdition.ayahs[i]?.text || '',
      }))
    })
    res.json(verses)
  } catch (err) {
    console.error('quran verses error', err.message)
    res.status(502).json({ error: 'Unable to load this Surah right now' })
  }
})

router.get('/audio/verse/:recitationId/:chapterNumber', async (req, res) => {
  const chapterNumber = parseChapterNumber(req.params.chapterNumber, res)
  if (chapterNumber === null) return
  const { recitationId } = req.params

  try {
    const audio = await cachedGet(`audio:${recitationId}:${chapterNumber}`, async () => {
      const { data } = await axios.get(`${BASE_URL}/surah/${chapterNumber}/${recitationId}`)
      const ayahs = data.data?.ayahs
      if (!ayahs?.length || !ayahs[0]?.audio) throw new Error('Unknown reciter or no audio available')
      return ayahs.map((ayah) => ({
        verse_key: verseKey(chapterNumber, ayah.numberInSurah),
        ayah_number: ayah.numberInSurah,
        url: ayah.audio,
        duration_ms: null,
      }))
    })
    res.json(audio)
  } catch (err) {
    console.error('quran verse audio error', err.message)
    res.status(502).json({ error: 'Unable to load audio for this reciter right now' })
  }
})

module.exports = router
