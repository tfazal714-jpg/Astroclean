import { useCallback, useEffect, useReducer } from 'react'
import { initDuckDB, terminateDuckDB } from './services/duckdb.js'

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const initialState = {
  view: 'upload', // 'upload' | 'workspace'
  dbStatus: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  dbError: null,
  dataset: null, // { tableName, rowCount, columns }
}

function appReducer(state, action) {
  switch (action.type) {
    case 'DB_LOADING':
      return { ...state, dbStatus: 'loading', dbError: null }
    case 'DB_READY':
      return { ...state, dbStatus: 'ready' }
    case 'DB_ERROR':
      return { ...state, dbStatus: 'error', dbError: action.error }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SET_DATASET':
      return { ...state, dataset: action.dataset, view: 'workspace' }
    case 'CLEAR_DATASET':
      return { ...state, dataset: null, view: 'upload' }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// App component
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

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

  const handleClearData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATASET' })
  }, [])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (state.dbStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">
            Initialising DuckDB engine...
          </p>
        </div>
      </div>
    )
  }

  if (state.dbStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-2 font-semibold text-red-800">
            Failed to initialise
          </p>
          <p className="mb-4 text-sm text-red-600">{state.dbError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-indigo-600">
            AstroClean
          </h1>
          <nav className="flex items-center gap-3">
            {state.dataset && (
              <>
                <span className="text-xs text-slate-400">
                  {state.dataset.rowCount.toLocaleString()} rows
                </span>
                <button
                  onClick={handleClearData}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Clear data
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {state.view === 'upload' && (
          <div className="flex flex-col items-center justify-center pt-16">
            <div className="max-w-lg text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Upload your lead list
              </h2>
              <p className="mb-8 text-sm text-slate-500">
                Drop a CSV file to start scrubbing and enriching your
                leads. All processing happens in your browser.
              </p>
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 hover:border-indigo-400">
                <p className="text-sm text-slate-400">
                  Drag and drop a CSV here, or click to browse
                </p>
              </div>
            </div>
          </div>
        )}

        {state.view === 'workspace' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              Workspace view — data table and scrubbing controls will
              render here.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
