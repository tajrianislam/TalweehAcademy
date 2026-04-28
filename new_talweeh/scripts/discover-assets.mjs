import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const PAGES = [
  'https://Talweeh.com/',
  'https://Talweeh.com/courses/',
  'https://Talweeh.com/articles/',
  'https://Talweeh.com/instructors/',
  'https://Talweeh.com/services/',
  'https://Talweeh.com/about/',
]

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) DiscoverBot/1.0'

const IMAGE_HOST = 'Talweeh.com'
const IMAGE_EXT = /\.(?:webp|jpe?g|png|gif|svg|avif)(?:$|\?)/i

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`)
  return await res.text()
}

function extractImageUrls(html, base) {
  const urls = new Set()
  const attrPatterns = [
    /\b(?:src|data-src|data-lazy-src|poster)\s*=\s*["']([^"']+)["']/gi,
    /\bsrcset\s*=\s*["']([^"']+)["']/gi,
    /\bcontent\s*=\s*["']([^"']+\.(?:webp|jpe?g|png|gif|svg|avif)[^"']*)["']/gi,
    /url\(([^)]+)\)/gi,
  ]
  for (const re of attrPatterns) {
    let m
    while ((m = re.exec(html)) !== null) {
      const raw = m[1].trim().replace(/^["']|["']$/g, '')
      if (re.source.includes('srcset')) {
        for (const part of raw.split(',')) {
          const u = part.trim().split(/\s+/)[0]
          tryAdd(u, base, urls)
        }
      } else {
        tryAdd(raw, base, urls)
      }
    }
  }
  return urls
}

function tryAdd(raw, base, set) {
  if (!raw || raw.startsWith('data:')) return
  try {
    const u = new URL(raw, base)
    if (u.hostname !== IMAGE_HOST) return
    if (!IMAGE_EXT.test(u.pathname)) return
    u.search = ''
    u.hash = ''
    set.add(u.pathname)
  } catch {
    // ignore
  }
}

async function main() {
  const all = new Set()
  for (const url of PAGES) {
    try {
      const html = await fetchHtml(url)
      const found = extractImageUrls(html, url)
      console.log(`${url}: ${found.size} images`)
      for (const f of found) all.add(f)
    } catch (err) {
      console.log(`SKIP ${url}: ${err.message}`)
    }
  }
  const sorted = [...all].sort()
  console.log(`\nTotal unique image paths: ${sorted.length}`)
  const out = path.join(PROJECT_ROOT, 'scripts', 'discovered-assets.json')
  await fs.writeFile(out, JSON.stringify(sorted, null, 2))
  console.log(`Wrote ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
