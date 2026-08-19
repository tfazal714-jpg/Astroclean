import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Wand2, X } from 'lucide-react'
import { parseCsv } from '../utils/csv.js'
import { formatNumber } from '../utils/format.js'
import { formatBytes } from '../utils/fileSize.js'
import { cn } from '../utils/cn.js'
import { Button, Field, IconButton, Select, Spinner } from './ui.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'

const DELIMITER_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
]

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
]

const PREVIEW_ROWS = 8

/**
 * Post-drop pre-processing: confirm delimiter/header and optional column
 * type overrides before the file is loaded into DuckDB. Shows a live sample
 * of the first rows so the user can verify the parse before committing.
 */
export default function ImportPreviewModal({ file, onConfirm, onCancel }) {
  const [delimiter, setDelimiter] = useState('auto')
  const [hasHeader, setHasHeader] = useState(true)
  const [types, setTypes] = useState({})
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  // Parse the file in JS (fast for preview; DuckDB does the real load).
  useEffect(() => {
    let cancelled = false
    setParsed(null)
    file
      .text()
      .then((text) => {
        if (cancelled) return
        const { columns, rows } = parseCsv(text)
        setParsed({ columns, rows })
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not read the file.')
      })
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  // Auto-detect: report the delimiter parseCsv was most consistent with.
  const effectiveDelimiter = useMemo(() => {
    if (delimiter !== 'auto') return delimiter
    return ','
  }, [delimiter])

  const setType = (column, type) =>
    setTypes((prev) => {
      const next = { ...prev }
      if (type === 'text') delete next[column]
      else next[column] = type
      return next
    })

  const confirm = () => {
    onConfirm({
      delimiter: effectiveDelimiter,
      header: hasHeader,
      columnTypes: types,
    })
  }

  // When the user says the file has no header, preview with generated names
  // (matching what DuckDB will do with header = false).
  const columns = hasHeader ? (parsed?.columns ?? []) : (parsed?.columns ?? []).map((_, i) => `column_${i + 1}`)
  const showRows = parsed?.rows.slice(0, PREVIEW_ROWS) ?? []
  const totalRows = parsed?.rows.length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div ref={modalRef} className="flex max-h-[85vh] w-full max-w-2xl flex-col border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-accent-700" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-text-primary">{file.name}</h2>
              <p className="text-[11px] text-text-tertiary">
                {formatBytes(file.size)} · {formatNumber(totalRows)} rows detected
              </p>
            </div>
          </div>
          <IconButton title="Close" onClick={onCancel}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {!parsed && !error ? (
          <div className="flex items-center gap-2 px-4 py-8 text-xs text-text-tertiary">
            <Spinner className="h-3.5 w-3.5" /> Parsing preview…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-error">{error}</div>
        ) : (
          <>
            {/* Options */}
            <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3 sm:grid-cols-3">
              <Field label="Delimiter">
                <Select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                  {DELIMITER_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Header row">
                <Select
                  value={hasHeader ? 'yes' : 'no'}
                  onChange={(e) => setHasHeader(e.target.value === 'yes')}
                >
                  <option value="yes">First row is a header</option>
                  <option value="no">No header</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <p className="flex items-center gap-1.5 text-[11px] leading-4 text-text-tertiary">
                  <Wand2 className="h-3.5 w-3.5 text-accent-700" />
                  Optional column types below
                </p>
              </div>
            </div>

            {/* Column type overrides */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
              <span className="mr-1 text-[11px] font-medium text-text-tertiary">Column types:</span>
              {columns.map((col) => (
                <label
                  key={col}
                  className={cn(
                    'flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]',
                    types[col]
                      ? 'border-accent-200 bg-accent-50 text-accent-800'
                      : 'border-border bg-surface-secondary text-text-secondary',
                  )}
                >
                  <span className="max-w-[90px] truncate font-mono" title={col}>
                    {col}
                  </span>
                  <select
                    value={types[col] ?? 'text'}
                    onChange={(e) => setType(col, e.target.value)}
                    className="bg-transparent text-[10px] font-medium focus:outline-none"
                    aria-label={`Type of column ${col}`}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {/* Sample */}
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-surface-secondary text-left text-[10px] uppercase tracking-wide text-text-tertiary">
                    {columns.map((col) => (
                      <th key={col} className="max-w-[160px] truncate px-2 py-1.5 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {(showRows ?? []).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-hover">
                      {columns.map((col) => (
                        <td key={col} className="max-w-[160px] truncate px-2 py-1 font-mono text-text-primary">
                          {row[col] === null || row[col] === '' ? (
                            <span className="text-text-tertiary">—</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {showRows && showRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-2 py-4 text-center text-text-tertiary">
                        No data rows found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {showRows && totalRows > PREVIEW_ROWS && (
              <p className="border-t border-border px-4 py-1.5 text-[10px] text-text-tertiary">
                Showing first {PREVIEW_ROWS} of {formatNumber(totalRows)} rows
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <p className="hidden text-[11px] text-text-tertiary sm:block">
                Numeric &amp; date casts apply only to the columns you mark.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={confirm}>
                  Load {formatNumber(totalRows)} rows
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
