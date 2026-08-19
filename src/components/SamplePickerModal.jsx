import { useEffect } from 'react'
import { Database, Sparkles, X } from 'lucide-react'
import { SAMPLE_GALLERY } from '../utils/sampleData.js'
import { formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge, IconButton } from './ui.jsx'

/**
 * Gallery of built-in sample datasets. Each card describes what the file
 * contains and how many rows it has; clicking one loads it directly.
 */
export default function SamplePickerModal({ onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Sample datasets</h2>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-4 scrollbar-thin">
          {SAMPLE_GALLERY.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onPick(entry)}
              className={cn(
                'group w-full rounded-sm border border-border bg-surface-secondary/40 p-3 text-left transition-all',
                'hover:border-accent-600 hover:bg-accent-50/40 hover:shadow-sm',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-accent-700">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">
                  {entry.title}
                </span>
                <Badge tone="neutral" className="font-mono normal-case">
                  {formatNumber(entry.rows)} rows
                </Badge>
              </div>
              <p className="mt-1.5 pl-6 text-[11px] leading-4 text-text-tertiary">
                {entry.description}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 pl-6 text-[10px] font-medium text-accent-700 opacity-0 transition-opacity group-hover:opacity-100">
                <Sparkles className="h-3 w-3" />
                Load this sample
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-[11px] text-text-tertiary">
            Samples are generated locally — nothing is downloaded.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
