// ---------------------------------------------------------------------------
// Date/time helpers shared across the UI (metrics, history, exports).
// ---------------------------------------------------------------------------

/** Formats a timestamp as "Aug 18, 2026". */
export function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Formats a timestamp as "2:15 PM". */
export function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Formats a timestamp as "Aug 18, 2026 · 2:15 PM". */
export function formatDateTime(ts) {
  if (!ts) return '—'
  return `${formatDate(ts)} · ${formatTime(ts)}`
}

/** Compact relative time: "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(ts, now = Date.now()) {
  if (!ts) return '—'
  const diff = Math.max(0, now - ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(ts)
}

/** Returns a short weekday label for a Date. */
export function weekday(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/** Returns "Mon" / "Tue" / … / "Sun" for a timestamp. */
export function weekdayOf(ts) {
  return weekday(new Date(ts))
}

/**
 * Buckets timestamps into a per-day activity map for the last `days` days.
 * Returns [{ label, count }] with the most recent day last.
 */
export function activityByDay(timestamps, days = 7, now = Date.now()) {
  const buckets = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    dayStart.setDate(dayStart.getDate() - i)
    const next = new Date(dayStart)
    next.setDate(next.getDate() + 1)
    const count = timestamps.filter((t) => t >= dayStart.getTime() && t < next.getTime()).length
    buckets.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : weekday(dayStart),
      count,
      ts: dayStart.getTime(),
    })
  }
  return buckets
}

/** Formats a duration in seconds as "2m 14s" or "1h 05m". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m < 60) return rest ? `${m}m ${String(rest).padStart(2, '0')}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${String(rm).padStart(2, '0')}m`
}
