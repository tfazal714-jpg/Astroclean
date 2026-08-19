import { useState } from 'react'
import { ChevronDown, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { OPS_BY_TYPE, summarizeOp } from '../utils/scrubbers.js'
import { cn } from '../utils/cn.js'
import { Badge, Button, IconButton, Panel, Spinner } from './ui.jsx'
import { OpIcon } from './opIcons.jsx'

function formatParamValue(value) {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.length === 0 ? 'none' : value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function PipelineCard({ ops, canUndo, canRedo, busy, onUndo, onRedo, onReset }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <Panel
      title="Pipeline"
      actions={
        <span className="flex items-center gap-1.5">
          {busy && <Spinner className="h-3 w-3" />}
          <Badge tone="accent">{ops.length}</Badge>
        </span>
      }
      bodyClassName="flex max-h-56 flex-col"
    >
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {ops.length === 0 ? (
          <p className="px-3 py-3 text-[11px] leading-4 text-text-tertiary">
            No operations applied yet. Use the panels above to clean and
            enrich the table — every change replays from the raw upload.
          </p>
        ) : (
          <ol className="divide-y divide-border/70">
            {ops.map((op, i) => {
              const meta = OPS_BY_TYPE[op.type]
              const isOpen = expanded === i
              const params = op.params ?? {}
              const paramEntries = Object.entries(params).filter(
                ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
              )
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-surface-hover"
                    aria-expanded={isOpen}
                  >
                    <span className="w-4 shrink-0 text-right font-mono text-[10px] text-text-tertiary">
                      {i + 1}
                    </span>
                    <OpIcon name={meta?.icon} className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-text-primary">
                        {meta?.label ?? op.type}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-text-tertiary">
                        {summarizeOp(op)}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/70 bg-surface-secondary/50 px-3 py-2">
                      {paramEntries.length === 0 ? (
                        <p className="text-[10px] text-text-tertiary">No parameters — applied to defaults.</p>
                      ) : (
                        <dl className="space-y-1">
                          {paramEntries.map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-[10px]">
                              <dt className="w-24 shrink-0 font-mono text-text-tertiary">{key}</dt>
                              <dd className="min-w-0 flex-1 break-words font-mono text-text-primary">
                                {formatParamValue(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={busy || !canUndo}>
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={onRedo} disabled={busy || !canRedo}>
          <Redo2 className="h-3.5 w-3.5" />
          Redo
        </Button>
        <IconButton
          title="Reset to raw upload"
          onClick={onReset}
          disabled={busy || ops.length === 0}
          className="ml-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </Panel>
  )
}
