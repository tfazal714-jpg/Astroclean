import { useState } from 'react'
import {
  Clipboard, Scissors, Copy, Paintbrush, Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, WrapText, Merge, DollarSign, Percent, Sigma, Eraser, PaintBucket, Table2,
  Image, Shapes, BarChart3, LineChart, PieChart, Filter, Search, PenTool, FileText,
  SpellCheck, MessageSquare, Lock, Eye, ZoomIn, ZoomOut, ChevronDown, ChevronUp, X,
  Undo2, Redo2, Save, ArrowUpDown, ListFilter, Type, Hash, SlidersHorizontal, RefreshCw,
  Database, Sparkles, Highlighter, StickyNote, Pencil, LayoutGrid, Baseline, Columns3,
  PenLine, Link, Lightbulb, LifeBuoy, MessageCircle, Send, BookOpen, Play, Rows3,
  Grid3X3, Frame, History,  Workflow, Zap, Table, TrendingUp, AreaChart, ScatterChart, Share2, Check,
} from 'lucide-react'
import { cn } from '../utils/cn.js'

export const RIBBON_TABS = ['File', 'Home', 'Insert', 'Draw', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Automate', 'Help']

const FONT_FAMILIES = ['Aptos Narrow', 'Aptos', 'Calibri', 'Arial', 'Segoe UI', 'Consolas']
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]
const NUMBER_FORMATS = ['General', 'Number', 'Currency', 'Accounting', 'Short Date', 'Long Date', 'Time', 'Percentage', 'Fraction', 'Scientific', 'Text']

function Group({ label, children, last }) {
  return (
    <div className={cn('flex flex-col items-center gap-1 border-r border-[#3b3b3b] px-2 pb-0.5', last && 'border-r-0')}>
      <div className="flex flex-1 items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-[#9a9a9a]">{label}</span>
    </div>
  )
}

function Btn({ icon: Icon, label, large, active, disabled, caret, onClick, title, className }) {
  return (
    <button
      type="button"
      title={title || (typeof label === 'string' ? label : '')}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-sm text-[#d4d4d4] transition-colors',
        large ? 'flex-col px-2.5 py-1 text-[10px]' : 'h-6 px-1.5 text-[11px]',
        disabled ? 'cursor-default text-[#5c5c5c]' : 'hover:bg-[#2f2f2f] hover:text-white',
        active && 'bg-[#107c41]/25 text-white',
        className,
      )}
    >
      {Icon && <Icon className={large ? 'h-5 w-5' : 'h-3.5 w-3.5'} />}
      <span className="whitespace-nowrap">{label}</span>
      {caret && <ChevronDown className="h-2.5 w-2.5 opacity-70" />}
    </button>
  )
}

