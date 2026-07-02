import { useCallback, useEffect, useRef } from 'react'

const TRACKING_INTERVAL_MS = 10000
const COMPLETE_THRESHOLD_PERCENT = 90

function normalizeProgress(progress) {
  if (!progress) return null

  return {
    lessonId: progress.lessonId,
    seconds: progress.currentTime || 0,
    duration: progress.duration || 0,
    percent: progress.watchPercentage || 0,
    completed: Boolean(progress.completed),
    updatedAt: progress.updatedAt,
  }
}

export default function usePlaybackTracker({
  player,
  lessonId,
  enabled = true,
  onProgress,
  onComplete,
}) {
  const intervalRef = useRef(null)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onProgressRef.current = onProgress
    onCompleteRef.current = onComplete
  }, [onComplete, onProgress])

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const saveProgress = useCallback(async (forceComplete = false) => {
    if (!enabled || !lessonId || !player?.getCurrentTime || !player?.getDuration) return null

    const currentTime = Math.max(0, Math.floor(player.getCurrentTime() || 0))
    const duration = Math.max(0, Math.floor(player.getDuration() || 0))
    const watchPercentage = duration
      ? Math.min(100, Math.floor((currentTime / duration) * 100))
      : 0
    const completed = forceComplete || watchPercentage >= COMPLETE_THRESHOLD_PERCENT

    const response = await fetch(`/api/lessons/${lessonId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        currentTime,
        duration,
        watchPercentage,
        completed,
      }),
    })

    if (!response.ok) return null

    const saved = normalizeProgress(await response.json())
    onProgressRef.current?.(saved)
    if (saved?.completed) onCompleteRef.current?.(saved)
    return saved
  }, [enabled, lessonId, player])

  const startTracking = useCallback(() => {
    if (!enabled || intervalRef.current) return
    intervalRef.current = setInterval(() => {
      saveProgress()
    }, TRACKING_INTERVAL_MS)
  }, [enabled, saveProgress])

  useEffect(() => () => {
    stopTracking()
    saveProgress()
  }, [saveProgress, stopTracking])

  return {
    saveProgress,
    startTracking,
    stopTracking,
  }
}
