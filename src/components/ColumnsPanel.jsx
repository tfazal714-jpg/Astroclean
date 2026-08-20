import { useEffect, useState } from 'react'
import { getColumnStats } from '../services/duckdb.js'
import { formatNumber, truncate } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge } from './ui.jsx'
import { ListSkeleton } from './Skeletons.jsx'
import ColumnDetail from './ColumnDetail.jsx'

export default function ColumnsPanel({ table, columns, refreshKey }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!table || columns.length === 0) {
      setStats(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setStats(null)

    ;(async () => {
      const out = []
      for (let i = 0; i < columns.length; i += 1) {
        const name = columns[i].name
        const type = columns[i].type
        if (cancelled) return
        try {
          const s = await getColumnStats(table, name)
          out.push({ name, type, ...s })
        } catch {
          out.push({ name, type, error: true })
        }
      }
      if (!cancelled) setStats(out)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, refreshKey])

  if (loading && !stats) {
    return <ListSkeleton rows={Math.min(6, columns.length)} />
  }

  if (!stats || stats.length === 0) {
    return <p className="px-3 py-4 text-xs text-text-tertiary">No columns.</p>
  }

  return (
    <div className="divide-y divide-border/70" data-columns-panel>
      {stats.map((col) => {
        const fillPct = col.total > 0 ? Math.round((col.nonEmpty / col.total) * 100) : 0
        const tags = []
        if (col.looksEmail > 0) tags.push({ label: 'email', tone: 'accent' })
        if (col.looksPhone > 0) tags.push({ label: 'phone', tone: 'accent' })
        if (col.looksNumber > 0) tags.push({ label: 'number', tone: 'neutral' })
        if (col.looksDate > 0) tags.push({ label: 'date', tone: 'neutral' })
        return (
          <div key={col.name}>
            <div className="px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-text-primary"
                  title={col.name}
                >
                  {truncate(col.name, 28)}
                </span>
                <span className="shrink-0 font-mono text-[9px] uppercase text-text-tertiary">
                  {col.type}
                </span>
              </div>

              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-sm bg-background-secondary">
                  <div
                    className={cn('h-full', fillPct >= 100 ? 'bg-accent-600' : 'bg-warning')}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-text-secondary">
                  {fillPct}% fill
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-text-tertiary">
                  {formatNumber(col.distinct)} distinct
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {tags.map((tag) => (
                  <Badge key={tag.label} tone={tag.tone} className="normal-case">
                    {tag.label}
                  </Badge>
                ))}
                {col.topValues.slice(0, 3).map((tv, i) => (
                  <span
                    key={i}
                    className="max-w-[140px] truncate rounded-sm border border-border bg-surface-secondary px-1 py-px font-mono text-[10px] text-text-secondary"
                    title={`${tv.value} (${formatNumber(tv.count)}×)`}
                  >
                    {truncate(String(tv.value ?? ''), 16)}
                    <span className="text-text-tertiary"> · {formatNumber(tv.count)}</span>
                  </span>
                ))}
                {col.error && <span className="text-[10px] text-error">analysis failed</span>}
              </div>
            </div>
            <ColumnDetail column={col} />
          </div>
        )
      })}
    </div>
  )
}
