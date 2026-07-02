/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube'
import { buildEmbedPlayerVars } from '../utils/youtube'

function formatClock(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function YouTubePlayer({
  videoId,
  title,
  badge = 'Overview',
  instructor,
  startSeconds = 0,
  onReady,
  onPlay,
  onPause,
  onEnd,
}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const pollRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [rates, setRates] = useState([0.5, 1, 1.5, 2])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return
      setCurrentTime(player.getCurrentTime() || 0)
      const dur = player.getDuration?.() || 0
      if (dur) setDuration(dur)
    }, 250)
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  function handleReady(event) {
    const player = event.target
    playerRef.current = player
    setDuration(player.getDuration?.() || 0)
    setVolume(player.getVolume?.() ?? 100)
    setMuted(player.isMuted?.() ?? false)
    const availableRates = player.getAvailablePlaybackRates?.()
    if (Array.isArray(availableRates) && availableRates.length) setRates(availableRates)
    setPlaybackRate(player.getPlaybackRate?.() || 1)
    onReady?.(event)
  }

  function handleStateChange(event) {
    const state = event.data
    if (state === 1) {
      setIsPlaying(true)
      startPolling()
    } else if (state === 2 || state === 0) {
      setIsPlaying(false)
      stopPolling()
    }
  }

  function togglePlay() {
    const player = playerRef.current
    if (!player) return
    if (isPlaying) player.pauseVideo()
    else player.playVideo()
  }

  function handleSeek(event) {
    const value = Number(event.target.value)
    setCurrentTime(value)
    playerRef.current?.seekTo(value, true)
  }

  function toggleMute() {
    const player = playerRef.current
    if (!player) return
    if (muted || volume === 0) {
      player.unMute()
      if (volume === 0) {
        player.setVolume(60)
        setVolume(60)
      }
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }

  function handleVolume(event) {
    const value = Number(event.target.value)
    const player = playerRef.current
    if (!player) return
    player.setVolume(value)
    setVolume(value)
    if (value === 0) {
      player.mute()
      setMuted(true)
    } else if (muted) {
      player.unMute()
      setMuted(false)
    }
  }

  function selectRate(rate) {
    playerRef.current?.setPlaybackRate(rate)
    setPlaybackRate(rate)
    setSettingsOpen(false)
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      containerRef.current?.requestFullscreen?.()
    }
  }

  const remaining = Math.max(0, duration - currentTime)
  const seekPercent = duration ? (currentTime / duration) * 100 : 0
  const effectiveVolume = muted ? 0 : volume

  return (
    <div
      ref={containerRef}
      className={`tap-player${isPlaying ? ' is-playing' : ''}`}
    >
      <YouTube
        videoId={videoId}
        title={title}
        className="tap-player-frame"
        iframeClassName="tap-player-iframe"
        opts={{
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { ...buildEmbedPlayerVars(startSeconds), controls: 0, disablekb: 1 },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onPlay={onPlay}
        onPause={onPause}
        onEnd={onEnd}
      />

      <button
        type="button"
        className="tap-player-surface"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      />

      <div className="tap-player-topbar">
        {badge && <span className="tap-player-badge">{badge}</span>}
        {instructor && <span className="tap-player-instructor">{instructor}</span>}
      </div>

      <div className="tap-player-controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="tap-ctrl tap-ctrl-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <input
          type="range"
          className="tap-seek"
          min={0}
          max={duration || 0}
          step="any"
          value={currentTime}
          onChange={handleSeek}
          style={{ '--tap-fill': `${seekPercent}%` }}
          aria-label="Seek"
        />

        <span className="tap-time">-{formatClock(remaining)}</span>

        <div className="tap-volume">
          <button type="button" className="tap-ctrl" onClick={toggleMute} aria-label="Mute / unmute">
            {effectiveVolume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            className="tap-volume-slider"
            min={0}
            max={100}
            value={effectiveVolume}
            onChange={handleVolume}
            style={{ '--tap-fill': `${effectiveVolume}%` }}
            aria-label="Volume"
          />
        </div>

        <div className="tap-settings">
          <button
            type="button"
            className="tap-ctrl"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Playback settings"
            aria-expanded={settingsOpen}
          >
            ⚙
          </button>
          {settingsOpen && (
            <div className="tap-settings-menu">
              <p className="tap-settings-label">Speed</p>
              {rates.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  className={rate === playbackRate ? 'active' : ''}
                  onClick={() => selectRate(rate)}
                >
                  {rate === 1 ? 'Normal' : `${rate}x`}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="tap-ctrl"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? '🗗' : '⛶'}
        </button>
      </div>
    </div>
  )
}
