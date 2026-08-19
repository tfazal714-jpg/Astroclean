import { Database, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '../utils/cn.js'

const VERSION = 'v0.2.0'

/**
 * Slim status bar under the grid: engine state, dataset stats and the
 * always-true privacy badge. Desktop-only (hidden on small screens to save
 * vertical space).
 */
export default function StatusBar({ rowCount, columnCount, opCount, dbReady = true }) {
  return (
    <footer
      className="hidden h-6 shrink-0 items-center gap-3 border-t border-border bg-surface px-3 text-[10px] text-text-tertiary sm:flex"
      aria-label="App status"
    >
      <span className="inline-flex items-center gap-1.5">
        <Database className="h-3 w-3 text-accent-700" />
        <span className="font-mono">
          DuckDB-WASM <span className={cn(dbReady ? 'text-success' : 'text-warning')}>●</span>
        </span>
      </span>

      <span className="font-mono tabular-nums">
        {rowCount.toLocaleString('en-US')} rows · {columnCount} cols · {opCount} ops
      </span>

      <span className="inline-flex items-center gap-1">
        <Zap className="h-3 w-3 text-accent-700" />
        in-browser engine
      </span>

      <span className="ml-auto inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-success" />
        100% local — nothing leaves your device
      </span>

      <span className="font-mono">{VERSION}</span>
    </footer>
  )
}
