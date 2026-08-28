import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  dropTable,
  getTableMeta,
  initDuckDB,
  loadCsvFile,
  rebuildPipeline,
  terminateDuckDB,
} from './services/duckdb.js'
import { SAMPLE_GALLERY, sampleFileFor } from './utils/sampleData.js'
import { runDemo } from './utils/demo.js'
import { activeProvider, loadProviders, saveProviders } from './services/ai.js'
import { clearAiCache } from './services/aiCache.js'
import {
  clearActivity,
  loadActivity,
  recordAiValues,
  recordExport,
  recordFile,
  recordOp,
} from './utils/metrics.js'
import {
  loadSettings,
  markTourCompleted,
  resetTour,
  resolveTheme,
  saveSettings,
  tourCompleted,
} from './utils/settings.js'
import { useToast } from './components/Toast.jsx'
import { useMediaQuery } from './hooks/useMediaQuery.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'
import Header from './components/Header.jsx'
import UploadView from './components/UploadView.jsx'
import Workspace from './components/Workspace.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import MetricsModal from './components/MetricsModal.jsx'
import ExportModal from './components/ExportModal.jsx'
import ImportPreviewModal from './components/ImportPreviewModal.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import ShortcutsModal from './components/ShortcutsModal.jsx'
import OnboardingTour from './components/OnboardingTour.jsx'
import QualityReportModal from './components/QualityReportModal.jsx'
import Confetti from './components/Confetti.jsx'
import StatusBar from './components/StatusBar.jsx'
import { Button, Spinner } from './components/ui.jsx'

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const initialState = {
  dbStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  dbError: null,
  error: null, // workflow error (upload or pipeline)
  busy: null, // human-readable label for background work
  dataset: null, // { name, source, rawTable, workTable, rowCount, columns }
  workVersion: 0, // bumped after each pipeline materialisation
  history: [[]], // array of pipeline states (each an array of op descriptors)
  historyIndex: 0,
}

