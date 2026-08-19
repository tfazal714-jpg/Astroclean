// ---------------------------------------------------------------------------
// Minimal, robust CSV parsing / stringifying helpers.
//
// The primary import path uses DuckDB's native `read_csv` (fast, handles
// quoting/escapes/CRLF). These helpers are the fallback for files DuckDB
// cannot auto-detect, and the safety net for client-side export.
// ---------------------------------------------------------------------------

/**
 * Parses CSV text into { columns, rows }.
 *
 * Handles quoted fields, escaped quotes (""), embedded commas/newlines,
 * and CRLF line endings. Rows shorter than the header are padded with null;
 * rows longer are truncated. A leading BOM is stripped from the header.
 *
 * @param {string} text Raw file contents.
 * @returns {{ columns: string[], rows: Array<Record<string, string | null>> }}
 */
export function parseCsv(text) {
  const chars = Array.from(text)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  // Tokenize into rows of fields.
  while (i < chars.length) {
    const ch = chars[i]
    if (inQuotes) {
      if (ch === '"') {
        if (chars[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && chars[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i += 1
      continue
    }
    field += ch
    i += 1
  }

  // Flush the last field/row if the file did not end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully empty trailing rows (e.g. trailing blank line).
  while (rows.length > 0 && rows[rows.length - 1].every((v) => v === '')) {
    rows.pop()
  }

  if (rows.length === 0) {
    return { columns: [], rows: [] }
  }

  let columns = rows[0].map((c) => c.trim())
  // Strip BOM from the first header cell.
  if (columns.length > 0 && columns[0].charCodeAt(0) === 0xfeff) {
    columns[0] = columns[0].slice(1)
  }
  // De-duplicate and de-empty header names so object keys stay unique.
  const seen = new Map()
  columns = columns.map((name, idx) => {
    const base = name === '' ? `column_${idx + 1}` : name
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })

  const dataRows = rows.slice(1).map((raw) => {
    const obj = {}
    for (let c = 0; c < columns.length; c += 1) {
      const value = raw[c]
      obj[columns[c]] = value === undefined ? null : value
    }
    return obj
  })

  return { columns, rows: dataRows }
}

/**
 * Converts an array of objects to delimited text with correct quoting.
 * Used as a fallback for export if DuckDB's COPY-to-buffer path fails.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ delimiter?: string, includeHeader?: boolean, nullValue?: string }} opts
 * @returns {string}
 */
export function stringifyRows(rows, { delimiter = ',', includeHeader = true, nullValue = '' } = {}) {
  if (!rows || rows.length === 0) return ''

  const columns = Object.keys(rows[0])
  const escape = (value) => {
    const str = value === null || value === undefined ? String(nullValue ?? '') : String(value)
    if (str.includes(delimiter) || /["\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = includeHeader ? [columns.map(escape).join(delimiter)] : []
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(delimiter))
  }
  return lines.join('\n')
}
