import { useEffect, useMemo, useState } from 'react'
import { Download, FileDown, X } from 'lucide-react'
import { exportTableToCsv, query } from '../services/duckdb.js'
import { formatNumber } from '../utils/format.js'
import { formatBytes } from '../utils/fileSize.js'
import { cn } from '../utils/cn.js'
import { Button, Field, IconButton, Select, Spinner, TextInput } from './ui.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useRef } from 'react'

const FORMATS = [
  { value: 'csv', label: 'CSV', hint: 'Comma-separated' },
  { value: 'tsv', label: 'TSV', hint: 'Tab-separated' },
  { value: 'json', label: 'JSON', hint: 'Row objects' },
]

const DELIMITERS = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
]

const ROW_FILTERS = [
  { value: 'all', label: 'All Leads', hint: 'Export every row' },
  { value: 'valid', label: 'Valid Only', hint: 'Rows where all _is_valid flags are true' },
  { value: 'flagged', label: 'Flagged Only', hint: 'Rows where any _is_valid flag is false' },
]

/**
 * Export modal: pick format, delimiter, row filter, and options, then download.
 * Shows file size and row count for confidence before the download starts.
 */
export default function ExportModal({
  dataset,
  defaults,
  onClose,
  onExported,
}) {
  const [format, setFormat] = useState(defaults?.format ?? 'csv')
  const [delimiter, setDelimiter] = useState(defaults?.delimiter ?? ',')
  const [includeHeader, setIncludeHeader] = useState(defaults?.includeHeader !== false)
  const [nullValue, setNullValue] = useState(defaults?.nullValue ?? '')
  const [rowFilter, setRowFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [filteredCount, setFilteredCount] = useState(null)
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Detect _is_valid / _e164_valid columns for filter options.
  const validColumns = useMemo(() => {
    if (!dataset?.columns) return []
    return dataset.columns
      .filter((c) => /_is_valid$/i.test(c.name))
      .map((c) => c.name)
  }, [dataset?.columns])

  const hasFilters = validColumns.length > 0

  // Build a WHERE clause for the selected row filter.
  const filterWhere = useMemo(() => {
    if (!hasFilters || rowFilter === 'all') return null
    if (rowFilter === 'valid') {
      return validColumns.map((c) => `"${c}" = true`).join(' AND ')
    }
    // flagged: any _is_valid column is false
    return validColumns.map((c) => `"${c}" = false OR "${c}" IS NULL`).join(' AND ')
  }, [rowFilter, validColumns, hasFilters])

  // Preview filtered row count when filter changes.
  useEffect(() => {
    if (!filterWhere) {
      setFilteredCount(null)
      return
    }
    let cancelled = false
    const q = `SELECT COUNT(*) AS n FROM "${dataset.workTable}" WHERE ${filterWhere}`
    query(q)
      .then((r) => {
        if (!cancelled) setFilteredCount(Number(r.toArray()[0].n))
      })
      .catch(() => {
        if (!cancelled) setFilteredCount(0)
      })
    return () => { cancelled = true }
  }, [filterWhere, dataset?.workTable])

  const displayRows = filteredCount ?? dataset?.rowCount ?? 0

  const estimateBytes = (() => {
    const perRow = format === 'json' ? 130 : 60
    return displayRows * perRow
  })()

  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      // If a row filter is active, create a temporary filtered view, export it,
      // then drop the view.
      let exportTable = dataset.workTable
      const tempView = filterWhere ? `__export_view_${Date.now()}` : null
      if (tempView) {
        await query(
          `CREATE OR REPLACE TEMP VIEW "${tempView}" AS SELECT * FROM "${dataset.workTable}" WHERE ${filterWhere}`,
        )
        exportTable = tempView
      }
      try {
        const blob = await exportTableToCsv(exportTable, {
          format,
          delimiter: format === 'tsv' ? '\t' : delimiter,
          includeHeader,
          nullValue,
        })
        const ext = format === 'json' ? 'json' : format === 'tsv' ? 'tsv' : 'csv'
        const base = dataset.name.replace(/\.(csv|tsv|json)$/i, '') || 'dataset'
        const filterLabel = rowFilter !== 'all' ? `-${rowFilter}` : ''
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${base}${filterLabel}-clean.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
        onExported?.(format)
        onClose()
      } finally {
        if (tempView) {
          await query(`DROP VIEW IF EXISTS "${tempView}"`).catch(() => {})
        }
      }
    } catch (err) {
      setError(err?.message || 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div ref={modalRef} className="w-full max-w-md border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <FileDown className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Export dataset</h2>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="space-y-4 px-4 py-4">
          {/* Row filter */}
          {hasFilters && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-text-secondary">Row filter</span>
              <div className="grid grid-cols-3 gap-2">
                {ROW_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setRowFilter(f.value)}
                    className={cn(
                      'rounded-sm border px-2 py-2 text-left transition-colors',
                      rowFilter === f.value
                        ? 'border-accent-600 bg-accent-50'
                        : 'border-border-secondary bg-surface hover:border-accent-600',
                    )}
                  >
                    <span className="block text-xs font-semibold text-text-primary">{f.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-3 text-text-tertiary">{f.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-secondary">Format</span>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'rounded-sm border px-2 py-2 text-left transition-colors',
                    format === f.value
                      ? 'border-accent-600 bg-accent-50'
                      : 'border-border-secondary bg-surface hover:border-accent-600',
                  )}
                >
                  <span className="block text-xs font-semibold text-text-primary">{f.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-3 text-text-tertiary">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {format !== 'json' && (
            <>
              <Field label="Delimiter">
                <Select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  disabled={format === 'tsv'}
                >
                  {DELIMITERS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="h-3.5 w-3.5 accent-accent-700"
                />
                Include header row
              </label>
            </>
          )}

          <Field label="Empty cells become" hint="Leave blank to keep them empty.">
            <TextInput
              value={nullValue}
              placeholder="(empty)"
              onChange={(e) => setNullValue(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between border border-border bg-surface-secondary/60 px-3 py-2 text-[11px] text-text-secondary">
            <span>
              <span className="font-semibold text-text-primary">{formatNumber(displayRows)}</span> rows
              {rowFilter !== 'all' && (
                <span className="text-text-tertiary"> (filtered)</span>
              )}
              {' '}&middot; {dataset.columns.length} columns
            </span>
            <span className="font-mono tabular-nums">{formatBytes(estimateBytes)} est.</span>
          </div>

          {error && (
            <div className="rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={busy || (rowFilter !== 'all' && displayRows === 0)}
          >
            {busy ? (
              <>
                <Spinner className="h-3 w-3" /> Exporting...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Download
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
