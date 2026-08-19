// ---------------------------------------------------------------------------
// Formatting + download helpers shared across the UI.
// ---------------------------------------------------------------------------

/** Formats a number with locale separators (e.g. 12,450). */
export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0'
  }
  return Number(value).toLocaleString('en-US')
}

/** Formats a value for display inside a data cell. */
export function formatCellValue(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    // Deterministic, timezone-free rendering of DuckDB DATE/TIMESTAMP values.
    if (Number.isNaN(value.getTime())) return String(value)
    const pad = (n) => String(n).padStart(2, '0')
    const hasTime =
      value.getHours() || value.getMinutes() || value.getSeconds()
    const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    return hasTime
      ? `${date} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
      : date
  }
  return String(value)
}

/** Triggers a browser download of the given blob. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Shortens a long identifier for tight table cells. */
export function truncate(str, max = 24) {
  const s = str ?? ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
