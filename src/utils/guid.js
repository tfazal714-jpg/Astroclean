// ---------------------------------------------------------------------------
// Identifier generation.
// ---------------------------------------------------------------------------

/** Returns a random UUID v4 when available, else a timestamp-based fallback. */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Short random id: "a3f9k2". */
export function shortId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const rand =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(length))
      : null
  for (let i = 0; i < length; i += 1) {
    out += chars[(rand ? rand[i] : Math.random() * chars.length) % chars.length]
  }
  return out
}

/** Monotonic counter for ordering events within a session. */
export function createIdFactory(prefix = 'item') {
  let counter = 0
  return () => `${prefix}_${Date.now().toString(36)}_${(counter += 1)}`
}
