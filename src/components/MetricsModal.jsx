import { useEffect, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  Database,
  Download,
  Files,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { loadHistory } from '../utils/metrics.js'
import { formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { activityByDay } from '../utils/date.js'
import { Badge, Button, IconButton } from './ui.jsx'
import { BarChart, Donut } from './charts/index.jsx'

const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default function MetricsModal({ activity, onClear, onClose }) {
  const [history, setHistory] = useState(() => loadHistory())
  const [confirmClear, setConfirmClear] = useState(false)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    onClear()
    setHistory([])
    setConfirmClear(false)
  }

  const cards = [
    {
      label: 'Files processed',
      value: formatNumber(activity.filesProcessed),
      icon: Files,
      accent: 'text-accent-700',
    },
    {
      label: 'Rows processed',
      value: formatNumber(activity.totalRows),
      icon: Database,
      accent: 'text-accent-700',
    },
    {
      label: 'Operations applied',
      value: formatNumber(activity.opsApplied),
      icon: SlidersHorizontal,
      accent: 'text-accent-700',
    },
    {
      label: 'CSV exports',
      value: formatNumber(activity.exports),
      icon: Download,
      accent: 'text-accent-700',
    },
    {
      label: 'AI values generated',
      value: formatNumber(activity.aiValues),
      icon: Sparkles,
      accent: 'text-accent-700',
    },
    {
      label: 'Using AstroClean since',
      value: activity.firstSeen ? fmtDate(activity.firstSeen) : '—',
      icon: CalendarDays,
      accent: 'text-accent-700',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Your activity</h2>
            <span className="hidden text-[11px] text-text-tertiary sm:inline">
              · stored only in this browser
            </span>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 scrollbar-thin">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="border border-border bg-surface-secondary/60 px-3 py-2.5"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary">
                  <card.icon className={cn('h-3.5 w-3.5', card.accent)} />
                  {card.label}
                </div>
                <p className="font-mono text-base font-semibold tabular-nums tracking-tight text-text-primary">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {history.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="border border-border bg-surface-secondary/40 px-3 py-2.5 sm:col-span-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Files opened · last 7 days
                </p>
                <BarChart
                  data={activityByDay(history.map((h) => h.openedAt), 7)}
                  height={72}
                  formatValue={(n) => formatNumber(n)}
                />
              </div>
              <div className="flex items-center gap-3 border border-border bg-surface-secondary/40 px-3 py-2.5">
                <Donut
                  data={[
                    { label: 'File', value: history.filter((h) => h.source !== 'sample').length },
                    { label: 'Sample', value: history.filter((h) => h.source === 'sample').length },
                  ]}
                  size={84}
                  thickness={10}
                  centerLabel="files"
                  centerValue={history.length}
                />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                    Source mix
                  </p>
                  <div className="space-y-1 text-[11px] text-text-secondary">
                    <p className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-accent-500" />
                      {history.filter((h) => h.source !== 'sample').length} uploaded
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-accent-800" />
                      {history.filter((h) => h.source === 'sample').length} samples
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Files &amp; activity
              </h3>
              <span className="font-mono text-[10px] text-text-tertiary">
                {history.length} recorded
              </span>
            </div>

          {history.length === 0 ? (
            <div className="mt-5 border border-dashed border-border-secondary px-4 py-6 text-center">
                <p className="text-xs font-medium text-text-primary">No activity yet</p>
                <p className="mx-auto mt-1 max-w-xs text-[11px] leading-4 text-text-tertiary">
                  Process your first file and it will show up here — how many
                  rows, which file, what you did with it.
                </p>
              </div>
            ) : (
              <div className="border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-secondary text-left text-[10px] uppercase tracking-wide text-text-tertiary">
                      <th className="px-2.5 py-1.5 font-medium">File</th>
                      <th className="hidden px-2.5 py-1.5 text-right font-medium sm:table-cell">Cols</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Rows</th>
                      <th className="hidden px-2.5 py-1.5 text-right font-medium md:table-cell">Ops</th>
                      <th className="hidden px-2.5 py-1.5 text-right font-medium md:table-cell">Exports</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-surface-hover">
                        <td className="max-w-[140px] px-2.5 py-2">
                          <span className="block truncate font-mono text-[11px] font-medium text-text-primary" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            <Badge tone="neutral" className="normal-case">
                              {entry.source === 'sample' ? 'sample' : 'file'}
                            </Badge>
                            {entry.aiValues > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-700">
                                <Sparkles className="h-2.5 w-2.5" />
                                {formatNumber(entry.aiValues)} AI
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="hidden px-2.5 py-2 text-right font-mono tabular-nums text-text-secondary sm:table-cell">
                          {formatNumber(entry.cols)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono tabular-nums text-text-secondary">
                          {formatNumber(entry.rows)}
                        </td>
                        <td className="hidden px-2.5 py-2 text-right font-mono tabular-nums text-text-secondary md:table-cell">
                          {formatNumber(entry.ops)}
                        </td>
                        <td className="hidden px-2.5 py-2 text-right font-mono tabular-nums text-text-secondary md:table-cell">
                          {formatNumber(entry.exports)}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-2 text-right text-[11px] text-text-tertiary">
                          {fmtDate(entry.openedAt)}
                          <span className="hidden sm:inline"> · {fmtTime(entry.openedAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className={cn(confirmClear && 'text-error hover:text-error')}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmClear ? 'Confirm clear?' : 'Clear activity'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
