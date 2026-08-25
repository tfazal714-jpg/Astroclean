import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, X, Plus, Trash, ArrowLeftRight, Maximize2, Minimize2 } from 'lucide-react'
import { AI_OPS, CLEAN_OPS, ENRICH_OPS } from '../utils/scrubbers.js'
import { formatNumber } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { Badge, Button, IconButton } from './ui.jsx'
import DataGrid from './DataGrid.jsx'
import OpsPanel from './OpsPanel.jsx'
import ColumnsPanel from './ColumnsPanel.jsx'
import PipelineCard from './PipelineCard.jsx'
import WorkspaceToolbar from './WorkspaceToolbar.jsx'

const RIBBON_TABS = ['File', 'Home', 'Insert', 'Draw', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help']

const CONTEXT_MENU_ITEMS = [
  { id: 'insert-col-left', label: 'Insert Column Left' },
  { id: 'insert-col-right', label: 'Insert Column Right' },
  { id: 'delete-col', label: 'Delete Column' },
  { id: 'separator' },
  { id: 'insert-row-above', label: 'Insert Row Above' },
  { id: 'insert-row-below', label: 'Insert Row Below' },
  { id: 'delete-row', label: 'Delete Row' },
]

const SHEETS = [{ id: 'sheet1', name: 'Sheet1' }]

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
  const [activeRibbonTab, setActiveRibbonTab] = useState('Home')
  const [ribbonOpen, setRibbonOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState(null)
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 })
  const [cellEditing, setCellEditing] = useState(false)
  const [cellValue, setCellValue] = useState('')
  const [selectedCells, setSelectedCells] = useState([])
  const [sheets, setSheets] = useState(SHEETS)
  const [activeSheet, setActiveSheet] = useState('sheet1')
  const [autoSave, setAutoSave] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [sidePanel, setSidePanel] = useState(null)
  const [sidePanelTab, setSidePanelTab] = useState('clean')
  const formulaInputRef = useRef(null)

  const columnNames = dataset ? dataset.columns.map((c) => c.name) : []
  const cellAddress = colLetter(activeCell.col) + (activeCell.row + 1)
  const activeColName = columnNames[activeCell.col] || ''

  const handleContextMenu = useCallback((e, colName, rowNum) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, colName, rowNum })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu()
      window.addEventListener('click', handler)
      window.addEventListener('scroll', handler, true)
      return () => {
        window.removeEventListener('click', handler)
        window.removeEventListener('scroll', handler, true)
      }
    }
  }, [contextMenu, closeContextMenu])

  const handleContextAction = useCallback((actionId) => {
    if (!contextMenu) return
    const { colName, rowNum } = contextMenu
    switch (actionId) {
      case 'insert-col-left':
        onApplyOp({ type: 'insert_column', params: { after: colName, position: 'left' } })
        break
      case 'insert-col-right':
        onApplyOp({ type: 'insert_column', params: { after: colName, position: 'right' } })
        break
      case 'delete-col':
        onApplyOp({ type: 'drop_columns', params: { columns: [colName] } })
        break
      case 'insert-row-above':
        onApplyOp({ type: 'insert_row', params: { position: 'above', rowNum } })
        break
      case 'insert-row-below':
        onApplyOp({ type: 'insert_row', params: { position: 'below', rowNum } })
        break
      case 'delete-row':
        onApplyOp({ type: 'delete_row', params: { rowNum } })
        break
      default:
        break
    }
    closeContextMenu()
  }, [contextMenu, onApplyOp, closeContextMenu])

  const handleCellSelect = useCallback((row, col) => {
    setActiveCell({ row, col })
    setCellEditing(false)
  }, [])

  const handleCellDoubleClick = useCallback((row, col, value) => {
    setActiveCell({ row, col })
    setCellEditing(true)
    setCellValue(value || '')
  }, [])

  const handleCellEdit = useCallback((value) => {
    setCellValue(value)
  }, [])

  const handleCellCommit = useCallback(() => {
    setCellEditing(false)
    if (cellValue !== '' && activeColName) {
      onApplyOp({ type: 'cell_edit', params: { row: activeCell.row, column: activeColName, value: cellValue } })
    }
  }, [cellValue, activeCell, activeColName, onApplyOp])

  const handleKeyDown = useCallback((e) => {
    if (cellEditing) {
      if (e.key === 'Enter') { handleCellCommit(); setActiveCell((p) => ({ ...p, row: p.row + 1 })) }
      if (e.key === 'Tab') { e.preventDefault(); handleCellCommit(); setActiveCell((p) => ({ ...p, col: p.col + 1 })) }
      if (e.key === 'Escape') { setCellEditing(false) }
      return
    }
    if (e.key === 'ArrowDown') setActiveCell((p) => ({ ...p, row: Math.max(0, p.row - 1) }))
    if (e.key === 'ArrowUp') setActiveCell((p) => ({ ...p, row: p.row + 1 }))
    if (e.key === 'ArrowRight') setActiveCell((p) => ({ ...p, col: Math.min(columnNames.length - 1, p.col + 1) }))
    if (e.key === 'ArrowLeft') setActiveCell((p) => ({ ...p, col: Math.max(0, p.col - 1) }))
    if (e.key === 'F2') { setCellEditing(true); setCellValue('') }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      onApplyOp({ type: 'cell_edit', params: { row: activeCell.row, column: activeColName, value: '' } })
    }
  }, [cellEditing, activeCell, columnNames, activeColName, handleCellCommit, onApplyOp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!dataset) return null

  return (
    <div className="flex h-full flex-col bg-[#121212]">
      {/* === Title Bar === */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#2d2d2d] bg-[#181818] px-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#107c41]">AstroClean</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
          </button>
          <span className="flex items-center gap-1 text-[11px] text-[#888888]">
            <span className="text-white">{autoSave ? 'AutoSave' : 'AutoSave'}</span>
            <button type="button" onClick={() => setAutoSave(!autoSave)} className={cn('relative h-4 w-7 rounded-full transition-colors', autoSave ? 'bg-[#107c41]' : 'bg-[#3d3d3d]')}>
              <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform', autoSave ? 'left-3.5' : 'left-0.5')} />
            </button>
          </span>
        </div>
        <div className="mx-1 flex items-center gap-1">
          <button type="button" className="rounded px-1.5 py-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white" title="Undo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
          </button>
          <button type="button" className="rounded px-1.5 py-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white" title="Redo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
          </button>
        </div>
        <div className="flex-1 text-center text-[12px] text-white">{dataset.name} - AstroClean</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search" className="h-6 w-40 rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] pl-7 pr-2 text-[11px] text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none" />
          </div>
          <button type="button" className="rounded px-2 py-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button type="button" className="rounded-sm bg-[#107c41] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#0e6a37]">
            Share
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#107c41] text-[10px] font-bold text-white">S</div>
        </div>
      </div>

      {/* === Ribbon Tab Bar === */}
      <div className="flex h-7 shrink-0 items-center border-b border-[#2d2d2d] bg-[#181818] px-2">
        <button type="button" className="px-3 py-1 text-[11px] font-medium text-[#cccccc] hover:bg-[#2d2d2d]">File</button>
        {RIBBON_TABS.slice(1).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveRibbonTab(tab)}
            className={cn(
              'px-3 py-1 text-[11px] font-medium transition-colors',
              activeRibbonTab === tab
                ? 'border-b-2 border-[#107c41] text-white'
                : 'text-[#888888] hover:bg-[#2d2d2d] hover:text-white'
            )}
          >
            {tab}
          </button>
        ))}
        <button type="button" onClick={() => setRibbonOpen(!ribbonOpen)} className="ml-auto p-1 text-[#888888] hover:text-white">
          {ribbonOpen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>

      {/* === Ribbon Content (Home tab) === */}
      {ribbonOpen && activeRibbonTab === 'Home' && (
        <div className="flex shrink-0 items-stretch border-b border-[#2d2d2d] bg-[#181818] px-2 py-1.5" style={{ minHeight: 72 }}>
          {/* Clipboard */}
          <div className="flex flex-col items-center gap-1 border-r border-[#2d2d2d] px-2">
            <div className="flex gap-1">
              <button type="button" className="flex flex-col items-center gap-0.5 rounded px-2 py-1 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Paste
              </button>
            </div>
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-2 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Cut</button>
              <button type="button" className="rounded px-2 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Copy</button>
              <button type="button" className="rounded px-2 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Format Painter</button>
            </div>
            <span className="text-[8px] text-[#888888]">Clipboard</span>
          </div>

          {/* Font */}
          <div className="flex flex-col gap-1 border-r border-[#2d2d2d] px-2">
            <div className="flex items-center gap-1">
              <select className="h-5 w-28 rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] px-1 text-[10px] text-[#cccccc]">
                <option>Aptos Narrow</option>
                <option>Arial</option>
                <option>Calibri</option>
                <option>Segoe UI</option>
              </select>
              <select className="h-5 w-10 rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] px-1 text-[10px] text-[#cccccc]">
                <option>11</option>
                <option>10</option>
                <option>12</option>
                <option>14</option>
              </select>
              <button type="button" className="rounded px-1 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">A+</button>
              <button type="button" className="rounded px-1 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">A-</button>
            </div>
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-1.5 py-0.5 text-[11px] font-bold text-[#cccccc] hover:bg-[#2d2d2d]">B</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[11px] italic text-[#cccccc] hover:bg-[#2d2d2d]">I</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[11px] underline text-[#cccccc] hover:bg-[#2d2d2d]">U</button>
              <button type="button" className="rounded px-1 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">A</button>
            </div>
            <span className="text-[8px] text-[#888888]">Font</span>
          </div>

          {/* Alignment */}
          <div className="flex flex-col gap-1 border-r border-[#2d2d2d] px-2">
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Top align">&#8593;</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Middle align">&#8596;</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Bottom align">&#8595;</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Left align">&#8676;</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Center">&#8596;</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]" title="Right align">&#8677;</button>
            </div>
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Wrap Text</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Merge</button>
            </div>
            <span className="text-[8px] text-[#888888]">Alignment</span>
          </div>

          {/* Number */}
          <div className="flex flex-col gap-1 border-r border-[#2d2d2d] px-2">
            <div className="flex items-center gap-1">
              <select className="h-5 w-20 rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] px-1 text-[10px] text-[#cccccc]">
                <option>General</option>
                <option>Number</option>
                <option>Currency</option>
                <option>Text</option>
              </select>
            </div>
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">$</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">%</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">,</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">.0</button>
            </div>
            <span className="text-[8px] text-[#888888]">Number</span>
          </div>

          {/* Cells */}
          <div className="flex flex-col gap-1 border-r border-[#2d2d2d] px-2">
            <div className="flex gap-0.5">
              <button type="button" onClick={() => { if (activeColName) onApplyOp({ type: 'insert_column', params: { after: activeColName, position: 'right' } }) }} className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Insert</button>
              <button type="button" onClick={() => { if (activeColName) onApplyOp({ type: 'drop_columns', params: { columns: [activeColName] } }) }} className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Delete</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Format</button>
            </div>
            <span className="text-[8px] text-[#888888]">Cells</span>
          </div>

          {/* Editing */}
          <div className="flex flex-col gap-1 px-2">
            <div className="flex gap-0.5">
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">AutoSum</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Fill</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Clear</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Sort & Filter</button>
              <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-[#cccccc] hover:bg-[#2d2d2d]">Find & Select</button>
            </div>
            <span className="text-[8px] text-[#888888]">Editing</span>
          </div>
        </div>
      )}

      {/* === Formula Bar === */}
      <div className="flex h-7 shrink-0 items-center border-b border-[#2d2d2d] bg-[#181818]">
        <div className="flex h-full w-20 items-center justify-center border-r border-[#2d2d2d] text-[11px] font-medium text-white">
          {cellAddress}
        </div>
        <div className="flex items-center gap-1 border-r border-[#2d2d2d] px-2">
          <button type="button" className="rounded px-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-red-400">X</button>
          <button type="button" className="rounded px-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-green-400">&#10003;</button>
          <button type="button" className="rounded px-1 text-[11px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white">fx</button>
        </div>
        <input
          ref={formulaInputRef}
          type="text"
          value={cellEditing ? cellValue : ''}
          onChange={(e) => handleCellEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCellCommit()
            if (e.key === 'Escape') setCellEditing(false)
          }}
          onFocus={() => setCellEditing(true)}
          className="h-full flex-1 bg-[#181818] px-2 text-[11px] text-white outline-none"
          placeholder=""
        />
      </div>

      {/* === Column Headers (A, B, C...) === */}
      <div className="flex shrink-0 items-center border-b border-[#2d2d2d] bg-[#181818]">
        <div className="sticky left-0 z-20 flex h-6 w-14 shrink-0 items-center justify-center border-r border-[#2d2d2d] bg-[#181818] text-[10px] text-[#888888]">
          #
        </div>
        {columnNames.map((colName, i) => (
          <div
            key={colName}
            className={cn(
              'flex h-6 shrink-0 items-center justify-center border-r border-[#2d2d2d] text-[10px] font-medium',
              activeCell.col === i ? 'bg-[#107c41]/20 text-[#107c41]' : 'bg-[#181818] text-[#888888]'
            )}
            style={{ width: 176, minWidth: 176 }}
          >
            {colLetter(i)}
          </div>
        ))}
      </div>

      {/* === Main Content === */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar for operations (collapsed by default) */}
        {sidePanel && (
          <div className="flex w-72 shrink-0 flex-col border-r border-[#2d2d2d] bg-[#1e1e1e]">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] px-3 py-2">
              <span className="text-xs font-semibold text-white">Operations</span>
              <button type="button" onClick={() => setSidePanel(null)} className="text-[#888888] hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 border-b border-[#2d2d2d] px-2 py-1.5">
              {['clean', 'enrich', 'ai', 'columns'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSidePanelTab(t)}
                  className={cn(
                    'h-6 flex-1 rounded-sm text-[10px] font-medium capitalize transition-colors',
                    sidePanelTab === t
                      ? 'bg-[#107c41] text-white'
                      : 'text-[#888888] hover:text-white'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              {sidePanelTab === 'clean' && <OpsPanel ops={CLEAN_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
              {sidePanelTab === 'enrich' && <OpsPanel ops={ENRICH_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
              {sidePanelTab === 'ai' && <OpsPanel ops={AI_OPS} columns={columnNames} busy={busy} providers={providers} onOpenSettings={onOpenSettings} onApply={onApplyOp} />}
              {sidePanelTab === 'columns' && (
                <ColumnsPanel table={dataset.workTable} columns={dataset.columns} refreshKey={workVersion} />
              )}
            </div>
            <div className="shrink-0 border-t border-[#2d2d2d]">
              <PipelineCard ops={ops} canUndo={canUndo} canRedo={canRedo} busy={busy} onUndo={onUndo} onRedo={onRedo} onReset={onReset} />
            </div>
          </div>
        )}

        {/* Spreadsheet Grid */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Toolbar row */}
          <div className="flex shrink-0 items-center gap-2 border-b border-[#2d2d2d] bg-[#1e1e1e] px-3 py-1.5">
            <button type="button" onClick={() => setSidePanel(sidePanel ? null : true)} className="rounded px-2 py-1 text-[10px] text-[#888888] hover:bg-[#2d2d2d] hover:text-white">
              {sidePanel ? 'Hide Panel' : 'Show Panel'}
            </button>
            {busyLabel && (
              <span className="rounded bg-[#107c41]/20 px-2 py-0.5 text-[10px] text-[#107c41]">{busyLabel}</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={onExport} className="flex items-center gap-1 rounded-sm bg-[#107c41] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#0e6a37]">
                Export CSV
              </button>
            </div>
          </div>

          {/* Workspace toolbar (quick actions + column badges) */}
          <WorkspaceToolbar
            table={dataset.workTable}
            columns={dataset.columns}
            refreshKey={workVersion}
            onApplyOp={onApplyOp}
            onExport={onExport}
          />

          {/* DataGrid with Excel cell selection */}
          <div className="min-h-0 flex-1 bg-[#121212]">
            <DataGrid
              table={dataset.workTable}
              columns={dataset.columns}
              rowCount={dataset.rowCount}
              refreshKey={workVersion}
              density={density}
              onDensityChange={onDensityChange}
              onOpenQuality={onOpenQuality}
              onContextMenu={handleContextMenu}
              activeCell={activeCell}
              onCellSelect={handleCellSelect}
              onCellDoubleClick={handleCellDoubleClick}
              cellEditing={cellEditing}
              cellValue={cellValue}
              onCellEdit={handleCellEdit}
              onCellCommit={handleCellCommit}
            />
          </div>
        </div>
      </div>

      {/* === Bottom Status Bar === */}
      <div className="flex h-7 shrink-0 items-center border-t border-[#2d2d2d] bg-[#181818] px-3">
        {/* Sheet tabs */}
        <div className="flex items-center gap-1">
          <button type="button" className="rounded px-1 text-[10px] text-[#888888] hover:bg-[#2d2d2d]">&#9664;</button>
          <button type="button" className="rounded px-1 text-[10px] text-[#888888] hover:bg-[#2d2d2d]">&#9654;</button>
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSheet(s.id)}
              className={cn(
                'rounded-sm px-3 py-1 text-[10px] font-medium',
                activeSheet === s.id ? 'bg-white text-black' : 'text-[#888888] hover:bg-[#2d2d2d]'
              )}
            >
              {s.name}
            </button>
          ))}
          <button type="button" className="rounded px-1 text-[10px] text-[#888888] hover:bg-[#2d2d2d]" title="Add sheet">+</button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-[#888888]">Ready</span>
          <span className="text-[10px] text-[#888888]">&#9881; Accessibility: Good to go</span>
          <div className="flex items-center gap-1 text-[10px] text-[#888888]">
            <button type="button" onClick={() => setZoom(Math.max(25, zoom - 10))} className="hover:text-white">-</button>
            <span className="w-8 text-center">{zoom}%</span>
            <button type="button" onClick={() => setZoom(Math.min(400, zoom + 10))} className="hover:text-white">+</button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div className="fixed z-50 w-52 border border-[#2d2d2d] bg-[#1e1e1e] shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#888888]">
              {contextMenu.colName} &middot; Row {contextMenu.rowNum}
            </div>
            <div className="border-t border-[#2d2d2d]" />
            {CONTEXT_MENU_ITEMS.map((item) =>
              item.id === 'separator' ? (
                <div key="sep" className="border-t border-[#2d2d2d]" />
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleContextAction(item.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[#cccccc] hover:bg-[#2d2d2d]"
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
