// ---------------------------------------------------------------------------
// String helpers: pluralisation, initials, slugs, truncation and a tiny
// fuzzy matcher used by the command palette.
// ---------------------------------------------------------------------------

/** Pluralises a word: pluralize(1, 'row') -> "1 row", pluralize(3, 'row') -> "3 rows". */
export function pluralize(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`
}

/** Returns up to two initials from a name: "Acme Corp" -> "AC". */
export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Slugifies a string: "Hello World!" -> "hello-world". */
export function slugify(str) {
  return String(str ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Capitalises the first letter: "hello" -> "Hello". */
export function capitalize(str) {
  const s = String(str ?? '')
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

/** Truncates to `max` chars with an ellipsis at a word boundary when possible. */
export function truncateSmart(str, max = 60) {
  const s = String(str ?? '')
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

/** Strips HTML-ish tags from a string (defensive). */
export function stripTags(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '')
}

/** Counts words in a string. */
export function wordCount(str) {
  return String(str ?? '').trim() === '' ? 0 : String(str ?? '').trim().split(/\s+/).length
}

/**
 * Tiny fuzzy matcher — true when every character of `query` appears in
 * `target` in order (case-insensitive). Used by the command palette.
 */
export function fuzzyMatch(query, target) {
  const q = String(query ?? '').toLowerCase().trim()
  const t = String(target ?? '').toLowerCase()
  if (q === '') return true
  if (t.includes(q)) return true
  let ti = 0
  for (let qi = 0; qi < q.length; qi += 1) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return false
    ti = found + 1
  }
  return true
}

/** Returns a stable-ish color class for a given string (hashed pick). */
export function hashColor(str, palette) {
  const list = palette ?? ['accent-700', 'accent-600', 'accent-500', 'accent-800']
  let h = 0
  for (let i = 0; i < String(str ?? '').length; i += 1) {
    h = (h * 31 + String(str).charCodeAt(i)) >>> 0
  }
  return list[h % list.length]
}
