import { useEffect, useState, useCallback } from 'react'
import { Scissors, CopyX, Trash2, Download, Filter, X, Eraser } from 'lucide-react'
import { query } from '../services/duckdb.js'
import { cn } from '../utils/cn.js'

const QUICK_ACTIONS = [
  { id: 'trim', label: 'Trim Whitespace', icon: Scissors, op: { type: 'trim', params: { columns: null } } },
  { id: 'dedupe', label: 'Deduplicate Rows', icon: CopyX, op: { type: 'dedupe', params: { columns: null } } },
  { id: 'drop-empty', label: 'Drop Empty Columns', icon: Trash2, op: { type: 'drop_empty_columns', params: {} } },
  { id: 'fill-empty', label: 'Fill Empty Cells', icon: Eraser, op: { type: 'fill_empty', params: { columns: null, value: '' } } },
]

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
  Text: 'bg-[#2d2d2d] text-[#cccccc]',
  Number: 'bg-[#107c41]/20 text-[#107c41]',
  Email: 'bg-[#6366f1]/20 text-[#818cf8]',
  Date: 'bg-[#d97706]/20 text-[#f59e0b]',
}

const FILTER_OPTIONS = [
  { id: 'not-null', label: 'Remove nulls / empty' },
  { id: 'sort-asc', label: 'Sort A \u2192 Z' },
  { id: 'sort-desc', label: 'Sort Z \u2192 A' },
]

export default function WorkspaceToolbar({ table, columns, refreshKey, onApplyOp, onExport }) {
  const [columnData, setColumnData] = useState({})
  const [filterCol, setFilterCol] = useState(null)
  const [filterPos, setFilterPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const data = {}
      for (const col of columns.slice(0, 20)) {
        try {
          const rows = await query(`SELECT DISTINCT "${col.name}" AS v FROM "${table}" LIMIT 50`)
          if (!cancelled) data[col.name] = rows.map((r) => String(r.v ?? ''))
        } catch {
          // skip failed column sampling
        }
      }
      if (!cancelled) setColumnData(data)
    }
    load()
    return () => { cancelled = true }
  }, [table, columns, refreshKey])

  const handleFilterAction = useCallback((colName, actionId) => {
    if (actionId === 'not-null') {
      onApplyOp({ type: 'filter_not_null', params: { column: colName } })
    } else if (actionId === 'sort-asc') {
      onApplyOp({ type: 'sort', params: { column: colName, direction: 'asc' } })
    } else if (actionId === 'sort-desc') {
      onApplyOp({ type: 'sort', params: { column: colName, direction: 'desc' } })
    }
    setFilterCol(null)
  }, [onApplyOp])

  return (
    <div className="shrink-0 border-b border-[#2d2d2d] bg-[#1e1e1e]">
      {/* Quick Actions */}
      <div className="flex items-center gap-2 border-b border-[#2d2d2d] px-4 py-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-[#888888]">Quick</span>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onApplyOp(a.op)}
            className="flex items-center gap-1.5 rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] px-2.5 py-1 text-[11px] text-[#cccccc] transition-colors hover:border-[#107c41] hover:text-[#107c41]"
          >
            <a.icon className="h-3 w-3" />
            {a.label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-sm bg-[#107c41] px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#0e6a37]"
          >
            <Download className="h-3 w-3" />
            Export Dataset
          </button>
        </div>
      </div>

      {/* Column Type Badges */}
      <div className="flex items-center overflow-x-auto">
        <div className="min-w-[80px] shrink-0 border-r border-[#2d2d2d] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#888888]">
          Column
        </div>
        {columns.map((col) => {
          const vals = columnData[col.name] || []
          const type = detectColumnType(vals)
          const hasNulls = vals.some((v) => v === '' || v === 'null')
          return (
            <div
              key={col.name}
              className="group relative flex min-w-[140px] items-center gap-1.5 border-r border-[#2d2d2d] px-3 py-1"
            >
              <span className="truncate text-[11px] font-medium text-[#cccccc]">{col.name}</span>
              <span className={cn('shrink-0 rounded px-1 py-0.5 text-[9px] font-medium', TYPE_COLORS[type])}>{type}</span>
              {hasNulls && (
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setFilterCol(filterCol === col.name ? null : col.name)
                    setFilterPos({ x: rect.left, y: rect.bottom + 4 })
                  }}
                  className="ml-auto shrink-0 text-[#888888] hover:text-[#107c41]"
                >
                  <Filter className="h-2.5 w-2.5" />
                </button>
              )}
              {filterCol === col.name && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterCol(null)} />
                  <div className="fixed z-50 w-48 border border-[#2d2d2d] bg-[#1e1e1e] shadow-lg" style={{ left: filterPos.x, top: filterPos.y }}>
                    {FILTER_OPTIONS.map((opt) => (
                      <button key={opt.id} type="button" onClick={() => handleFilterAction(col.name, opt.id)} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[#cccccc] hover:bg-[#2d2d2d]">
                        {opt.label}
                      </button>
                    ))}
                    <div className="border-t border-[#2d2d2d]" />
                    <button type="button" onClick={() => setFilterCol(null)} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[#888888] hover:bg-[#2d2d2d]">
                      <X className="h-2.5 w-2.5" /> Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
