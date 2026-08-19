import { BarChart3, FilePlus2, Moon, Settings, Sun } from 'lucide-react'
import { formatNumber } from '../utils/format.js'
import { Button, IconButton, Spinner } from './ui.jsx'
import Logo from './Logo.jsx'

export default function Header({
  dataset,
  busy,
  dark,
  onToggleTheme,
  onNewDataset,
  onOpenSettings,
  onOpenMetrics,
}) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-surface">
      <div className="flex h-12 items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="animate-logo-in block">
            <Logo />
          </span>
          <span className="hidden text-[11px] text-text-tertiary xl:inline">
            CSV scrubbing &amp; enrichment · runs entirely in your browser
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {dataset && (
            <>
              <span className="hidden font-mono text-xs tabular-nums text-text-secondary sm:inline">
                {formatNumber(dataset.rowCount)} rows
              </span>
              {busy && <Spinner className="h-3.5 w-3.5" />}
              <Button variant="ghost" size="sm" onClick={onNewDataset} className="hidden sm:inline-flex">
                <FilePlus2 className="h-3.5 w-3.5" />
                New dataset
              </Button>
              <IconButton title="New dataset" onClick={onNewDataset} className="sm:hidden">
                <FilePlus2 className="h-4 w-4" />
              </IconButton>
            </>
          )}
          <IconButton title="Your activity & metrics" onClick={onOpenMetrics} data-metrics-button>
            <BarChart3 className="h-4 w-4" />
          </IconButton>
          <IconButton title="API providers & settings" onClick={onOpenSettings} data-settings-button>
            <Settings className="h-4 w-4" />
          </IconButton>
          <IconButton
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggleTheme}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
        </div>
      </div>
    </header>
  )
}
