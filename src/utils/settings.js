// ---------------------------------------------------------------------------
// App settings (localStorage only).
//
// Settings are intentionally small and safe: appearance, export defaults and
// grid behaviour. They never leave the browser.
// ---------------------------------------------------------------------------

import { readStorage, writeStorage } from './storage.js'

const SETTINGS_KEY = 'astroclean:settings'
const TOUR_KEY = 'astroclean:tourDone'

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'light' | 'dark'
  reduceMotion: false, // force-reduce animations even in light OS preference
  export: {
    format: 'csv', // 'csv' | 'tsv' | 'json'
    delimiter: ',',
    includeHeader: true,
    nullValue: '',
  },
  grid: {
    density: 'comfortable', // 'compact' | 'comfortable'
    pageSize: 500,
  },
  onboardingDone: false,
  shortcuts: true,
}

/** Loads settings, merging over defaults so new keys always exist. */
export function loadSettings() {
  const stored = readStorage(SETTINGS_KEY, {})
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    export: { ...DEFAULT_SETTINGS.export, ...(stored?.export ?? {}) },
    grid: { ...DEFAULT_SETTINGS.grid, ...(stored?.grid ?? {}) },
  }
  return merged
}

/** Persists settings (partial updates allowed). */
export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch }
  if (patch?.export) next.export = { ...loadSettings().export, ...patch.export }
  if (patch?.grid) next.grid = { ...loadSettings().grid, ...patch.grid }
  writeStorage(SETTINGS_KEY, next)
  return next
}

/** Returns whether the onboarding tour has been completed. */
export function tourCompleted() {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return false
  }
}

/** Marks the onboarding tour as completed. */
export function markTourCompleted() {
  try {
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    // Non-fatal.
  }
}

/** Resets the tour so it can be replayed. */
export function resetTour() {
  try {
    localStorage.removeItem(TOUR_KEY)
  } catch {
    // Non-fatal.
  }
}

/** Resolves the effective theme (system preference applied). */
export function resolveTheme(theme, systemDark) {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  return systemDark ? 'dark' : 'light'
}
