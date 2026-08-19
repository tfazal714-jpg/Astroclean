// ---------------------------------------------------------------------------
// Safe localStorage wrapper.
//
// Every read/write is wrapped in try/catch so a private-mode or quota
// failure can never break the app. Values are JSON-serialised.
// ---------------------------------------------------------------------------

/** Reads and JSON-parses a value. Returns `fallback` on any failure. */
export function readStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** JSON-serialises and writes a value. Never throws. */
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Removes a key. Never throws. */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/** Reads a plain string value (no JSON). */
export function readStorageString(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

/** Writes a plain string value. */
export function writeStorageString(key, value) {
  try {
    localStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}

/** Removes every key that starts with a given prefix. */
export function clearStoragePrefix(prefix) {
  try {
    const doomed = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) doomed.push(key)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
  } catch {
    // Non-fatal.
  }
}

/** Returns a human-readable summary of how much storage the app uses. */
export function storageUsage(prefix = 'astroclean') {
  let bytes = 0
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2
      }
    }
  } catch {
    // Non-fatal.
  }
  return bytes
}
