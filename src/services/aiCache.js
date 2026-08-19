// ---------------------------------------------------------------------------
// Cache for AI enrichment results (IndexedDB via Dexie).
//
// The pipeline replays from the raw upload on every change. AI ops are
// non-deterministic and cost money, so their results are cached keyed by the
// full pipeline prefix that produced the table. Undo/redo or re-applying the
// same op afterwards is then instant and free. Any change to earlier ops
// changes the key, so stale results are never reused.
//
// Values are keyed by a content hash of the row (all columns except the
// output column), so results stay correct even if DuckDB returns rows in a
// different order between replays.
// ---------------------------------------------------------------------------

import Dexie from 'dexie'

const db = new Dexie('astroclean')
db.version(1).stores({ aiCache: 'opKey, createdAt' })

/** Fast deterministic string hash (djb2), hex-encoded. */
export function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

/** Content hash of a row (sorted keys, output column excluded). */
export function rowHash(row, exclude) {
  const parts = Object.keys(row)
    .filter((k) => k !== exclude && k !== '__rid')
    .sort()
    .map((k) => `${k}=${row[k] === null || row[k] === undefined ? '' : String(row[k])}`)
  return hashString(parts.join('|'))
}

const MAX_ENTRIES = 24

/** Returns Map<hash, value> or null on miss. */
export async function getAiCache(opKey) {
  try {
    const rec = await db.aiCache.get(opKey)
    return rec && Array.isArray(rec.values) ? new Map(rec.values) : null
  } catch {
    return null
  }
}

/** Stores Map<hash, value>; prunes oldest entries beyond MAX_ENTRIES. */
export async function setAiCache(opKey, values) {
  try {
    await db.aiCache.put({ opKey, values: [...values.entries()], createdAt: Date.now() })
    const all = await db.aiCache.orderBy('createdAt').reverse().toArray()
    if (all.length > MAX_ENTRIES) {
      await db.aiCache.bulkDelete(all.slice(MAX_ENTRIES).map((r) => r.opKey))
    }
  } catch {
    // Cache failures are non-fatal.
  }
}

/** Empties the entire AI result cache. */
export async function clearAiCache() {
  try {
    await db.aiCache.clear()
  } catch {
    // Non-fatal.
  }
}
