import { useState } from 'react'
import { ChevronDown, Copy } from 'lucide-react'
import { formatNumber, truncate } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge } from './ui.jsx'
import { useClipboard } from '../hooks/useClipboard.js'

/**
 * Expandable detail row for a single column: fill rate, distinct count,
 * value-type hints, top values and a copy-friendly snippet.
 */
export default function ColumnDetail({ column }) {
  const [open, setOpen] = useState(false)
  const [copied, copy] = useClipboard()

  const stats = column
  const fillPct = stats.total > 0 ? Math.round((stats.nonEmpty / stats.total) * 100) : 0

  const tags = []
  if (stats.looksEmail > 0) tags.push({ label: 'email', tone: 'accent' })
  if (stats.looksPhone > 0) tags.push({ label: 'phone', tone: 'accent' })
  if (stats.looksNumber > 0) tags.push({ label: 'number', tone: 'neutral' })
  if (stats.looksDate > 0) tags.push({ label: 'date', tone: 'neutral' })

  const copyTopValues = () => {
    const text = stats.topValues
      .map((tv) => `${tv.value}: ${tv.count}`)
      .join('\n')
    copy(text)
  }

  return (
    <div className="border-t border-border/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-hover"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[11px] font-medium text-text-primary">
            {stats.name}
          </span>
          <span className="block font-mono text-[9px] uppercase text-text-tertiary">
            {stats.type} · {formatNumber(stats.distinct)} distinct
          </span>
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-secondary">
          {fillPct}% fill
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-3 pb-3 pt-0.5">
            {/* Fill bar */}
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-sm bg-background-secondary">
                <div
                  className={cn('h-full', fillPct >= 100 ? 'bg-accent-600' : 'bg-warning')}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-text-secondary">
                {fillPct}% fill
              </span>
            </div>

            {/* Type hints */}
            <div className="flex flex-wrap items-center gap-1">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag.label} tone={tag.tone} className="normal-case">
                    {tag.label}
                  </Badge>
                ))
              ) : (
                <span className="text-[10px] text-text-tertiary">No value-type hints</span>
              )}
              <span className="ml-auto font-mono text-[10px] tabular-nums text-text-tertiary">
                {formatNumber(stats.empty)} empty
              </span>
            </div>

            {/* Top values */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Top values
                </span>
                <button
                  type="button"
                  onClick={copyTopValues}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-700 hover:underline"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied!' : 'Copy list'}
                </button>
              </div>
              <div className="space-y-0.5">
                {(stats.topValues ?? []).map((tv, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-surface-secondary/50 px-1.5 py-0.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-text-primary" title={String(tv.value ?? '')}>
                      {truncate(String(tv.value ?? ''), 32) || '(empty)'}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-text-tertiary">
                      ×{formatNumber(tv.count)}
                    </span>
                  </div>
                ))}
                {(!stats.topValues || stats.topValues.length === 0) && (
                  <p className="text-[10px] text-text-tertiary">No non-empty values.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
