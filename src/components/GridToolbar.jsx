import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Rows3,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '../utils/cn.js'
import { IconButton } from './ui.jsx'

/**
 * Toolbar above the data grid: search-as-you-type, column visibility,
 * row density and a shortcut to the quality report.
 */
export default function GridToolbar({
  columns,
  search,
  onSearch,
  visibleColumns,
  onToggleColumn,
  onToggleAllColumns,
  density,
  onDensityChange,
  onOpenQuality,
  onCopyPage,
  copiedPage = false,
}) {
  const [columnsOpen, setColumnsOpen] = useState(false)

  const allVisible = visibleColumns.length === columns.length
  const noneVisible = visibleColumns.length === 0

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Search ${columns.length} columns…`}
          aria-label="Search rows"
          className="h-7 w-full rounded-sm border border-border-secondary bg-surface pl-7 pr-7 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-tertiary hover:text-text-primary"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Column visibility */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setColumnsOpen((o) => !o)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium transition-colors',
            columnsOpen
              ? 'border-accent-600 bg-accent-50 text-accent-800'
              : 'border-border-secondary bg-surface text-text-secondary hover:text-text-primary',
          )}
          aria-haspopup="listbox"
          aria-expanded={columnsOpen}
          title="Toggle columns"
        >
          <Columns3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{visibleColumns.length}/{columns.length} cols</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {columnsOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setColumnsOpen(false)} />
            <div className="absolute right-0 z-40 mt-1 w-56 border border-border bg-surface shadow-md">
              <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => onToggleAllColumns(!allVisible)}
                  className="text-[11px] font-medium text-accent-700 hover:underline"
                >
                  {allVisible ? 'Hide all' : 'Show all'}
                </button>
                <span className="text-[10px] text-text-tertiary">
                  {visibleColumns.length} shown
                </span>
              </div>
              <div className="scrollbar-thin max-h-56 overflow-auto py-1">
                {columns.map((col) => {
                  const checked = !noneVisible && visibleColumns.includes(col.name)
                  return (
                    <label
                      key={col.name}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleColumn(col.name)}
                        className="h-3.5 w-3.5 accent-accent-700"
                      />
                      <span className="truncate font-mono text-text-primary">{col.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[9px] uppercase text-text-tertiary">
                        {col.type}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Density */}
      <button
        type="button"
        onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
        className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-border-secondary bg-surface px-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        title={`Toggle row density (${density === 'compact' ? 'compact' : 'comfortable'})`}
      >
        <Rows3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{density === 'compact' ? 'Compact' : 'Comfortable'}</span>
      </button>

      {/* Copy visible page as CSV */}
      <IconButton
        title={copiedPage ? 'Page copied!' : 'Copy visible rows as CSV'}
        onClick={onCopyPage}
        className="border border-border-secondary"
      >
        {copiedPage ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </IconButton>

      {/* Quality report */}
      <IconButton title="Data quality report" onClick={onOpenQuality} className="border border-border-secondary">
        <ShieldCheck className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  )
}
