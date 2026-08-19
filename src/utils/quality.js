// ---------------------------------------------------------------------------
// Data quality scoring.
//
// Runs a handful of aggregate queries against the working table and turns the
// results into a 0-100 score plus a list of human-readable issues, so the
// user can see at a glance how "clean" a dataset is before exporting.
// ---------------------------------------------------------------------------

import { getColumnStats } from '../services/duckdb.js'
import { query } from '../services/duckdb.js'

const q = (name) => `"${String(name).replace(/"/g, '""')}"`

/**
 * Computes a quality report for a table.
 *
 * @param {string} tableName
 * @param {Array<{name: string, type: string}>} columns
 * @returns {Promise<{ score: number, totalRows: number, duplicateRows: number,
 *   emptyCells: number, totalCells: number, issues: Array<{severity: 'error'|'warn'|'info', message: string, column?: string}>,
 *   columnStats: Array<object> }>}
 */
export async function computeQuality(tableName, columns) {
  const totalRows = Number((await query(`SELECT COUNT(*) AS n FROM ${q(tableName)}`)).toArray()[0].n)

  // Full-row duplicates.
  const dup = await query(
    `SELECT COUNT(*) AS n FROM (
       SELECT * FROM ${q(tableName)}
       GROUP BY ALL HAVING COUNT(*) > 1
     )`,
  )
  const duplicateRows = Number(dup.toArray()[0].n)

  const emptyResult = await query(
    `SELECT COUNT(*) AS n FROM ${q(tableName)} WHERE (
       ${columns.map((c) => `${q(c.name)} IS NULL OR TRIM(CAST(${q(c.name)} AS VARCHAR)) = ''`).join(' OR ')}
     )`,
  )
  void emptyResult

  // Per-column stats (reuses the columns panel machinery).
  const columnStats = []
  for (const col of columns) {
    try {
      columnStats.push({ name: col.name, type: col.type, ...(await getColumnStats(tableName, col.name)) })
    } catch {
      columnStats.push({ name: col.name, type: col.type, error: true })
    }
  }

  const totalCells = totalRows * columns.length
  const nonEmptyCells = columnStats.reduce((acc, c) => acc + (c.nonEmpty ?? 0), 0)
  const emptyCellCount = totalCells - nonEmptyCells

  const issues = []
  let score = 100

  if (totalRows === 0) {
    issues.push({ severity: 'error', message: 'The table has no rows.' })
    return { score: 0, totalRows, duplicateRows: 0, emptyCells: 0, totalCells: 0, issues, columnStats }
  }

  if (duplicateRows > 0) {
    score -= Math.min(25, duplicateRows * 2)
    issues.push({
      severity: duplicateRows > totalRows * 0.05 ? 'error' : 'warn',
      message: `${duplicateRows.toLocaleString()} duplicate row${duplicateRows === 1 ? '' : 's'} — run “Remove duplicates”.`,
    })
  }

  const emptyPct = (emptyCellCount / totalCells) * 100
  if (emptyPct > 30) {
    score -= 20
    issues.push({ severity: 'warn', message: `${emptyPct.toFixed(0)}% of cells are empty — consider “Fill empty values”.` })
  } else if (emptyPct > 10) {
    score -= 10
    issues.push({ severity: 'info', message: `${emptyPct.toFixed(0)}% of cells are empty.` })
  }

  for (const col of columnStats) {
    if (col.error) continue
    if (col.looksEmail > 0 && col.nonEmpty > 0 && col.looksEmail < col.nonEmpty) {
      const bad = col.nonEmpty - col.looksEmail
      const pct = (bad / col.nonEmpty) * 100
      score -= Math.min(15, pct * 0.25)
      issues.push({
        severity: pct > 25 ? 'error' : 'warn',
        column: col.name,
        message: `${bad.toLocaleString()} value${bad === 1 ? '' : 's'} don't look like valid emails — try “Normalize email”.`,
      })
    }
    if (col.looksPhone > 0 && col.nonEmpty > 0 && col.looksPhone < col.nonEmpty * 0.9) {
      const bad = col.nonEmpty - col.looksPhone
      score -= Math.min(10, bad)
      issues.push({
        severity: 'warn',
        column: col.name,
        message: `${bad.toLocaleString()} value${bad === 1 ? '' : 's'} don't look like phone numbers — try “Normalize phone”.`,
      })
    }
  }

  // Type consistency: text columns that are mostly numbers.
  for (const col of columnStats) {
    if (col.error || !/VARCHAR|TEXT/.test(String(col.type).toUpperCase())) continue
    if (col.nonEmpty === 0) continue
    const numericPct = ((col.looksNumber ?? 0) / col.nonEmpty) * 100
    if (numericPct > 50 && numericPct < 100) {
      score -= 3
      issues.push({
        severity: 'info',
        column: col.name,
        message: `${numericPct.toFixed(0)}% of this column looks numeric — “Infer column types” could convert it.`,
      })
    }
  }

  // Cap + floor.
  score = Math.max(0, Math.min(100, Math.round(score)))

  issues.sort((a, b) => (a.severity === 'error' ? -1 : 0) - (b.severity === 'error' ? -1 : 0))

  return {
    score,
    totalRows,
    duplicateRows,
    emptyCells: emptyCellCount,
    totalCells,
    issues,
    columnStats,
  }
}

/** Renders the report as plain text (used for the downloadable report). */
export function qualityReportText(report, tableName) {
  const lines = [
    `AstroClean quality report — ${tableName}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Overall score: ${report.score}/100`,
    `Rows: ${report.totalRows.toLocaleString()}`,
    `Duplicate rows: ${report.duplicateRows.toLocaleString()}`,
    `Empty cells: ${report.emptyCells.toLocaleString()} of ${report.totalCells.toLocaleString()}`,
    '',
    'Issues:',
  ]
  if (report.issues.length === 0) {
    lines.push('  None — the dataset looks clean.')
  } else {
    for (const issue of report.issues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.column ? `${issue.column}: ` : ''}${issue.message}`)
    }
  }
  return lines.join('\n')
}
