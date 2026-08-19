// ---------------------------------------------------------------------------
// User activity metrics (localStorage only — never leaves the browser).
//
// Tracks how many files the user has processed, total rows, operations,
// exports and AI values, plus a per-file history list so the user can see
// "which file, how many rows, what was done" at a glance.
// ---------------------------------------------------------------------------

const ACTIVITY_KEY = 'astroclean:activity'
const HISTORY_KEY = 'astroclean:activity:history'
const MAX_HISTORY = 60

export function emptyActivity() {
  return {
    filesProcessed: 0,
    totalRows: 0,
    totalColumns: 0,
    opsApplied: 0,
    exports: 0,
    aiValues: 0,
    firstSeen: null,
    lastSeen: null,
  }
}

export function loadActivity() {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return emptyActivity()
    return { ...emptyActivity(), ...JSON.parse(raw) }
  } catch {
    return emptyActivity()
  }
}

function saveActivity(activity) {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity))
  } catch {
    // Storage unavailable — metrics are best-effort.
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // Non-fatal.
  }
}

// Id of the file currently open in the workspace, so per-file counters
// (ops, exports, AI values) land on the right history entry.
let currentFileId = null
export function setCurrentFileId(id) {
  currentFileId = id
}

function touchHistory(key, delta) {
  if (!currentFileId) return
  const history = loadHistory()
  const entry = history.find((e) => e.id === currentFileId)
  if (!entry) return
  entry[key] = (entry[key] ?? 0) + delta
  saveHistory(history)
}

/** Records a freshly loaded dataset. Returns the new aggregate activity. */
export function recordFile(name, source, rows, cols) {
  const activity = loadActivity()
  activity.filesProcessed += 1
  activity.totalRows += rows
  activity.totalColumns += cols
  activity.firstSeen = activity.firstSeen ?? Date.now()
  activity.lastSeen = Date.now()
  saveActivity(activity)

  const id = Date.now()
  currentFileId = id
  const history = loadHistory()
  history.unshift({
    id,
    name,
    source,
    rows,
    cols,
    ops: 0,
    exports: 0,
    aiValues: 0,
    openedAt: id,
  })
  saveHistory(history.slice(0, MAX_HISTORY))
  return activity
}

/** Records an applied pipeline operation. Returns the new aggregate activity. */
export function recordOp() {
  const activity = loadActivity()
  activity.opsApplied += 1
  activity.lastSeen = Date.now()
  saveActivity(activity)
  touchHistory('ops', 1)
  return activity
}

/** Records a CSV export. Returns the new aggregate activity. */
export function recordExport() {
  const activity = loadActivity()
  activity.exports += 1
  activity.lastSeen = Date.now()
  saveActivity(activity)
  touchHistory('exports', 1)
  return activity
}

/** Records AI values generated through the API. Returns the new aggregate activity. */
export function recordAiValues(n) {
  const count = Number(n) || 0
  if (count <= 0) return null
  const activity = loadActivity()
  activity.aiValues += count
  activity.lastSeen = Date.now()
  saveActivity(activity)
  touchHistory('aiValues', count)
  return activity
}

/** Wipes all stored activity. */
export function clearActivity() {
  currentFileId = null
  try {
    localStorage.removeItem(ACTIVITY_KEY)
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // Non-fatal.
  }
}