function IconBtn({ icon: Icon, title, active, disabled, onClick }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-sm text-[#d4d4d4]',
        disabled ? 'cursor-default text-[#5c5c5c]' : 'hover:bg-[#2f2f2f] hover:text-white',
        active && 'bg-[#107c41]/25 text-white',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

function Select({ value, onChange, options, width }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-5 rounded-sm border border-[#3b3b3b] bg-[#1f1f1f] px-1 text-[11px] text-[#d4d4d4] focus:border-[#107c41] focus:outline-none"
      style={{ width }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function Divider() {
  return <div className="mx-0.5 h-4 w-px bg-[#3b3b3b]" />
}

export default function Ribbon({
  activeTab,
  onTabChange,
  open,
  onToggleOpen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyOp,
  activeColName,
  onFind,
  zoom,
  onZoomChange,
  showGridlines,
  onToggleGridlines,
  onComments,
  onShare,
}) {
  const [fontFamily, setFontFamily] = useState('Aptos Narrow')
  const [fontSize, setFontSize] = useState('11')
  const [numFormat, setNumFormat] = useState('General')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const colReady = Boolean(activeColName)

  const sortColumn = (direction) => {
    setSortMenuOpen(false)
    if (activeColName) onApplyOp({ type: 'sortRows', params: { column: activeColName, direction } })
  }

  const clearBlanks = () => {
    setSortMenuOpen(false)
    if (activeColName) {
      onApplyOp({ type: 'filterRows', params: { column: activeColName, mode: 'regex', match: '^\\s*$', action: 'drop' } })
    }
  }

  const homeGroups = (
    <>
      <Group label="Clipboard">
        <Btn icon={Clipboard} label="Paste" large title="Paste (Ctrl+V)" />
        <div className="flex flex-col gap-0.5">
          <Btn icon={Scissors} label="Cut" />
          <Btn icon={Copy} label="Copy" />
          <Btn icon={Paintbrush} label="Format Painter" />
        </div>
      </Group>

      <Group label="Font">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Select value={fontFamily} onChange={setFontFamily} options={FONT_FAMILIES} width={104} />
            <Select value={fontSize} onChange={setFontSize} options={FONT_SIZES.map(String)} width={44} />
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn icon={Bold} title="Bold (Ctrl+B)" />
            <IconBtn icon={Italic} title="Italic (Ctrl+I)" />
            <IconBtn icon={Underline} title="Underline (Ctrl+U)" />
            <Divider />
            <IconBtn icon={Grid3X3} title="Borders" />
            <IconBtn icon={PaintBucket} title="Fill color" />
            <IconBtn icon={Baseline} title="Font color" />
          </div>
        </div>
      </Group>

      <Group label="Alignment">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-0.5">
            <IconBtn icon={AlignLeft} title="Align left" />
            <IconBtn icon={AlignCenter} title="Center" />
            <IconBtn icon={AlignRight} title="Align right" />
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn icon={WrapText} title="Wrap text" />
            <Btn icon={Merge} label="Merge & Center" />
          </div>
        </div>
      </Group>

      <Group label="Number">
        <div className="flex flex-col gap-1">
          <Select value={numFormat} onChange={setNumFormat} options={NUMBER_FORMATS} width={104} />
          <div className="flex items-center gap-0.5">
            <IconBtn icon={DollarSign} title="Accounting number format" />
            <IconBtn icon={Percent} title="Percent style" />
            <IconBtn icon={Hash} title="Comma style" />
            <Divider />
            <Btn label=".00 &rarr;" title="Increase decimal" className="font-mono" />
            <Btn label="&larr; .0" title="Decrease decimal" className="font-mono" />
          </div>
        </div>
      </Group>

      <Group label="Styles">
        <div className="flex flex-col gap-0.5">
          <Btn icon={SlidersHorizontal} label="Conditional Formatting" caret />
          <Btn icon={Table} label="Format as Table" caret />
          <Btn icon={Frame} label="Cell Styles" caret />
        </div>
      </Group>

      <Group label="Cells">
        <div className="flex flex-col gap-0.5">
          <Btn icon={Columns3} label="Insert" caret disabled title="Not wired up yet" />
          <Btn
            icon={X}
            label="Delete"
            caret
            disabled={!colReady}
            title={colReady ? `Delete column ${activeColName}` : 'Select a column first'}
            onClick={() => activeColName && onApplyOp({ type: 'dropColumns', params: { columns: [activeColName] } })}
          />
          <Btn icon={SlidersHorizontal} label="Format" caret />
        </div>
      </Group>

      <Group label="Editing">
        <div className="flex flex-col gap-0.5">
          <Btn icon={Sigma} label="AutoSum" caret disabled title="Not wired up yet" />
          <div className="relative">
            <Btn icon={ArrowUpDown} label="Sort & Filter" caret active={sortMenuOpen} onClick={() => setSortMenuOpen(!sortMenuOpen)} />
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute left-0 top-full z-50 w-44 border border-[#3b3b3b] bg-[#1f1f1f] py-1 shadow-xl">
                  <button type="button" disabled={!colReady} onClick={() => sortColumn('ASC')} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f] disabled:text-[#5c5c5c]">
                    <ArrowUpDown className="h-3 w-3" /> Sort A to Z
                  </button>
                  <button type="button" disabled={!colReady} onClick={() => sortColumn('DESC')} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f] disabled:text-[#5c5c5c]">
                    <ArrowUpDown className="h-3 w-3 rotate-180" /> Sort Z to A
                  </button>
                  <div className="my-1 border-t border-[#3b3b3b]" />
                  <button type="button" disabled={!colReady} onClick={clearBlanks} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f] disabled:text-[#5c5c5c]">
                    <ListFilter className="h-3 w-3" /> Clear blank cells
                  </button>
                </div>
              </>
            )}
          </div>
          <Btn icon={Search} label="Find & Select" caret onClick={onFind} />
        </div>
      </Group>

      <Group label="Add-ins" last>
        <Btn icon={Zap} label="Add-ins" caret disabled title="No add-ins installed" />
      </Group>
    </>
  )

  const insertGroups = (
    <>
      <Group label="Tables">
        <Btn icon={Table2} label="PivotTable" />
        <Btn icon={Table2} label="Table" />
      </Group>
      <Group label="Illustrations">
        <Btn icon={Image} label="Pictures" caret />
        <Btn icon={Shapes} label="Shapes" />
        <Btn icon={Sparkles} label="Icons" />
      </Group>
      <Group label="Charts">
        <div className="flex flex-col gap-0.5">
          <Btn icon={BarChart3} label="Recommended Charts" caret />
          <div className="flex items-center gap-0.5">
            <IconBtn icon={BarChart3} title="Column chart" />
            <IconBtn icon={LineChart} title="Line chart" />
            <IconBtn icon={PieChart} title="Pie chart" />
            <IconBtn icon={AreaChart} title="Area chart" />
            <IconBtn icon={ScatterChart} title="Scatter chart" />
          </div>
        </div>
      </Group>
      <Group label="Links">
        <Btn icon={Link} label="Link" />
      </Group>
      <Group label="Sparklines">
        <Btn icon={TrendingUp} label="Line" />
        <Btn icon={Columns3} label="Column" />
      </Group>
      <Group label="Filters" last>
        <Btn icon={Filter} label="Slicer" />
      </Group>
    </>
  )

  const drawGroups = (
    <>
      <Group label="Tools">
        <Btn icon={PenTool} label="Pen" caret active />
        <Btn icon={PenLine} label="Pencil" caret />
        <Btn icon={Highlighter} label="Highlighter" caret />
      </Group>
      <Group label="Pens">
        <Btn icon={Pencil} label="Drawing Tools" caret />
      </Group>
      <Group label="Convert">
        <Btn icon={RefreshCw} label="Ink to Shape" />
        <Btn icon={StickyNote} label="Ink to Math" />
      </Group>
      <Group label="Replay" last>
        <Btn icon={Play} label="Replay Ink" />
      </Group>
    </>
  )

  const pageLayoutGroups = (
    <>
      <Group label="Themes">
        <Btn icon={LayoutGrid} label="Themes" caret />
        <Btn icon={PaintBucket} label="Colors" caret />
        <Btn icon={Type} label="Fonts" caret />
      </Group>
      <Group label="Page Setup">
        <Btn icon={FileText} label="Margins" caret />
        <Btn icon={FileText} label="Orientation" caret />
        <Btn icon={FileText} label="Size" caret />
      </Group>
      <Group label="Scale to Fit">
        <Btn label="Width: Auto" caret />
        <Btn label="Height: Auto" caret />
        <Btn label="Scale: 100%" />
      </Group>
      <Group label="Sheet Options" last>
        <Btn icon={Grid3X3} label="View Gridlines" active={showGridlines} onClick={onToggleGridlines} />
        <Btn icon={Grid3X3} label="Print Gridlines" />
      </Group>
    </>
  )

  const formulaGroups = (
    <>
      <Group label="Function Library">
        <div className="flex flex-col gap-0.5">
          <Btn icon={Sigma} label="Insert Function" />
          <Btn icon={Sigma} label="AutoSum" caret disabled title="Not wired up yet" />
          <Btn icon={History} label="Recently Used" caret />
        </div>
        <div className="flex flex-col gap-0.5">
          <Btn icon={DollarSign} label="Financial" caret />
          <Btn icon={Baseline} label="Logical" caret />
          <Btn icon={Type} label="Text" caret />
          <Btn icon={Hash} label="Math & Trig" caret />
        </div>
      </Group>
      <Group label="Defined Names">
        <Btn icon={BookOpen} label="Name Manager" />
        <Btn icon={BookOpen} label="Define Name" caret />
      </Group>
      <Group label="Formula Auditing">
        <Btn icon={Eye} label="Trace Precedents" />
        <Btn icon={Eye} label="Trace Dependents" />
        <Btn icon={Lightbulb} label="Error Checking" caret />
      </Group>
      <Group label="Calculation" last>
        <Btn icon={RefreshCw} label="Calculate Now" />
        <Btn icon={RefreshCw} label="Calculation Options" caret />
      </Group>
    </>
  )

  const dataGroups = (
    <>
      <Group label="Get & Transform Data">
        <Btn icon={Database} label="Get Data" caret />
        <Btn icon={RefreshCw} label="Refresh All" caret />
      </Group>
      <Group label="Queries & Connections">
        <Btn icon={Link} label="Queries & Connections" />
        <Btn icon={Table2} label="Properties" />
      </Group>
      <Group label="Sort & Filter">
        <Btn icon={ArrowUpDown} label="Sort" disabled={!colReady} onClick={() => colReady && sortColumn('ASC')} />
        <Btn icon={Filter} label="Filter" />
      </Group>
      <Group label="Data Tools">
        <Btn icon={Columns3} label="Text to Columns" />
        <Btn icon={Zap} label="Flash Fill" />
        <Btn icon={Check} label="Data Validation" caret />
      </Group>
      <Group label="Forecast" last>
        <Btn icon={TrendingUp} label="Forecast Sheet" />
      </Group>
    </>
  )

  const reviewGroups = (
    <>
      <Group label="Proofing">
        <Btn icon={SpellCheck} label="Spelling" />
        <Btn icon={BookOpen} label="Thesaurus" />
      </Group>
      <Group label="Insights">
        <Btn icon={Lightbulb} label="Insights" />
      </Group>
      <Group label="Comments">
        <Btn icon={MessageSquare} label="New Comment" />
        <Btn icon={MessageCircle} label="Show Comments" />
      </Group>
      <Group label="Protect" last>
        <Btn icon={Lock} label="Protect Sheet" />
        <Btn icon={Lock} label="Protect Workbook" />
      </Group>
    </>
  )

  const viewGroups = (
    <>
      <Group label="Workbook Views">
        <Btn icon={LayoutGrid} label="Normal" active />
        <Btn icon={FileText} label="Page Layout" />
        <Btn icon={FileText} label="Page Break Preview" />
      </Group>
      <Group label="Show">
        <Btn icon={Grid3X3} label="Gridlines" active={showGridlines} onClick={onToggleGridlines} />
        <Btn icon={Baseline} label="Formula Bar" active />
        <Btn icon={Rows3} label="Headings" active />
      </Group>
      <Group label="Zoom">
        <Btn icon={ZoomOut} label="Zoom Out" onClick={() => onZoomChange(zoom - 10)} />
        <Btn icon={ZoomIn} label="Zoom In" onClick={() => onZoomChange(zoom + 10)} />
        <Btn label="100%" onClick={() => onZoomChange(100)} />
      </Group>
      <Group label="Window">
        <Btn icon={Frame} label="Freeze Panes" caret />
        <Btn icon={Columns3} label="Split" />
      </Group>
      <Group label="Macros" last>
        <Btn icon={Play} label="Macros" />
      </Group>
    </>
  )

  const automateGroups = (
    <>
      <Group label="Office Scripts">
        <Btn icon={Play} label="Record Actions" />
        <Btn icon={FileText} label="Script Library" caret />
      </Group>
      <Group label="Script Tools">
        <Btn icon={Workflow} label="New Script" />
        <Btn icon={History} label="Script History" />
      </Group>
      <Group label="Power Automate" last>
        <Btn icon={Workflow} label="Create a Flow" caret />
      </Group>
    </>
  )

  const helpGroups = (
    <>
      <Group label="Help">
        <Btn icon={LifeBuoy} label="Help" />
        <Btn icon={BookOpen} label="Training" />
        <Btn icon={History} label="What's New" />
      </Group>
      <Group label="Support" last>
        <Btn icon={MessageCircle} label="Contact Support" />
        <Btn icon={Send} label="Feedback" />
      </Group>
    </>
  )

  const fileGroups = (
    <>
      <Group label="Workbook">
        <Btn icon={FileText} label="Info" />
        <Btn icon={Save} label="Save" />
        <Btn icon={Save} label="Save As" />
      </Group>
      <Group label="Export" last>
        <Btn icon={Send} label="Export" />
      </Group>
    </>
  )

  const tabContent = {
    File: fileGroups,
    Home: homeGroups,
    Insert: insertGroups,
    Draw: drawGroups,
    'Page Layout': pageLayoutGroups,
    Formulas: formulaGroups,
    Data: dataGroups,
    Review: reviewGroups,
    View: viewGroups,
    Automate: automateGroups,
    Help: helpGroups,
  }

  return (
    <>
      {/* Tab strip */}
      <div className="flex h-8 shrink-0 items-center border-b border-[#2d2d2d] bg-[#181818] pr-2">
        <button type="button" onClick={() => onTabChange('File')} className={cn('h-full px-3 text-[12px] text-[#d4d4d4] hover:bg-[#2f2f2f]', activeTab === 'File' && 'bg-[#242424] text-white')}>File</button>
        {RIBBON_TABS.slice(1).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              'relative h-full px-2.5 text-[12px] transition-colors',
              activeTab === tab ? 'text-white' : 'text-[#a6a6a6] hover:bg-[#2f2f2f] hover:text-white',
            )}
          >
            {tab}
            {activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#107c41]" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onComments} className="flex items-center gap-1.5 rounded-sm border border-[#3b3b3b] px-2.5 py-1 text-[11px] text-[#d4d4d4] hover:bg-[#2f2f2f]">
            <MessageSquare className="h-3.5 w-3.5" /> Comments
          </button>
          <button type="button" onClick={onShare} className="flex items-center gap-1.5 rounded-sm bg-[#107c41] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#0e6a37]">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      {/* Ribbon body */}
      {open && (
        <div className="relative flex shrink-0 items-stretch border-b border-[#2d2d2d] bg-[#181818] px-1 py-1" style={{ minHeight: 92 }}>
          {tabContent[activeTab] || homeGroups}
          <button type="button" onClick={onToggleOpen} title="Collapse ribbon" className="absolute bottom-1 right-2 rounded p-1 text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-white">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {!open && (
        <div className="flex h-6 shrink-0 items-center justify-end border-b border-[#2d2d2d] bg-[#181818] px-2">
          <button type="button" onClick={onToggleOpen} title="Expand ribbon" className="rounded p-0.5 text-[#9a9a9a] hover:bg-[#2f2f2f] hover:text-white">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  )}