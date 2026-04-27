import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public', 'talweeh')
const LIST = path.join(__dirname, 'discovered-assets.json')

const BASE = 'https://talweehacademy.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BulkBot/1.0'
const CONCURRENCY = 6

async function downloadOne(remotePathEncoded) {
  const url = `${BASE}${remotePathEncoded}`
  const decoded = decodeURIComponent(remotePathEncoded)
  const dest = path.join(PUBLIC_ROOT, decoded.replace(/^\//, ''))

  try {
    await fs.access(dest)
    return { url, ok: true, cached: true }
  } catch {
    /* download */
  }

  await fs.mkdir(path.dirname(dest), { recursive: true })
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: '*/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    return { url, ok: false, status: res.status, statusText: res.statusText }
  }
  const buf = new Uint8Array(await res.arrayBuffer())
  await fs.writeFile(dest, buf)
  return { url, ok: true, bytes: buf.length, dest }
}

async function runWithConcurrency(items, limit, worker) {
  const results = []
  let cursor = 0
  async function lane() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: limit }, () => lane()))
  return results
}

async function main() {
  const list = JSON.parse(await fs.readFile(LIST, 'utf8'))
  console.log(`Downloading ${list.length} assets with concurrency=${CONCURRENCY}...`)
  const results = await runWithConcurrency(list, CONCURRENCY, async (item) => {
    try {
      const r = await downloadOne(item)
      const tag = r.ok ? (r.cached ? 'CACHE' : `OK ${r.bytes}B`) : `FAIL ${r.status}`
      console.log(`${tag}\t${item}`)
      return r
    } catch (err) {
      console.log(`ERR\t${item}\t${err.message}`)
      return { url: item, ok: false, error: err.message }
    }
  })
  const ok = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log(`\nDone: ${ok}/${results.length} succeeded`)
  if (failed.length) {
    console.log('Failures:')
    for (const f of failed) console.log(`  - ${f.url}: ${f.status || f.error}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
