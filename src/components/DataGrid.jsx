import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, Copy, SearchX } from 'lucide-react'
import { countRowsWhere, fetchPage } from '../services/duckdb.js'
import { formatCellValue, formatNumber, truncate } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Spinner } from './ui.jsx'
import GridToolbar from './GridToolbar.jsx'

const ROW_NUM_WIDTH = 56

const ROW_HEIGHTS = {
  compact: 28,
  comfortable: 32,
}

const q = (name) => `"${String(name).replace(/"/g, '""')}"`

/** Builds a LIKE pattern for search with % and _ escaped. */
function likePattern(term) {
  const escaped = String(term)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
  return `'%${escaped}%'`
}

/** WHERE clause matching `term` against any of the given columns. */
function searchWhere(term, columns) {
  const t = String(term ?? '').trim()
  if (!t) return null
  const cols = (columns ?? []).filter((c) => c && c.name)
  if (cols.length === 0) return null
  return cols
    .map((c) => `LOWER(CAST(${q(c.name)} AS VARCHAR)) LIKE LOWER(${likePattern(t)}) ESCAPE '\\'`)
    .join(' OR ')
}

export default function DataGrid({
  table,
  columns,
  rowCount,
  refreshKey,
  density = 'comfortable',
  onDensityChange,
  onOpenQuality,
  onRowCountChange,
}) {
  const ROW_HEIGHT = ROW_HEIGHTS[density] ?? ROW_HEIGHTS.comfortable

  const [rows, setRows] = useState([])
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState(null) // { column, dir }
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(() => columns.map((c) => c.name))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copiedCell, setCopiedCell] = useState(null)

  const scrollRef = useRef(null)

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible.includes(c.name)),
    [columns, visible],
  )

  // Reset paging + sort + search whenever the underlying table changes.
  useEffect(() => {
    setRows([])
    setOffset(0)
    setSort(null)
    setSearch('')
  }, [table, refreshKey])

  const where = useMemo(() => searchWhere(search, columns), [search, columns])

  // Count matches so the footer reflects the filtered set.
  const [matchCount, setMatchCount] = useState(rowCount)
  useEffect(() => {
    let cancelled = false
    if (!where) {
      setMatchCount(rowCount)
      return undefined
    }
    countRowsWhere(table, where)
      .then((n) => {
        if (!cancelled) {
          setMatchCount(n)
          onRowCountChange?.(n)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, where, rowCount])

  const hasMore = offset + rows.length < matchCount

  // Fetch the current page from DuckDB. The work table is created by the
  // pipeline rebuild which runs asynchronously after the workspace mounts, so
  // a missing-table error is retried briefly before surfacing.
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

    run().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, refreshKey, offset, sort, where, visibleColumns.length])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 320
    if (nearBottom && hasMore && !loading) {
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

  const handleSearch = useCallback((term) => {
    setRows([])
    setOffset(0)
    setSearch(term)
  }, [])

  const handleToggleColumn = useCallback((name) => {
    setVisible((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    )
  }, [])

  const handleToggleAllColumns = useCallback((show) => {
    setVisible(show ? columns.map((c) => c.name) : [])
  }, [columns])

  const handleCopyCell = useCallback(async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      setCopiedCell(text)
      window.setTimeout(() => setCopiedCell(null), 1200)
    } catch {
      // Clipboard unavailable — ignore.
    }
  }, [])

  const handleCopyPage = useCallback(async () => {
    if (rows.length === 0) return
    const lines = [visibleColumns.map((c) => c.name).join(',')]
    for (const row of rows) {
      lines.push(visibleColumns.map((c) => String(row?.[c.name] ?? '')).join(','))
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines.join('\n'))
      }
      setCopiedCell('__PAGE__')
      window.setTimeout(() => setCopiedCell(null), 1400)
    } catch {
      // Ignore.
    }
  }, [rows, visibleColumns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })
  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const padTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const padBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  const totalWidth = ROW_NUM_WIDTH + visibleColumns.length * 176
  const isEmpty = rows.length === 0 && !loading && !error
  const searching = Boolean(search.trim())

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
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
        onCopyPage={handleCopyPage}
        copiedPage={copiedCell === '__PAGE__'}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-surface"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-text-tertiary">
            {searching ? (
              <>
                <SearchX className="h-5 w-5" />
                <p className="text-sm">No rows match “{search}”</p>
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="text-xs font-medium text-accent-700 hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : visibleColumns.length === 0 ? (
              <>
                <ColumnsHidden />
                <p className="text-sm">All columns are hidden</p>
              </>
            ) : (
              <p className="text-sm">No rows to display</p>
            )}
          </div>
        ) : (
          <table
            className="border-collapse text-xs"
            style={{ minWidth: totalWidth, width: 'max-content' }}
          >
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border bg-surface">
                <th
                  className="sticky left-0 z-30 border-r border-border bg-surface px-2 text-right font-medium text-text-tertiary"
                  style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
                >
                  #
                </th>
                {visibleColumns.map((col) => {
                  const active = sort?.column === col.name
                  return (
                    <th
                      key={col.name}
                      className="border-b border-border bg-surface px-2"
                      style={{ width: 176, minWidth: 176 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.name)}
                        title={`Sort by ${col.name}`}
                        className={cn(
                          'flex h-7 w-full items-center gap-1.5 text-left text-xs font-medium hover:text-text-primary',
                          active ? 'text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        <span className="truncate">{col.name}</span>
                        <span className="shrink-0 font-mono text-[9px] uppercase text-text-tertiary">
                          {col.type}
                        </span>
                        <span className="ml-auto shrink-0 text-text-tertiary">
                          {active ? (
                            sort.dir === 'ASC' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {padTop > 0 && (
                <tr style={{ height: padTop }} aria-hidden="true" />
              )}
              {virtualItems.map((vi) => {
                const row = rows[vi.index]
                const rowNum = offset + vi.index + 1
                const parity = vi.index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary'
                return (
                  <tr
                    key={offset + vi.index}
                    className="group border-b border-border/70"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 border-r border-border/70 px-2 text-right font-mono text-[11px] text-text-tertiary',
                        parity,
                        'group-hover:bg-surface-hover',
                      )}
                      style={{ width: ROW_NUM_WIDTH, minWidth: ROW_NUM_WIDTH }}
                    >
                      {formatNumber(rowNum)}
                    </td>
                    {visibleColumns.map((col) => {
                      const text = formatCellValue(row?.[col.name])
                      const empty = text === ''
                      const justCopied = copiedCell === text && text !== ''
                      return (
                        <td
                          key={col.name}
                          className={cn(
                            'px-2 font-mono',
                            parity,
                            'group-hover:bg-surface-hover',
                            empty ? 'text-text-tertiary/70' : 'text-text-primary',
                          )}
                          style={{ width: 176, minWidth: 176, maxWidth: 176 }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopyCell(text)}
                            title={empty ? '(empty)' : `Copy: ${text}`}
                            className="flex w-full items-center gap-1 truncate text-left"
                          >
                            <span className="block min-w-0 flex-1 truncate">
                              {empty ? '—' : truncate(text, 46)}
                            </span>
                            {justCopied && (
                              <Copy className="h-3 w-3 shrink-0 text-success" aria-label="Copied" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {padBottom > 0 && (
                <tr style={{ height: padBottom }} aria-hidden="true" />
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer status bar */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-t border-border bg-surface px-3 text-[11px] text-text-tertiary">
        {loading && rows.length === 0 ? (
          <>
            <Spinner className="h-3 w-3" />
            Loading rows…
          </>
        ) : error ? (
          <span className="inline-flex items-center gap-1.5 text-error">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </span>
        ) : (
          <>
            <span className="font-mono tabular-nums">
              {formatNumber(Math.min(offset + rows.length, matchCount))}
              {' / '}
              {formatNumber(matchCount)} rows
              {searching && <span className="text-text-tertiary"> (filtered)</span>}
            </span>
            {sort && (
              <span className="ml-auto hidden truncate font-mono text-text-tertiary sm:inline">
                sorted by {sort.column} {sort.dir.toLowerCase()}
              </span>
            )}
            <span className="ml-auto hidden text-text-tertiary sm:inline">
              click a cell to copy
            </span>
            {loading && <span className="ml-auto inline-flex items-center gap-1.5">Loading more…</span>}
            {!hasMore && rows.length > 0 && (
              <span className="ml-auto text-text-tertiary">End of data</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ColumnsHidden() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface-secondary">
      <Columns3Icon />
    </div>
  )
}

function Columns3Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  )
}