function appReducer(state, action) {
  switch (action.type) {
    case 'DB_LOADING':
      return { ...state, dbStatus: 'loading', dbError: null }
    case 'DB_READY':
      return { ...state, dbStatus: 'ready' }
    case 'DB_ERROR':
      return { ...state, dbStatus: 'error', dbError: action.error }
    case 'SET_BUSY':
      return { ...state, busy: action.label }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'SET_DATASET':
      return {
        ...state,
        dataset: action.dataset,
        history: [[]],
        historyIndex: 0,
        workVersion: 0,
        error: null,
      }
    case 'SET_DATASET_META':
      if (!state.dataset) return state
      return {
        ...state,
        dataset: {
          ...state.dataset,
          rowCount: action.rowCount,
          columns: action.columns,
        },
      }
    case 'BUMP_WORK_VERSION':
      return { ...state, workVersion: state.workVersion + 1 }
    case 'APPLY_OP': {
      const current = state.history[state.historyIndex]
      const next = [...current, action.op]
      const history = [...state.history.slice(0, state.historyIndex + 1), next]
      return { ...state, history, historyIndex: history.length - 1, error: null }
    }
    case 'UNDO':
      return {
        ...state,
        historyIndex: Math.max(0, state.historyIndex - 1),
        error: null,
      }
    case 'REDO':
      return {
        ...state,
        historyIndex: Math.min(state.history.length - 1, state.historyIndex + 1),
        error: null,
      }
    case 'RESET':
      return { ...state, historyIndex: 0, error: null }
    case 'CLEAR_DATASET':
      return {
        ...state,
        dataset: null,
        history: [[]],
        historyIndex: 0,
        workVersion: 0,
        busy: null,
        error: null,
      }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// App component
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const toast = useToast()
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [settings, setSettings] = useState(() => loadSettings())
  const dark = resolveTheme(settings.theme, systemDark) === 'dark'

  const [providers, setProviders] = useState(() => loadProviders())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [qualityOpen, setQualityOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [confetti, setConfetti] = useState(null) // { seed }
  const [activity, setActivity] = useState(() => loadActivity())

  // Latest dataset, readable from async callbacks.
  const datasetRef = useRef(null)
  // Monotonic session id; bumped when the dataset is cleared so in-flight
  // pipeline rebuilds never dispatch stale updates.
  const sessionRef = useRef(0)
  // Latest providers, readable from async callbacks without retriggering the
  // pipeline effect when settings change.
  const providersRef = useRef(providers)
  // AbortController for the current pipeline rebuild (AI ops are cancellable).
  const signalRef = useRef(null)
  const lastProgressRef = useRef(0)

  useEffect(() => {
    datasetRef.current = state.dataset
  }, [state.dataset])

  // Persist provider settings.
  useEffect(() => {
    providersRef.current = providers
    saveProviders(providers)
  }, [providers])

  // Persist app settings.
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  // Confetti auto-hide.
  useEffect(() => {
    if (!confetti) return undefined
    const id = window.setTimeout(() => setConfetti(null), 4200)
    return () => window.clearTimeout(id)
  }, [confetti])

  // Initialise DuckDB on mount.
  useEffect(() => {
    let cancelled = false

    async function boot() {
      dispatch({ type: 'DB_LOADING' })
      try {
        await initDuckDB()
        if (!cancelled) dispatch({ type: 'DB_READY' })
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: 'DB_ERROR',
            error: err.message || 'Failed to initialise DuckDB',
          })
        }
      }
    }

    boot()

    return () => {
      cancelled = true
      terminateDuckDB()
    }
  }, [])

  // Auto-start the onboarding tour once, after the engine is ready.
  useEffect(() => {
    if (state.dbStatus !== 'ready' || state.dataset || tourCompleted()) return
    const id = window.setTimeout(() => setTourOpen(true), 900)
    return () => window.clearTimeout(id)
  }, [state.dbStatus, state.dataset])

  const currentOps = state.history[state.historyIndex]

  // Replay the pipeline against the raw upload whenever it changes.
  useEffect(() => {
    const dataset = state.dataset
    if (!dataset || state.dbStatus !== 'ready') return

    const session = sessionRef.current
    let cancelled = false
    const controller = new AbortController()
    signalRef.current = controller

    // Throttled progress callback so AI ops don't spam re-renders.
    const onProgress = (label) => {
      const now = Date.now()
      if (now - lastProgressRef.current < 200) return
      lastProgressRef.current = now
      dispatch({ type: 'SET_BUSY', label })
    }

    dispatch({ type: 'SET_BUSY', label: 'Rebuilding table…' })
    dispatch({ type: 'CLEAR_ERROR' })

    ;(async () => {
      try {
        await rebuildPipeline(dataset.rawTable, currentOps, dataset.workTable, {
          provider: activeProvider(providersRef.current),
          onProgress,
          signal: controller.signal,
          onAiDone: (n) => {
            const next = recordAiValues(n)
            if (next) setActivity(next)
          },
        })
        if (cancelled || session !== sessionRef.current) return
        const meta = await getTableMeta(dataset.workTable)
        if (cancelled || session !== sessionRef.current) return
        dispatch({ type: 'SET_DATASET_META', rowCount: meta.rowCount, columns: meta.columns })
        dispatch({ type: 'BUMP_WORK_VERSION' })
      } catch (err) {
        const aborted = err?.name === 'AbortError' || /abort|cancelled/i.test(err?.message ?? '')
        if (aborted && !cancelled && session === sessionRef.current) {
          // User cancelled an AI op: keep partial results and refresh the grid.
          const meta = await getTableMeta(dataset.workTable).catch(() => null)
          if (meta) dispatch({ type: 'SET_DATASET_META', rowCount: meta.rowCount, columns: meta.columns })
          dispatch({ type: 'BUMP_WORK_VERSION' })
        } else if (!cancelled && session === sessionRef.current) {
          dispatch({ type: 'SET_ERROR', error: err.message || 'Failed to apply operation' })
          toast.error('Operation failed', err.message)
        }
      } finally {
        if (!cancelled) {
          signalRef.current = null
          dispatch({ type: 'SET_BUSY', label: null })
        }
      }
    })()

    return () => {
      cancelled = true
      // A pipeline change supersedes this rebuild; abort any in-flight AI work.
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dataset?.rawTable, state.dataset?.workTable, currentOps, state.dbStatus])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /** Loads a file (optionally with import options from the preview modal). */
  const handleLoadFile = useCallback(async (file, source = 'file', options = null) => {
    const prev = datasetRef.current
    const rawTable = `raw_${Date.now()}`
    const workTable = `work_${Date.now()}`

    dispatch({ type: 'SET_BUSY', label: `Parsing ${file.name}…` })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      if (prev) {
        await dropTable(prev.rawTable)
        await dropTable(prev.workTable)
      }
      const meta = await loadCsvFile(rawTable, file, options ?? {})
      setActivity(recordFile(file.name, source, meta.rowCount, meta.columns.length))
      dispatch({
        type: 'SET_DATASET',
        dataset: {
          name: file.name,
          source,
          rawTable,
          workTable,
          rowCount: meta.rowCount,
          columns: meta.columns,
        },
      })
      toast.success(`Loaded ${meta.rowCount.toLocaleString()} rows`, file.name)
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err.message || 'Failed to load the file.',
      })
      toast.error('Failed to load file', err.message)
      await dropTable(rawTable)
      await dropTable(workTable)
    } finally {
      dispatch({ type: 'SET_BUSY', label: null })
    }
  }, [toast])

  /** A user file was dropped/selected — open the import preview first. */
  const handleFile = useCallback((file) => {
    setPendingFile(file)
  }, [])

  /** A sample was picked from the gallery — load it directly. */
  const handleSample = useCallback((entry) => {
    handleLoadFile(sampleFileFor(entry), 'sample')
  }, [handleLoadFile])

  const handleNewDataset = useCallback(async () => {
    const dataset = datasetRef.current
    if (dataset) {
      await dropTable(dataset.rawTable)
      await dropTable(dataset.workTable)
    }
    sessionRef.current += 1
    dispatch({ type: 'CLEAR_DATASET' })
  }, [])

  const handleApplyOp = useCallback((op) => {
    setActivity(recordOp())
    dispatch({ type: 'APPLY_OP', op })
  }, [])
  const handleUndo = useCallback(() => {
    if (state.historyIndex > 0) dispatch({ type: 'UNDO' })
  }, [state.historyIndex])
  const handleRedo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) dispatch({ type: 'REDO' })
  }, [state.historyIndex, state.history.length])
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), [])
  const handleOpenMetrics = useCallback(() => setMetricsOpen(true), [])
  const handleCloseMetrics = useCallback(() => setMetricsOpen(false), [])
  const handleClearActivity = useCallback(() => {
    clearActivity()
    setActivity(loadActivity())
    toast.info('Activity cleared', 'All local metrics were erased.')
  }, [toast])
  const handleCancel = useCallback(() => {
    signalRef.current?.abort()
  }, [])

  const handleExport = useCallback(() => {
    if (state.dataset) setExportOpen(true)
  }, [state.dataset])

  const handleExported = useCallback(
    (format) => {
      setExportOpen(false)
      setActivity(recordExport())
      setConfetti({ seed: Date.now() })
      toast.success(
        'Export complete',
        format === 'json' ? 'JSON file downloaded.' : 'CSV file downloaded.',
      )
    },
    [toast],
  )

  const handleSettingsChange = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      if (patch.export) next.export = { ...prev.export, ...patch.export }
      if (patch.grid) next.grid = { ...prev.grid, ...patch.grid }
      return next
    })
  }, [])

  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, theme: resolveTheme(prev.theme, systemDark) === 'dark' ? 'light' : 'dark' }))
  }, [systemDark])

  const handleReplayTour = useCallback(() => {
    resetTour()
    setTourOpen(true)
  }, [])

  const handleTourFinish = useCallback(() => {
    markTourCompleted()
    setTourOpen(false)
  }, [])

  const handleClearAiCache = useCallback(async () => {
    await clearAiCache()
    toast.info('AI cache cleared', 'Past enrichment results were removed from IndexedDB.')
  }, [toast])

  // -------------------------------------------------------------------------
  // Keyboard shortcuts + command palette
  // -------------------------------------------------------------------------

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  useKeyboardShortcuts(
    useMemo(
      () => ({
        'ctrl+k': () => setPaletteOpen((o) => !o),
        'ctrl+p': () => setPaletteOpen((o) => !o),
        'ctrl+?': () => setShortcutsOpen((o) => !o),
        'ctrl+e': () => handleExport(),
        'ctrl+n': () => handleNewDataset(),
        'ctrl+z': () => handleUndo(),
        'ctrl+shift+z': () => handleRedo(),
        'ctrl+shift+r': () => handleReset(),
        'ctrl+shift+d': () => handleToggleTheme(),
        escape: () => {
          setPaletteOpen(false)
          setShortcutsOpen(false)
        },
      }),
      [handleExport, handleNewDataset, handleUndo, handleRedo, handleReset, handleToggleTheme],
    ),
  )

  const commandActions = useMemo(
    () => [
      {
        id: 'demo',
        title: 'Run guided demo',
        subtitle: 'Loads the sample and applies a showcase pipeline',
        icon: 'Sparkles',
        keywords: 'tour example walkthrough start',
        run: () => {
          runDemo({ onSample: handleSample, onApplyOp: handleApplyOp, toast })
        },
      },
      {
        id: 'samples',
        title: 'Load a sample dataset',
        subtitle: 'Browse the built-in gallery',
        icon: 'Sparkles',
        keywords: 'sample leads example',
        run: () => {
          const entry = SAMPLE_GALLERY.find((s) => s.id === 'leads')
          if (entry) handleSample(entry)
        },
      },
      ...(state.dataset
        ? [
            {
              id: 'export',
              title: 'Export dataset',
              subtitle: state.dataset.name,
              icon: 'FileDown',
              keywords: 'csv tsv json download',
              run: () => handleExport(),
            },
            {
              id: 'quality',
              title: 'Data quality report',
              subtitle: 'Score and issues for the current table',
              icon: 'BarChart3',
              keywords: 'quality score issues clean',
              run: () => setQualityOpen(true),
            },
            {
              id: 'undo',
              title: 'Undo last operation',
              subtitle: 'Replay the pipeline one step back',
              icon: 'Undo2',
              keywords: 'revert',
              run: () => handleUndo(),
              disabled: !canUndo,
            },
          ]
        : []),
      {
        id: 'new',
        title: 'New dataset',
        subtitle: 'Back to the upload screen',
        icon: 'FilePlus2',
        run: () => handleNewDataset(),
      },
      {
        id: 'metrics',
        title: 'Your activity & metrics',
        subtitle: 'Files processed, rows, operations',
        icon: 'BarChart3',
        run: () => setMetricsOpen(true),
      },
      {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Providers, appearance, export, data',
        icon: 'KeyRound',
        run: () => setSettingsOpen(true),
      },
      {
        id: 'shortcuts',
        title: 'Keyboard shortcuts',
        subtitle: 'Reference for all shortcuts',
        icon: 'HelpCircle',
        keywords: 'keys hotkeys',
        run: () => setShortcutsOpen(true),
      },
      {
        id: 'tour',
        title: 'Replay onboarding tour',
        subtitle: 'Walk through the app again',
        icon: 'Sparkles',
        run: () => handleReplayTour(),
      },
      {
        id: 'theme',
        title: dark ? 'Switch to light mode' : 'Switch to dark mode',
        subtitle: 'Appearance',
        icon: dark ? 'Sun' : 'Moon',
        run: () => handleToggleTheme(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.dataset, canUndo, dark],
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (state.dbStatus === 'error') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="w-full max-w-md border border-error/40 bg-surface p-6 text-center">
          <p className="mb-2 text-sm font-semibold text-error">
            Failed to initialise
          </p>
          <p className="mb-4 break-words text-xs text-text-secondary">
            {state.dbError}
          </p>
          <Button variant="danger" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    )
  }

  if (state.dbStatus !== 'ready') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-center">
          <Spinner className="mx-auto mb-4 h-8 w-8" />
          <p className="text-sm text-text-secondary">
            Initialising DuckDB engine…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-text-primary">
      {state.dataset && (
        <Header
          dataset={state.dataset}
          busy={state.busy}
          dark={dark}
          onToggleTheme={handleToggleTheme}
          onNewDataset={handleNewDataset}
          onOpenSettings={handleOpenSettings}
          onOpenMetrics={handleOpenMetrics}
        />
      )}

      {state.error && state.dataset && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-error/30 bg-error/5 px-4 py-2 text-sm text-error">
          <span className="min-w-0 truncate">{state.error}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            className="shrink-0 rounded-sm p-0.5 hover:bg-error/10"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1">
        {state.dataset ? (
          <Workspace
            dataset={state.dataset}
            workVersion={state.workVersion}
            ops={currentOps}
            canUndo={canUndo}
            canRedo={canRedo}
            busy={Boolean(state.busy)}
            busyLabel={state.busy}
            providers={providers}
            density={settings.grid.density}
            onDensityChange={(density) => handleSettingsChange({ grid: { density } })}
            onOpenQuality={() => setQualityOpen(true)}
            onApplyOp={handleApplyOp}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onReset={handleReset}
            onExport={handleExport}
            onCancel={handleCancel}
            onOpenSettings={handleOpenSettings}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <UploadView
              busy={state.busy}
              error={state.error}
              activity={activity}
              onFile={handleFile}
              onSample={handleSample}
              onOpenMetrics={handleOpenMetrics}
              onOpenSettings={handleOpenSettings}
              onToggleTheme={handleToggleTheme}
              onNewDataset={handleNewDataset}
              dark={dark}
            />
          </div>
        )}
      </main>

      {state.dataset && (
        <StatusBar
          rowCount={state.dataset.rowCount}
          columnCount={state.dataset.columns.length}
          opCount={currentOps.length}
        />
      )}

      {/* ------------------------------- Modals ------------------------------- */}
      {pendingFile && (
        <ImportPreviewModal
          file={pendingFile}
          onConfirm={(options) => {
            const file = pendingFile
            setPendingFile(null)
            handleLoadFile(file, 'file', options)
          }}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {exportOpen && state.dataset && (
        <ExportModal
          dataset={state.dataset}
          defaults={settings.export}
          onClose={() => setExportOpen(false)}
          onExported={handleExported}
        />
      )}

      {qualityOpen && state.dataset && (
        <QualityReportModal
          tableName={state.dataset.workTable}
          columns={state.dataset.columns}
          onClose={() => setQualityOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          providers={providers}
          onSave={setProviders}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClearActivity={handleClearActivity}
          onClearAiCache={handleClearAiCache}
          onReplayTour={handleReplayTour}
          onClose={handleCloseSettings}
        />
      )}

      {metricsOpen && (
        <MetricsModal
          activity={activity}
          onClear={handleClearActivity}
          onClose={handleCloseMetrics}
        />
      )}

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}

      <CommandPalette
        actions={commandActions}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {tourOpen && <OnboardingTour onFinish={handleTourFinish} />}

      <Confetti active={Boolean(confetti)} seed={confetti?.seed} />
    </div>
  )
}