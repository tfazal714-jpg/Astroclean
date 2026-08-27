import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, X, Minus, Square, Save, Undo2, Redo2, Search, LayoutGrid, Rows3, FileText, Plus, Check } from 'lucide-react'
import { cn } from '../utils/cn.js'
import DataGrid from './DataGrid.jsx'
import WorkspaceToolbar from './WorkspaceToolbar.jsx'
import Ribbon from './Ribbon.jsx'

const CONTEXT_ITEMS = [
  { id: 'cut', label: 'Cut' },
  { id: 'copy', label: 'Copy' },
  { id: 'sep-paste' },
  { id: 'insert-col-left', label: 'Insert Column Left', disabled: true },
  { id: 'insert-col-right', label: 'Insert Column Right', disabled: true },
  { id: 'delete-col', label: 'Delete Column' },
  { id: 'clear-col', label: 'Clear Contents' },
  { id: 'sep-col' },
  { id: 'insert-row-above', label: 'Insert Row Above', disabled: true },
  { id: 'insert-row-below', label: 'Insert Row Below', disabled: true },
  { id: 'delete-row', label: 'Delete Row', disabled: true },
  { id: 'sep-row' },
  { id: 'rename', label: 'Rename Header' },
]

function colLetter(index) {
  let result = ''
  let n = index
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

export default function WorkbookLayout({
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
  const [activeTab, setActiveTab] = useState('Home')
  const [ribbonOpen, setRibbonOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState(null)
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [activeCellValue, setActiveCellValue] = useState('')
  const [cellEditing, setCellEditing] = useState(false)
  const [cellValue, setCellValue] = useState('')
  const [edits, setEdits] = useState({})
  const [sheets, setSheets] = useState([{ id: 'sheet1', name: 'Sheet1' }])
  const [activeSheet, setActiveSheet] = useState('sheet1')
  const [sheetCount, setSheetCount] = useState(1)
  const [autoSave, setAutoSave] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [showGridlines, setShowGridlines] = useState(true)
  const [search, setSearch] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [stats, setStats] = useState({ loaded: 0, total: 0 })
  const searchRef = useRef(null)

  const columnNames = useMemo(() => (dataset ? dataset.columns.map((c) => c.name) : []), [dataset])
  const activeColName = columnNames[activeCell.col] || ''
  const cellAddress = colLetter(activeCell.col) + (activeCell.row + 1)
  const editKey = activeColName ? `${activeCell.row}:${activeColName}` : null

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1200)
  }, [])

  const handleCellSelect = useCallback((row, col, value) => {
    setActiveCell({ row, col })
    setActiveCellValue(value ?? '')
    setCellEditing(false)
  }, [])

  const handleCellDoubleClick = useCallback((row, col, value) => {
    setActiveCell({ row, col })
    setActiveCellValue(value ?? '')
    setCellValue(value ?? '')
    setCellEditing(true)
  }, [])

  const handleActiveValue = useCallback((value) => {
    setActiveCellValue(value ?? '')
  }, [])

  const handleCellEdit = useCallback((value) => {
    setCellValue(value)
  }, [])

  const commitEdit = useCallback((move) => {
    if (!editKey) return
    setEdits((prev) => {
      const next = { ...prev }
      if (cellValue === (activeCellValue ?? '')) return prev
      if (cellValue === '') delete next[editKey]
      else next[editKey] = cellValue
      return next
    })
    setActiveCellValue(cellValue)
    setCellEditing(false)
    if (move === 'down') setActiveCell((p) => ({ ...p, row: Math.min(p.row + 1, (dataset?.rowCount ?? 1) - 1) }))
    if (move === 'right') setActiveCell((p) => ({ ...p, col: Math.min(p.col + 1, columnNames.length - 1) }))
  }, [editKey, cellValue, activeCellValue, dataset, columnNames.length])

  const cancelEdit = useCallback(() => {
    setCellEditing(false)
    setCellValue(activeCellValue ?? '')
  }, [activeCellValue])

  const startEdit = useCallback((initial) => {
    if (!activeColName) return
    setCellValue(initial !== undefined ? initial : (activeCellValue ?? ''))
    setCellEditing(true)
  }, [activeColName, activeCellValue])

  const clearActiveCell = useCallback(() => {
    if (!editKey) return
    setEdits((prev) => ({ ...prev, [editKey]: '' }))
    setActiveCellValue('')
  }, [editKey])

  const handleKeyDown = useCallback((e) => {
    const tag = (e.target && e.target.tagName) || ''
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (cellEditing) return

    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveCell((p) => ({ ...p, row: Math.min(p.row + 1, (dataset?.rowCount ?? 1) - 1) })) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveCell((p) => ({ ...p, row: Math.max(0, p.row - 1) })) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveCell((p) => ({ ...p, col: Math.min(p.col + 1, columnNames.length - 1) })) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveCell((p) => ({ ...p, col: Math.max(0, p.col - 1) })) }
    else if (e.key === 'F2') { e.preventDefault(); startEdit() }
    else if (e.key === 'Enter') { e.preventDefault(); startEdit() }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearActiveCell() }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { startEdit(e.key) }
  }, [cellEditing, dataset, columnNames.length, startEdit, clearActiveCell])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleContextMenu = useCallback((e, colName, rowNum) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, colName, rowNum })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (!contextMenu) return undefined
    const handler = () => closeContextMenu()
    window.addEventListener('click', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [contextMenu, closeContextMenu])

  const handleContextAction = useCallback((itemId) => {
    if (!contextMenu) return
    const { colName } = contextMenu
    if (itemId === 'delete-col') {
      onApplyOp({ type: 'dropColumns', params: { columns: [colName] } })
    } else if (itemId === 'clear-col') {
      onApplyOp({ type: 'fillEmpty', params: { columns: [colName], value: '' } })
    } else if (itemId === 'rename') {
      const next = window.prompt(`Rename column "${colName}" to`, colName)
      if (next && next !== colName) {
        onApplyOp({ type: 'renameColumn', params: { from: colName, to: next } })
      }
    }
    closeContextMenu()
  }, [contextMenu, onApplyOp, closeContextMenu])

  const handleFind = useCallback(() => {
    if (searchRef.current) searchRef.current.focus()
  }, [])

  const handleZoomChange = useCallback((next) => {
    setZoom(Math.min(300, Math.max(25, next)))
  }, [])

  const addSheet = useCallback(() => {
    const n = sheetCount + 1
    const id = `sheet${n}`
    setSheetCount(n)
    setSheets((prev) => [...prev, { id, name: `Sheet${n}` }])
    setActiveSheet(id)
  }, [sheetCount])

  const renameSheet = useCallback((id, currentName) => {
    const next = window.prompt('Rename sheet', currentName)
    if (next && next !== currentName) {
      setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, name: next } : s)))
    }
  }, [])

  const deleteSheet = useCallback((id) => {
    if (sheets.length <= 1) return
    const next = sheets.filter((s) => s.id !== id)
    setSheets(next)
    if (activeSheet === id) setActiveSheet(next[0].id)
  }, [sheets, activeSheet])

  if (!dataset) return null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121212]">
      {/* Title bar */}
      <div className="flex h-10 shrink-0 items-center gap-2 bg-[#181818] px-3">
        <label className="flex cursor-pointer items-center gap-1.5 select-none">
          <span className="text-[11px] text-[#d4d4d4]">AutoSave</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoSave}
            onClick={() => setAutoSave(!autoSave)}
            className={cn('relative h-4 w-8 rounded-full transition-colors', autoSave ? 'bg-[#107c41]' : 'bg-[#3d3d3d]')}
          >
            <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform', autoSave ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </label>
        <button type="button" onClick={flashSaved} title="Save" className="rounded p-1 text-[#d4d4d4] hover:bg-[#2f2f2f]">
          {savedFlash ? <Check className="h-4 w-4 text-[#107c41]" /> : <Save className="h-4 w-4" />}
        </button>
        <div className="flex items-center">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo" className="rounded p-1 text-[#d4d4d4] hover:bg-[#2f2f2f] disabled:text-[#5c5c5c] disabled:hover:bg-transparent">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo" className="rounded p-1 text-[#d4d4d4] hover:bg-[#2f2f2f] disabled:text-[#5c5c5c] disabled:hover:bg-transparent">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <span className="ml-2 min-w-0 truncate text-[12px] text-[#d4d4d4]">{dataset.name} - Excel</span>

        <div className="relative mx-auto w-full max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9a9a9a]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-7 w-full rounded-sm border border-transparent bg-[#2b2b2b] pl-8 pr-2 text-[12px] text-white placeholder:text-[#9a9a9a] focus:border-[#107c41] focus:bg-[#1f1f1f] focus:outline-none"
          />
        </div>

        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#107c41] text-[10px] font-semibold text-white" title="Talha">T</div>
        <div className="ml-2 flex items-center gap-1 text-[#d4d4d4]">
          <button type="button" title="Minimize" className="rounded p-1 hover:bg-[#2f2f2f]"><Minus className="h-3.5 w-3.5" /></button>
          <button type="button" title="Maximize" className="rounded p-1 hover:bg-[#2f2f2f]"><Square className="h-3 w-3" /></button>
          <button type="button" title="Close" className="rounded p-1 hover:bg-[#2f2f2f]"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Ribbon */}
      <Ribbon
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={ribbonOpen}
        onToggleOpen={() => setRibbonOpen(!ribbonOpen)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onApplyOp={onApplyOp}
        activeColName={activeColName}
        onFind={handleFind}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        showGridlines={showGridlines}
        onToggleGridlines={() => setShowGridlines(!showGridlines)}
        onComments={() => {}}
        onShare={() => {}}
      />

      {/* Formula bar */}
      <div className="flex h-7 shrink-0 items-stretch border-b border-[#2d2d2d] bg-[#181818]">
        <button type="button" className="flex w-24 items-center justify-between border-r border-[#2d2d2d] px-2 text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f]">
          <span>{cellAddress}</span>
          <ChevronDown className="h-3 w-3 text-[#9a9a9a]" />
        </button>
        <div className="flex items-center gap-0.5 border-r border-[#2d2d2d] px-1.5">
          <button type="button" onClick={cancelEdit} disabled={!cellEditing} title="Cancel" className="rounded p-0.5 text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-red-400 disabled:text-[#4a4a4a] disabled:hover:bg-transparent">
            <X className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => commitEdit()} disabled={!cellEditing} title="Confirm" className="rounded p-0.5 text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-[#107c41] disabled:text-[#4a4a4a] disabled:hover:bg-transparent">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
          <button type="button" title="Insert function" className="rounded px-1 py-0.5 font-serif text-[12px] italic text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-white">fx</button>
        </div>
        <input
          type="text"
          value={cellEditing ? cellValue : (activeCellValue ?? '')}
          onChange={(e) => { setCellEditing(true); setCellValue(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit('down')
            if (e.key === 'Escape') cancelEdit()
          }}
          className="min-w-0 flex-1 bg-[#181818] px-2 text-[12px] text-white outline-none"
        />
      </div>

      {/* Quick actions strip */}
      {busyLabel && (
        <div className="flex h-6 shrink-0 items-center gap-2 border-b border-[#2d2d2d] bg-[#1a2b1f] px-3">
          <span className="flex items-center gap-1.5 text-[10px] text-[#107c41]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#107c41]" />
            {busyLabel}
          </span>
          <button type="button" onClick={onCancel} className="ml-auto text-[10px] text-[#9a9a9a] hover:text-white">Cancel</button>
        </div>
      )}

      <WorkspaceToolbar
        table={dataset.workTable}
        columns={dataset.columns}
        refreshKey={workVersion}
        onApplyOp={onApplyOp}
        onExport={onExport}
      />

      {/* Grid */}
      <div className="min-h-0 flex-1">
        <DataGrid
          table={dataset.workTable}
          columns={dataset.columns}
          rowCount={dataset.rowCount}
          refreshKey={workVersion}
          search={search}
          zoom={zoom}
          showGridlines={showGridlines}
          density={density}
          edits={edits}
          activeCell={activeCell}
          onCellSelect={handleCellSelect}
          onCellDoubleClick={handleCellDoubleClick}
          onActiveValue={handleActiveValue}
          cellEditing={cellEditing}
          cellValue={cellValue}
          onCellEdit={handleCellEdit}
          onCellCommit={commitEdit}
          onCellCancel={cancelEdit}
          onContextMenu={handleContextMenu}
          onStats={setStats}
        />
      </div>

      {/* Sheet tab bar */}
      <div className="flex h-7 shrink-0 items-center gap-1 border-t border-[#2d2d2d] bg-[#181818] px-2">
        {sheets.map((s) => (
          <div key={s.id} className={cn('group flex items-center rounded-t-sm', activeSheet === s.id ? 'bg-[#121212]' : '')}>
            <button
              type="button"
              onClick={() => setActiveSheet(s.id)}
              onDoubleClick={() => renameSheet(s.id, s.name)}
              className={cn(
                'px-3 py-1 text-[11px]',
                activeSheet === s.id
                  ? 'border-x border-t border-[#2d2d2d] bg-[#121212] font-medium text-white'
                  : 'text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-white',
              )}
            >
              {s.name}
            </button>
            {activeSheet === s.id && sheets.length > 1 && (
              <button type="button" onClick={() => deleteSheet(s.id)} title="Delete sheet" className="mr-1 text-[#9a9a9a] hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addSheet} title="Add sheet" className="rounded p-1 text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-white">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-3 bg-[#107c41] px-3 text-[10px] text-white">
        <span className="font-medium">Ready</span>
        <span className="hidden items-center gap-1 md:flex">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          Accessibility: Good to go
        </span>
        <span className="font-mono tabular-nums opacity-90">
          {stats.loaded.toLocaleString()} / {stats.total.toLocaleString()} rows
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button type="button" title="Normal" className="rounded p-0.5 hover:bg-white/20"><LayoutGrid className="h-3 w-3" /></button>
            <button type="button" title="Page Layout" className="rounded p-0.5 hover:bg-white/20"><FileText className="h-3 w-3" /></button>
            <button type="button" title="Page Break Preview" className="rounded p-0.5 hover:bg-white/20"><Rows3 className="h-3 w-3" /></button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => handleZoomChange(zoom - 10)} title="Zoom out" className="rounded p-0.5 hover:bg-white/20"><Minus className="h-3 w-3" /></button>
            <input
              type="range"
              min={25}
              max={300}
              step={5}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer accent-white"
            />
            <button type="button" onClick={() => handleZoomChange(zoom + 10)} title="Zoom in" className="rounded p-0.5 hover:bg-white/20"><Plus className="h-3 w-3" /></button>
            <button type="button" onClick={() => handleZoomChange(100)} className="w-9 text-right font-mono tabular-nums">{zoom}%</button>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 w-56 border border-[#3b3b3b] bg-[#1f1f1f] py-1 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="border-b border-[#3b3b3b] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#9a9a9a]">
            {contextMenu.colName}
          </div>
          {CONTEXT_ITEMS.map((item) =>
            item.id && item.id.startsWith('sep') ? (
              <div key={item.id} className="my-1 border-t border-[#3b3b3b]" />
            ) : (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => handleContextAction(item.id)}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-left text-[11px]',
                  item.disabled ? 'cursor-default text-[#5c5c5c]' : 'text-[#d4d4d4] hover:bg-[#2f2f2f] hover:text-white',
                )}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
