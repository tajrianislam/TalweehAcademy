import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public', 'talweeh')

const ASSETS = [
  'wp-content/uploads/2024/11/logo_final-scaled-600x171.webp',
  'wp-content/uploads/2024/11/favicon_footer2.webp',
  'wp-content/uploads/2024/08/border3.svg',
  'wp-content/uploads/2024/08/Epilogue-Regular.woff2',
  'wp-content/uploads/2024/08/Epilogue-SemiBold.woff2',
  'wp-content/uploads/2024/08/Cinzel-SemiBold.woff2',
  'wp-content/uploads/2024/08/background4.webp',
  'wp-content/uploads/2024/12/email-1024x340.webp',
  'wp-content/uploads/elementor/thumbs/A-Critical-Study-of-U\u1E63ul-al-Sashi-rldq5z4guash9wdooaungoskz8zl373t06rgnrdst0.webp',
  'wp-content/uploads/elementor/thumbs/The-science-of-Jar\u1E25-wa-Ta\u02BFdil-rldpxb21taxa7cyzajyigvjjrbpq3oox5a69bw8i6s.webp',
  'wp-content/uploads/elementor/thumbs/Monday-Night-Readings-rldoxpw1247gmuny3o60kcua354fo8erx4zg7r03ro.webp',
  'wp-content/uploads/elementor/thumbs/Hanafi-U\u1E63ul-al-Fiqh-Level-01-rfkd0r9y5ilfd0ttgant6ouyfvlk6r5plneiw5s4d0.webp',
  'wp-content/uploads/elementor/thumbs/Tadrib-al-Rawi-rhqii7iwegqq5g24jzmp05qz6ei1o0do237liqtzbo.webp',
  'wp-content/uploads/elementor/thumbs/Mukhtasar-al-Quduri-Qism-al-\u2018Ibadat-rcs7czgj7h0kpq1tbeg1jpxpnfvere6fkmiz194mxg.webp',
  'wp-content/uploads/elementor/thumbs/shomarkhurshid-r12epurfeppq1qxd44jyh2zun5kilzbg1e93686d0c.webp',
  'wp-content/uploads/elementor/thumbs/mohammad_daud-rea2gp5lqnx8g5vcsmhaxcm9rs3vnrbh1l4wdyfmu4.webp',
]

const BASE = 'https://Talweeh.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) MirrorBot/1.0'

async function download(remotePath) {
  const url = `${BASE}/${remotePath}`
  const dest = path.join(PUBLIC_ROOT, remotePath)
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

async function main() {
  const results = []
  for (const asset of ASSETS) {
    try {
      const r = await download(asset)
      results.push(r)
      const status = r.ok ? `OK ${r.bytes}B` : `FAIL ${r.status}`
      console.log(`${status}\t${asset}`)
    } catch (err) {
      results.push({ url: asset, ok: false, error: err.message })
      console.log(`ERR\t${asset}\t${err.message}`)
    }
  }
  const ok = results.filter((r) => r.ok).length
  console.log(`\nDownloaded ${ok}/${results.length} assets to ${PUBLIC_ROOT}`)
}

main()
