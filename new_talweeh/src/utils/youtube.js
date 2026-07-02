export function extractVideoId(url) {
  if (!url) return null

  const match = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?.*v=|shorts\/)|youtu\.be\/)([^"&?/ ]{11})/i
  )

  return match ? match[1] : null
}

export function buildEmbedPlayerVars(startSeconds = 0) {
  const safeStartSeconds = Math.max(0, Math.floor(startSeconds))
  const playerVars = {
    iv_load_policy: 3,
    modestbranding: 1,
    playsinline: 1,
    rel: 0,
  }

  if (safeStartSeconds > 0) {
    playerVars.start = safeStartSeconds
  }

  return playerVars
}
