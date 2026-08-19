import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Info, ShieldCheck, X, XCircle } from 'lucide-react'
import { computeQuality, qualityReportText } from '../utils/quality.js'
import { formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge, Button, IconButton, Spinner } from './ui.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'

const SEVERITY_ICON = {
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
}

const SEVERITY_TONE = {
  error: 'text-error',
  warn: 'text-warning',
  info: 'text-text-secondary',
}

/** Overall data-quality report: score, issues and per-column notes. */
export default function QualityReportModal({ tableName, columns, onClose }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  useEffect(() => {
    let cancelled = false
    setReport(null)
    setError(null)
    computeQuality(tableName, columns)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to analyse the table.')
      })
    return () => {
      cancelled = true
    }
  }, [tableName, columns])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const scoreColor = useMemo(() => {
    if (!report) return 'text-text-tertiary'
    if (report.score >= 85) return 'text-success'
    if (report.score >= 60) return 'text-warning'
    return 'text-error'
  }, [report])

  const download = () => {
    if (!report) return
    const text = qualityReportText(report, tableName)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quality-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={modalRef} className="w-full max-w-lg border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Data quality report</h2>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 scrollbar-thin">
          {!report && !error && (
            <div className="flex items-center gap-2 py-6 text-xs text-text-tertiary">
              <Spinner className="h-3.5 w-3.5" /> Analysing table…
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-error/40 bg-error/5 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          {report && (
            <>
              {/* Score + headline stats */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="col-span-2 flex flex-col items-center justify-center border border-border bg-surface-secondary/60 px-3 py-4 sm:col-span-1">
                  <span className={cn('font-mono text-3xl font-semibold tabular-nums', scoreColor)}>
                    {report.score}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide text-text-tertiary">
                    / 100 score
                  </span>
                </div>
                <Stat label="Rows" value={formatNumber(report.totalRows)} />
                <Stat label="Duplicate rows" value={formatNumber(report.duplicateRows)} />
                <Stat
                  label="Empty cells"
                  value={`${formatNumber(report.emptyCells)}`}
                  sub={report.totalCells ? `${((report.emptyCells / report.totalCells) * 100).toFixed(0)}%` : ''}
                />
              </div>

              {/* Issues */}
              <div className="mt-4">
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Issues &amp; suggestions
                </h3>
                {report.issues.length === 0 ? (
                  <div className="flex items-center gap-2 border border-success/30 bg-success/5 px-3 py-2.5 text-xs text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No issues found — this dataset looks clean.
                  </div>
                ) : (
                  <div className="divide-y divide-border/70 border border-border">
                    {report.issues.map((issue, i) => {
                      const Icon = SEVERITY_ICON[issue.severity]
                      return (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2">
                          <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', SEVERITY_TONE[issue.severity])} />
                          <p className="min-w-0 flex-1 text-xs leading-4 text-text-primary">
                            {issue.column && (
                              <span className="mr-1 font-mono text-[10px] text-accent-700">{issue.column}</span>
                            )}
                            {issue.message}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Per-column hints */}
              <div className="mt-4">
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  Column health
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {report.columnStats.map((col) => {
                    const fill = col.total > 0 ? Math.round((col.nonEmpty / col.total) * 100) : 0
                    const tone = fill >= 95 ? 'success' : fill >= 60 ? 'warn' : 'danger'
                    return (
                      <span
                        key={col.name}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-secondary/60 px-2 py-1"
                        title={`${col.name} — ${fill}% filled`}
                      >
                        <span className="max-w-[100px] truncate font-mono text-[10px] text-text-primary">
                          {col.name}
                        </span>
                        <Badge tone={tone} className="normal-case">
                          {fill}%
                        </Badge>
                      </span>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={download} disabled={!report}>
            <Download className="h-3.5 w-3.5" />
            Download report
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="flex flex-col justify-center border border-border bg-surface-secondary/60 px-3 py-2">
      <span className="font-mono text-base font-semibold tabular-nums text-text-primary">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
        {label}
        {sub ? ` · ${sub}` : ''}
      </span>
    </div>
  )
}
