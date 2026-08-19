// ---------------------------------------------------------------------------
// Human-readable file size + generic number formatting for uploads.
// ---------------------------------------------------------------------------

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Formats bytes as "4.2 MB" (binary units, 1024 base). */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—'
  let value = Number(bytes)
  if (value < 0) value = 0
  if (value < 1024) return `${Math.round(value)} B`
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** Formats a count with a trailing unit word, e.g. (12, "row") -> "12 rows". */
export function formatCount(value, unit = '') {
  const n = Number(value) || 0
  const label = n === 1 ? unit : `${unit}s`
  return `${n.toLocaleString('en-US')}${label ? ` ${label}` : ''}`
}

/** Estimates rows in a CSV from its byte size (rough, for upload hints). */
export function estimateRowsFromBytes(bytes) {
  const b = Number(bytes) || 0
  if (b === 0) return 0
  // ~55 bytes per average lead row.
  return Math.round(b / 55)
}

/** Parses a size string like "5MB" back to bytes. Used by tests only. */
export function parseBytes(str) {
  const m = String(str ?? '').trim().match(/^([\d.]+)\s*(b|kb|mb|gb)?$/i)
  if (!m) return null
  const value = Number(m[1])
  const unit = (m[2] ?? 'b').toLowerCase()
  const mult = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[unit]
  return Math.round(value * mult)
}
