import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { CONTENT_DEFAULTS } from '../content/siteContent'

// Tiny shared store: one entry per page slug, merged defaults + DB overrides.
// All components using useContent(page) stay in sync (edits in the admin tab
// update the header/footer instantly, and vice versa).
const snapshots = new Map() // page -> merged content object (stable reference)
const overrides = new Map() // page -> raw override sections from the DB
const fetched = new Set()
const listeners = new Map() // page -> Set<fn>

function getSnapshot(page) {
  if (!snapshots.has(page)) {
    snapshots.set(page, { ...(CONTENT_DEFAULTS[page] || {}) })
  }
  return snapshots.get(page)
}

function rebuild(page) {
  snapshots.set(page, { ...(CONTENT_DEFAULTS[page] || {}), ...(overrides.get(page) || {}) })
  for (const fn of listeners.get(page) || []) fn()
}

function subscribe(page, fn) {
  if (!listeners.has(page)) listeners.set(page, new Set())
  listeners.get(page).add(fn)
  return () => listeners.get(page).delete(fn)
}

async function fetchPage(page) {
  if (fetched.has(page)) return
  fetched.add(page)
  try {
    const res = await fetch(`/api/content/${page}`)
    if (!res.ok) return
    const data = await res.json()
    if (data.sections && Object.keys(data.sections).length > 0) {
      overrides.set(page, data.sections)
      rebuild(page)
    }
  } catch {
    // Offline / server hiccup: defaults keep the page rendering.
  }
}

export function useContent(page) {
  const content = useSyncExternalStore(
    useCallback((fn) => subscribe(page, fn), [page]),
    useCallback(() => getSnapshot(page), [page])
  )

  useEffect(() => {
    fetchPage(page)
  }, [page])

  const save = useCallback(
    async (sectionKey, value) => {
      const res = await fetch(`/api/content/${page}/${sectionKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      overrides.set(page, { ...(overrides.get(page) || {}), [sectionKey]: data.content })
      rebuild(page)
    },
    [page]
  )

  const reset = useCallback(
    async (sectionKey) => {
      const res = await fetch(`/api/content/${page}/${sectionKey}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok && res.status !== 204) throw new Error('Failed to reset')
      const current = { ...(overrides.get(page) || {}) }
      delete current[sectionKey]
      overrides.set(page, current)
      rebuild(page)
    },
    [page]
  )

  return { content, save, reset }
}
