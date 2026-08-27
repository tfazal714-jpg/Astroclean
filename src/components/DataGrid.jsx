import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { countRowsWhere, fetchPage } from '../services/duckdb.js'
import { formatCellValue, formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'

const BASE_ROW_HEIGHT = 26
const BASE_COL_WIDTH = 100
const ROW_NUM_WIDTH = 44

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
  search = '',
  zoom = 100,
  showGridlines = true,
  edits = {},
  activeCell,
  onCellSelect,
  onCellDoubleClick,
  onActiveValue,
  cellEditing,
  cellValue,
  onCellEdit,
  onCellCommit,
  onCellCancel,
  onContextMenu,
  onStats,
}) {
  const scale = zoom / 100
  const rowHeight = Math.round(BASE_ROW_HEIGHT * scale)
  const colWidth = Math.round(BASE_COL_WIDTH * scale)
  const rowNumWidth = Math.max(36, Math.round(ROW_NUM_WIDTH * scale))

  const [rows, setRows] = useState([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const editInputRef = useRef(null)

  const visibleColumns = useMemo(() => (columns ?? []).filter((c) => c && c.name), [columns])

  useEffect(() => {
    setRows([])
    setOffset(0)
  }, [table, refreshKey])

  const where = useMemo(() => searchWhere(search, columns), [search, columns])

  const [matchCount, setMatchCount] = useState(rowCount)
  useEffect(() => {
    let cancelled = false
    if (!where) { setMatchCount(rowCount); return undefined }
    countRowsWhere(table, where)
      .then((n) => { if (!cancelled) setMatchCount(n) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [table, where, rowCount])

  const hasMore = offset + rows.length < matchCount

  useEffect(() => {
    if (!table || visibleColumns.length === 0) return undefined
    let cancelled = false
    let retries = 0
    setLoading(true)
    setError(null)

    const run = async () => {
      for (;;) {
        try {
          const page = await fetchPage(table, { offset, limit: 500, orderBy: null, orderDir: 'ASC', where })
          if (!cancelled) setRows((prev) => (offset === 0 ? page : [...prev, ...page]))
          return
        } catch (err) {
          const missing = /does not exist/i.test(err?.message ?? '')
          if (missing && retries < 5 && !cancelled) {
            retries += 1
            await new Promise((r) => setTimeout(r, 400))
            continue
          }
          if (!cancelled) setError(err?.message || 'Failed to load rows')
          return
        }
      }
    }

    run().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [table, refreshKey, offset, where, visibleColumns.length])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 320 && hasMore && !loading) {
      setOffset((o) => o + 500)
    }
  }, [hasMore, loading])

  useEffect(() => {
    if (onStats) onStats({ loaded: Math.min(offset + rows.length, matchCount), total: matchCount })
  }, [offset, rows.length, matchCount, onStats])

  // Keep the formula bar in sync when the active cell moves without a click.
  useEffect(() => {
    if (!onActiveValue || cellEditing || !activeCell) return
    const col = visibleColumns[activeCell.col]
    if (!col) return
    const row = rows[activeCell.row]
    const key = `${activeCell.row}:${col.name}`
    const value = key in edits ? edits[key] : formatCellValue(row?.[col.name])
    onActiveValue(value === '—' ? '' : value)
  }, [activeCell, rows, edits, cellEditing])

  useEffect(() => {
    if (cellEditing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [cellEditing])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 14,
  })
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const padTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const padBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const cellValueFor = useCallback((rowIdx, col) => {
    const key = `${rowIdx}:${col.name}`
    if (key in edits) return edits[key]
    const text = formatCellValue(rows[rowIdx]?.[col.name])
    return text === '—' ? '' : text
  }, [edits, rows])

  const gridBorder = showGridlines ? 'border-[#2d2d2d]/70' : 'border-transparent'
  const totalWidth = rowNumWidth + visibleColumns.length * colWidth

  return (
    <div className="relative h-full min-h-0">
      <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-thin absolute inset-0 overflow-auto bg-[#121212]">
        {error ? (
          <div className="flex h-full items-center justify-center text-[12px] text-red-400">{error}</div>
        ) : (
          <div style={{ minWidth: totalWidth, width: 'max-content', fontSize: `${(11 * scale).toFixed(1)}px` }}>
            {/* Column letter header */}
            <div className="sticky top-0 z-30 flex" style={{ height: rowHeight }}>
              <div
                className={cn('sticky left-0 z-40 flex shrink-0 items-center justify-center border-r border-b bg-[#181818]', gridBorder)}
                style={{ width: rowNumWidth, minWidth: rowNumWidth }}
              />
              {visibleColumns.map((col, i) => {
                const active = activeCell && activeCell.col === i
                return (
                  <div
                    key={col.name}
                    title={col.name}
                    onMouseDown={(e) => { e.preventDefault(); if (activeCell) onCellSelect?.(activeCell.row, i, cellValueFor(activeCell.row, col)) }}
                    className={cn(
                      'flex shrink-0 items-center justify-center border-r border-b text-[11px] font-medium',
                      gridBorder,
                      active ? 'bg-[#107c41] text-white' : 'bg-[#181818] text-[#9a9a9a] hover:bg-[#242424]',
                    )}
                    style={{ width: colWidth, minWidth: colWidth }}
                  >
                    {colLetter(i)}
                  </div>
                )
              })}
            </div>

            {matchCount === 0 ? (
              <div className="flex items-center justify-center text-[#9a9a9a]" style={{ height: 120 }}>
                {search ? `No rows match "${search}"` : 'No rows to display'}
              </div>
            ) : (
              <div style={{ height: totalSize, position: 'relative' }}>
                {padTop > 0 && <div style={{ height: padTop }} />}
                {virtualItems.map((vi) => {
                  const rowIdx = vi.index
                  const rowActive = activeCell && activeCell.row === rowIdx
                  return (
                    <div key={rowIdx} className="flex" style={{ height: rowHeight }}>
                      <div
                        className={cn(
                          'sticky left-0 z-20 flex shrink-0 items-center justify-center border-r border-b font-mono text-[10px]',
                          gridBorder,
                          rowActive ? 'bg-[#107c41]/25 text-[#4fbe7d]' : 'bg-[#181818] text-[#9a9a9a]',
                        )}
                        style={{ width: rowNumWidth, minWidth: rowNumWidth }}
                      >
                        {formatNumber(rowIdx + 1)}
                      </div>
                      {visibleColumns.map((col, colIdx) => {
                        const isActive = rowActive && activeCell.col === colIdx
                        const text = cellValueFor(rowIdx, col)
                        return (
                          <div
                            key={col.name}
                            onMouseDown={() => onCellSelect?.(rowIdx, colIdx, text)}
                            onDoubleClick={() => onCellDoubleClick?.(rowIdx, colIdx, text)}
                            onContextMenu={(e) => onContextMenu?.(e, col.name, rowIdx + 1)}
                            className={cn(
                              'relative flex shrink-0 items-center border-r border-b px-1',
                              gridBorder,
                              isActive ? 'z-10 bg-[#1c1c1c]' : 'bg-[#121212] hover:bg-[#1a1a1a]',
                            )}
                            style={{ width: colWidth, minWidth: colWidth, maxWidth: colWidth }}
                          >
                            {isActive && cellEditing ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={cellValue}
                                onChange={(e) => onCellEdit?.(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); onCellCommit?.('down') }
                                  if (e.key === 'Tab') { e.preventDefault(); onCellCommit?.('right') }
                                  if (e.key === 'Escape') { e.preventDefault(); onCellCancel?.() }
                                }}
                                onBlur={() => onCellCommit?.()}
                                className="absolute inset-0 z-20 w-full border-[1.5px] border-[#107c41] bg-[#121212] px-1 text-white outline-none"
                                style={{ fontSize: `${(11 * scale).toFixed(1)}px` }}
                              />
                            ) : (
                              <span className="pointer-events-none block min-w-0 truncate text-[#cccccc]">{text}</span>
                            )}
                            {isActive && !cellEditing && (
                              <span className="pointer-events-none absolute -bottom-[3px] -right-[3px] z-20 h-[6px] w-[6px] border border-[#107c41] bg-[#121212]" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {padBottom > 0 && <div style={{ height: padBottom }} />}
              </div>
            )}
          </div>
        )}
      </div>
      {loading && rows.length === 0 && (
        <div className="absolute bottom-2 left-2 text-[10px] text-[#9a9a9a]">Loading rows...</div>
      )}
    </div>
  )
}
