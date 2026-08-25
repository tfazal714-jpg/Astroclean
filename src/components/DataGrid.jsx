import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, SearchX } from 'lucide-react'
import { countRowsWhere, fetchPage } from '../services/duckdb.js'
import { formatCellValue, formatNumber, truncate } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Spinner } from './ui.jsx'
import GridToolbar from './GridToolbar.jsx'

const ROW_NUM_WIDTH = 48

const ROW_HEIGHTS = {
  compact: 24,
  comfortable: 28,
}

const q = (name) => `"${String(name).replace(/"/g, '""')}"`

function likePattern(term) {
  const escaped = String(term)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
  return `'%${escaped}%'`
}

function searchWhere(term, columns) {
  const t = String(term ?? '').trim()
  if (!t) return null
  const cols = (columns ?? []).filter((c) => c && c.name)
  if (cols.length === 0) return null
  return cols
    .map((c) => `LOWER(CAST(${q(c.name)} AS VARCHAR)) LIKE LOWER(${likePattern(t)}) ESCAPE '\\'`)
    .join(' OR ')
}

function colLetter(index) {
  let result = ''
  let n = index
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

export default function DataGrid({
  table,
  columns,
  rowCount,
  refreshKey,
  density = 'comfortable',
  onDensityChange,
  onOpenQuality,
  onContextMenu,
  activeCell,
  onCellSelect,
  onCellDoubleClick,
  cellEditing,
  cellValue,
  onCellEdit,
  onCellCommit,
}) {
  const ROW_HEIGHT = ROW_HEIGHTS[density] ?? ROW_HEIGHTS.comfortable

  const [rows, setRows] = useState([])
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState(null)
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(() => columns.map((c) => c.name))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const editInputRef = useRef(null)

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible.includes(c.name)),
    [columns, visible],
  )

  useEffect(() => {
    setRows([])
    setOffset(0)
    setSort(null)
    setSearch('')
  }, [table, refreshKey])

  const where = useMemo(() => searchWhere(search, columns), [search, columns])

  const [matchCount, setMatchCount] = useState(rowCount)
  useEffect(() => {
    let cancelled = false
    if (!where) { setMatchCount(rowCount); return undefined }
    countRowsWhere(table, where).then((n) => { if (!cancelled) setMatchCount(n) }).catch(() => {})
    return () => { cancelled = true }
  }, [table, where, rowCount])

  const hasMore = offset + rows.length < matchCount

  useEffect(() => {
    if (!table || visibleColumns.length === 0) return
    let cancelled = false
    let retries = 0
    setLoading(true)
    setError(null)

    const run = async () => {
      for (;;) {
        try {
          const page = await fetchPage(table, {
            offset,
            limit: 500,
            orderBy: sort?.column ?? null,
            orderDir: sort?.dir ?? 'ASC',
            where,
          })
          if (!cancelled) setRows((prev) => (offset === 0 ? page : [...prev, ...page]))
          return
        } catch (err) {
          const missing = /does not exist/i.test(err?.message ?? '')
          if (missing && retries < 5 && !cancelled) { retries += 1; await new Promise((r) => setTimeout(r, 400)); continue }
          if (!cancelled) setError(err?.message || 'Failed to load rows')
          return
        }
      }
    }

    run().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [table, refreshKey, offset, sort, where, visibleColumns.length])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 320 && hasMore && !loading) {
      setOffset((o) => o + 500)
    }
  }, [hasMore, loading])

  const handleSort = useCallback((column) => {
    setRows([])
    setOffset(0)
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: 'ASC' }
      if (prev.dir === 'ASC') return { column, dir: 'DESC' }
      return null
    })
  }, [])

  const handleSearch = useCallback((term) => { setRows([]); setOffset(0); setSearch(term) }, [])
  const handleToggleColumn = useCallback((name) => {
    setVisible((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name])
  }, [])
  const handleToggleAllColumns = useCallback((show) => {
    setVisible(show ? columns.map((c) => c.name) : [])
  }, [columns])

  useEffect(() => {
    if (cellEditing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [cellEditing])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const padTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const padBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const totalWidth = ROW_NUM_WIDTH + visibleColumns.length * 176
  const isEmpty = rows.length === 0 && !loading && !error
  const searching = Boolean(search.trim())

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GridToolbar
        columns={columns}
        search={search}
        onSearch={handleSearch}
        visibleColumns={visible}
        onToggleColumn={handleToggleColumn}
        onToggleAllColumns={handleToggleAllColumns}
        density={density}
        onDensityChange={onDensityChange}
        onOpenQuality={onOpenQuality}
      />

      <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-[#121212]">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#888888]">
            {searching ? (
              <>
                <SearchX className="h-5 w-5" />
                <p className="text-sm">No rows match "{search}"</p>
                <button type="button" onClick={() => handleSearch('')} className="text-xs font-medium text-[#107c41] hover:underline">Clear search</button>
              </>
            ) : (
              <p className="text-sm">No rows to display</p>
            )}
          </div>
        ) : (
          <table className="border-collapse text-[11px]" style={{ minWidth: totalWidth, width: 'max-content' }}>
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-[#2d2d2d] bg-[#181818]">
                <th className="sticky left-0 z-30 border-r border-[#2d2d2d] bg-[#181818] px-1 text-right font-medium text-[#888888]" style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}>
                  #
                </th>
                {visibleColumns.map((col, i) => {
                  const active = sort?.column === col.name
                  return (
                    <th key={col.name} className="border-r border-[#2d2d2d] bg-[#181818] px-1" style={{ width: 176, minWidth: 176 }}>
                      <button
                        type="button"
                        onClick={() => handleSort(col.name)}
                        title={`Sort by ${col.name}`}
                        className={cn(
                          'flex h-6 w-full items-center gap-1 text-left text-[10px] font-medium hover:text-white',
                          active ? 'text-white' : 'text-[#888888]'
                        )}
                      >
                        <span className="font-mono text-[9px] text-[#107c41]">{colLetter(i)}</span>
                        <span className="truncate">{col.name}</span>
                        <span className="ml-auto shrink-0 text-[#888888]">
                          {active ? (sort.dir === 'ASC' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                        </span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {padTop > 0 && <tr style={{ height: padTop }} aria-hidden="true" />}
              {virtualItems.map((vi) => {
                const row = rows[vi.index]
                const rowNum = offset + vi.index + 1
                const parity = vi.index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#161616]'
                return (
                  <tr key={offset + vi.index} className="group border-b border-[#2d2d2d]/50" style={{ height: ROW_HEIGHT }}>
                    <td
                      className={cn(
                        'sticky left-0 z-10 border-r border-[#2d2d2d]/50 px-1 text-right font-mono text-[10px] text-[#888888]',
                        parity
                      )}
                      style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
                    >
                      {formatNumber(rowNum)}
                    </td>
                    {visibleColumns.map((col, colIdx) => {
                      const text = formatCellValue(row?.[col.name])
                      const empty = text === ''
                      const isActive = activeCell && activeCell.row === vi.index && activeCell.col === colIdx
                      return (
                        <td
                          key={col.name}
                          className={cn(
                            'px-1 font-mono border-r border-[#2d2d2d]/30',
                            parity,
                            isActive ? 'outline outline-1 outline-[#107c41] z-10' : '',
                            empty ? 'text-[#888888]/50' : 'text-[#cccccc]'
                          )}
                          style={{ width: 176, minWidth: 176, maxWidth: 176 }}
                          onClick={() => onCellSelect?.(vi.index, colIdx)}
                          onDoubleClick={() => onCellDoubleClick?.(vi.index, colIdx, text === '—' ? '' : text)}
                          onContextMenu={(e) => onContextMenu?.(e, col.name, rowNum)}
                        >
                          {isActive && cellEditing ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={cellValue}
                              onChange={(e) => onCellEdit?.(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { onCellCommit?.(); onCellSelect?.(vi.index + 1, colIdx) }
                                if (e.key === 'Tab') { e.preventDefault(); onCellCommit?.(); onCellSelect?.(vi.index, colIdx + 1) }
                                if (e.key === 'Escape') onCellCommit?.()
                              }}
                              onBlur={() => onCellCommit?.()}
                              className="h-full w-full border-none bg-[#1e1e1e] px-1 text-[11px] text-white outline-none"
                            />
                          ) : (
                            <span className="block min-w-0 truncate">{empty ? '' : truncate(text, 46)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {padBottom > 0 && <tr style={{ height: padBottom }} aria-hidden="true" />}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex h-6 shrink-0 items-center gap-2 border-t border-[#2d2d2d] bg-[#181818] px-3 text-[10px] text-[#888888]">
        {loading && rows.length === 0 ? (
          <><Spinner className="h-3 w-3" /> Loading rows...</>
        ) : error ? (
          <span className="inline-flex items-center gap-1.5 text-red-400"><AlertTriangle className="h-3 w-3" />{error}</span>
        ) : (
          <>
            <span className="font-mono tabular-nums">
              {formatNumber(Math.min(offset + rows.length, matchCount))} / {formatNumber(matchCount)} rows
              {searching && <span className="text-[#888888]"> (filtered)</span>}
            </span>
            {sort && <span className="ml-auto hidden truncate font-mono text-[#888888] sm:inline">sorted by {sort.column} {sort.dir.toLowerCase()}</span>}
            {loading && <span className="ml-auto inline-flex items-center gap-1.5">Loading more...</span>}
            {!hasMore && rows.length > 0 && <span className="ml-auto text-[#888888]">End of data</span>}
          </>
        )}
      </div>
    </div>
  )
}