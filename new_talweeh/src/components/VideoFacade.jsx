/* eslint-disable react/prop-types */
import { useState } from 'react'
import { extractVideoId } from '../utils/youtube'

// Lightweight YouTube facade: shows the video thumbnail with our own green
// play button (no red YouTube branding) and only loads the real iframe once
// the visitor clicks play.
export default function VideoFacade({ src, title, thumbnail }) {
  const [playing, setPlaying] = useState(false)
  const videoId = extractVideoId(src)

  if (!videoId) return null

  if (playing) {
    return (
      <div className="youtube-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="youtube-embed video-facade"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
    >
      <img
        src={thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
      />
      <span className="video-facade-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  )
}
