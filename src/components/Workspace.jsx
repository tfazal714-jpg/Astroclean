import { useState } from 'react'
import { Ban, Database, Download, SlidersHorizontal, X } from 'lucide-react'
import { AI_OPS, CLEAN_OPS, ENRICH_OPS } from '../utils/scrubbers.js'
import { formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge, Button, IconButton } from './ui.jsx'
import DataGrid from './DataGrid.jsx'
import OpsPanel from './OpsPanel.jsx'
import ColumnsPanel from './ColumnsPanel.jsx'
import PipelineCard from './PipelineCard.jsx'

const TABS = [
  { id: 'clean', label: 'Clean' },
  { id: 'enrich', label: 'Enrich' },
  { id: 'ai', label: 'AI' },
  { id: 'columns', label: 'Columns' },
]

export default function Workspace({
  dataset,
  workVersion,
  ops,
  canUndo,
  canRedo,
  busy,
  busyLabel,
  providers,
  density,
  onDensityChange,
  onOpenQuality,
  onApplyOp,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onCancel,
  onOpenSettings,
}) {
  const [tab, setTab] = useState('clean')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const columnNames = dataset.columns.map((c) => c.name)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-full min-h-0">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar (drawer on mobile, static pane on desktop)                */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col border-r border-border bg-surface transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:transition-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header (mobile only) */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5 lg:hidden">
          <span className="text-xs font-semibold text-text-primary">Operations</span>
          <IconButton title="Close" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Dataset info */}
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-accent-700" />
            <span
              className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary"
              title={dataset.name}
            >
              {dataset.name}
            </span>
            <Badge tone="neutral">{dataset.source === 'sample' ? 'sample' : 'file'}</Badge>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-text-secondary">
            <div className="flex justify-between">
              <dt className="text-text-tertiary">Rows</dt>
              <dd className="tabular-nums">{formatNumber(dataset.rowCount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-tertiary">Cols</dt>
              <dd className="tabular-nums">{dataset.columns.length}</dd>
            </div>
          </dl>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'h-7 flex-1 rounded-sm text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border border-border bg-surface-secondary text-text-primary shadow-sm'
                  : 'border border-transparent text-text-tertiary hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          {tab === 'clean' && <OpsPanel ops={CLEAN_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
          {tab === 'enrich' && <OpsPanel ops={ENRICH_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
          {tab === 'ai' && <OpsPanel ops={AI_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
          {tab === 'columns' && (
            <ColumnsPanel table={dataset.workTable} columns={dataset.columns} refreshKey={workVersion} />
          )}
        </div>

        {/* Pipeline */}
        <div className="shrink-0 border-t border-border" data-pipeline-panel>
          <PipelineCard
            ops={ops}
            canUndo={canUndo}
            canRedo={canRedo}
            busy={busy}
            onUndo={onUndo}
            onRedo={onRedo}
            onReset={onReset}
          />
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main panel                                                        */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <IconButton
              title="Show operations"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </IconButton>
            <span className="truncate text-sm font-medium text-text-primary">
              Working table
            </span>
            <Badge tone="neutral" className="hidden sm:inline-flex">
              live preview
            </Badge>
            {busyLabel && (
              <Badge tone="accent" className="hidden max-w-[220px] md:inline-flex">
                <span className="truncate">{busyLabel}</span>
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {busyLabel?.includes('AI') && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="hidden sm:inline-flex">
                <Ban className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onExport} disabled={busy}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-surface">
          <DataGrid
            table={dataset.workTable}
            columns={dataset.columns}
            rowCount={dataset.rowCount}
            refreshKey={workVersion}
            density={density}
            onDensityChange={onDensityChange}
            onOpenQuality={onOpenQuality}
          />
        </div>
      </main>
    </div>
  )
}
