import { useSyncExternalStore } from 'react'

function createSubscribe(query) {
  return (callback) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }
}

function createSnapshot(query) {
  return () => window.matchMedia(query).matches
}

/**
 * Reactively evaluates a CSS media query, e.g. useMediaQuery('(min-width: 640px)').
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(createSubscribe(query), createSnapshot(query), () => false)
}
