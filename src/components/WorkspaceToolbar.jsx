import { useCallback, useEffect, useState } from 'react'
import { Download, Filter, X, ChevronDown, Tag } from 'lucide-react'
import { query } from '../services/duckdb.js'
import { cn } from '../utils/cn.js'

const q = (name) => `"${String(name).replace(/"/g, '""')}"`

function detectColumnType(values) {
  if (!values || values.length === 0) return 'Text'
  const sample = values.slice(0, 50)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const dateRe = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/
  const numCount = sample.filter((v) => v !== '' && !isNaN(Number(v))).length
  const emailCount = sample.filter((v) => emailRe.test(v)).length
  const dateCount = sample.filter((v) => dateRe.test(v)).length
  if (numCount > sample.length * 0.8) return 'Number'
  if (emailCount > sample.length * 0.8) return 'Email'
  if (dateCount > sample.length * 0.8) return 'Date'
  return 'Text'
}

const TYPE_COLORS = {
  Text: 'bg-[#3b3b3b] text-[#cccccc]',
  Number: 'bg-[#107c41]/25 text-[#4fbe7d]',
  Email: 'bg-[#6366f1]/20 text-[#818cf8]',
  Date: 'bg-[#d97706]/20 text-[#f59e0b]',
}

export default function WorkspaceToolbar({ table, columns, refreshKey, onApplyOp, onExport }) {
  const [columnData, setColumnData] = useState({})
  const [typesOpen, setTypesOpen] = useState(false)
  const [filterCol, setFilterCol] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const data = {}
      for (const col of columns.slice(0, 20)) {
        try {
          const rows = await query(`SELECT DISTINCT ${q(col.name)} AS v FROM ${q(table)} LIMIT 50`)
          if (!cancelled) data[col.name] = rows.map((r) => String(r.v ?? ''))
        } catch {
          // sampling is best effort, a failed column just shows as Text
        }
      }
      if (!cancelled) setColumnData(data)
    }
    load()
    return () => { cancelled = true }
  }, [table, columns, refreshKey])

  const dropEmptyColumns = useCallback(async () => {
    if (scanning || columns.length === 0) return
    setScanning(true)
    try {
      const sums = columns
        .map((c) => `SUM(CASE WHEN ${q(c.name)} IS NULL OR TRIM(CAST(${q(c.name)} AS VARCHAR)) = '' THEN 1 ELSE 0 END) AS ${q(`__e_${c.name}`)}`)
        .join(', ')
      const row = (await query(`SELECT COUNT(*) AS __total, ${sums} FROM ${q(table)}`))[0]
      const total = Number(row?.__total ?? 0)
      if (total > 0) {
        const empty = columns.filter((c) => Number(row[`__e_${c.name}`]) === total)
        if (empty.length > 0) {
          onApplyOp({ type: 'dropColumns', params: { columns: empty.map((c) => c.name) } })
        }
      }
    } catch {
      // if the scan fails we leave the table alone
    } finally {
      setScanning(false)
    }
  }, [columns, table, onApplyOp, scanning])

  const handleFilterAction = useCallback((colName, actionId) => {
    setFilterCol(null)
    if (actionId === 'sort-asc') onApplyOp({ type: 'sortRows', params: { column: colName, direction: 'ASC' } })
    if (actionId === 'sort-desc') onApplyOp({ type: 'sortRows', params: { column: colName, direction: 'DESC' } })
    if (actionId === 'drop-blanks') onApplyOp({ type: 'filterRows', params: { column: colName, mode: 'regex', match: '^\\s*$', action: 'drop' } })
  }, [onApplyOp])

  const actionBtn = 'flex h-6 items-center gap-1.5 rounded-sm border border-[#3b3b3b] px-2.5 text-[11px] text-[#d4d4d4] transition-colors hover:border-[#107c41] hover:text-white disabled:opacity-50'

  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[#2d2d2d] bg-[#181818] px-2">
      <button type="button" className={actionBtn} onClick={() => onApplyOp({ type: 'trim', params: { columns: null } })}>
        Trim Whitespace
      </button>
      <button type="button" className={actionBtn} onClick={() => onApplyOp({ type: 'dedupe', params: { columns: null } })}>
        Deduplicate Rows
      </button>
      <button type="button" className={actionBtn} disabled={scanning} onClick={dropEmptyColumns}>
        {scanning ? 'Scanning...' : 'Drop Empty Columns'}
      </button>
      <button type="button" className={actionBtn} onClick={() => onApplyOp({ type: 'fillEmpty', params: { columns: null, value: '' } })}>
        Fill Empty Cells
      </button>

      <div className="relative ml-auto">
        <button type="button" className={cn(actionBtn)} onClick={() => setTypesOpen(!typesOpen)}>
          <Tag className="h-3 w-3" />
          Column Types
          <ChevronDown className="h-2.5 w-2.5 opacity-70" />
        </button>
        {typesOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setTypesOpen(false); setFilterCol(null) }} />
            <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto border border-[#3b3b3b] bg-[#1f1f1f] py-1 shadow-2xl">
              {columns.map((col) => {
                const type = detectColumnType(columnData[col.name])
                const hasBlanks = (columnData[col.name] || []).some((v) => v === '' || v === 'null')
                return (
                  <div key={col.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2f2f2f]">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-[#d4d4d4]">{col.name}</span>
                    <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px] font-medium', TYPE_COLORS[type])}>{type}</span>
                    <button
                      type="button"
                      title={hasBlanks ? 'Filter this column' : 'Sort and filter'}
                      onClick={(e) => { e.stopPropagation(); setFilterCol(filterCol === col.name ? null : col.name) }}
                      className={cn('shrink-0 hover:text-[#4fbe7d]', hasBlanks ? 'text-[#4fbe7d]' : 'text-[#9a9a9a]')}
                    >
                      <Filter className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
              {filterCol && (
                <div className="border-t border-[#3b3b3b] pt-1">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#9a9a9a]">{filterCol}</div>
                  <button type="button" onClick={() => handleFilterAction(filterCol, 'sort-asc')} className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f]">Sort A to Z</button>
                  <button type="button" onClick={() => handleFilterAction(filterCol, 'sort-desc')} className="flex w-full items-center px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f]">Sort Z to A</button>
                  <button type="button" onClick={() => handleFilterAction(filterCol, 'drop-blanks')} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f]">
                    <X className="h-3 w-3" /> Remove blank rows
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onExport}
        className="flex h-6 items-center gap-1.5 rounded-sm bg-[#107c41] px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-[#0e6a37]"
      >
        <Download className="h-3 w-3" />
        Export Dataset
      </button>
    </div>
  )
}
