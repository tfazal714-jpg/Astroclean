import { useRef, useState } from 'react'
import {
  Home,
  FilePlus2,
  FolderOpen,
  User,
  Settings,
  Search,
  FileSpreadsheet,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  Sparkle,
} from 'lucide-react'
import { cn } from '../utils/cn.js'
import { Spinner } from './ui.jsx'
import SamplePickerModal from './SamplePickerModal.jsx'

const NAV_ITEMS = [
  { icon: Home, label: 'Home', active: true },
  { icon: FilePlus2, label: 'New', active: false },
  { icon: FolderOpen, label: 'Open', active: false },
]

const NAV_BOTTOM = [
  { icon: User, label: 'Account' },
  { icon: Settings, label: 'Options' },
]

const TEMPLATES = [
  { id: 'blank', label: 'Blank Lead Set', color: '#107c41' },
  { id: 'email', label: 'Corporate Email Scrub', color: '#107c41' },
  { id: 'phone', label: 'E.164 Phone Format', color: '#107c41' },
  { id: 'enrich', label: 'Company Enricher', color: '#107c41' },
]

const RECENT_FILES = [
  {
    id: 1,
    name: 'Lyly\'S Cleaning Services_VERIFIED_SAMPLE.xlsx',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 25',
    type: 'xlsx',
  },
  {
    id: 2,
    name: 'Pre Unverified 2.csv',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'csv',
  },
  {
    id: 3,
    name: 'Pre Sample validated.csv',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'csv',
  },
  {
    id: 4,
    name: 'Pre Sample Unverified - pre filtered Sample.csv',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'csv',
  },
  {
    id: 5,
    name: '1422 Verified Email List.xlsx',
    path: 'Downloads',
    date: 'July 23',
    type: 'xlsx',
  },
  {
    id: 6,
    name: 'Pre filtered Sample.csv',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'csv',
  },
  {
    id: 7,
    name: 'Pre Sample.xlsx',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'xlsx',
  },
  {
    id: 8,
    name: 'Central-Florida-Commercial-Leads-csv.csv',
    path: 'Downloads \u00BB Lyly\'S Cleaning Services',
    date: 'July 23',
    type: 'csv',
  },
]

const FILTER_TABS = ['Recent', 'Favorites', 'Shared with Me']

export default function UploadView({
  busy,
  error,
  onFile,
  onSample,
  activity,
  onOpenMetrics,
}) {
  const [dragging, setDragging] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('Recent')
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const file = files && files[0]
    if (file) onFile(file)
  }

  const filteredFiles = RECENT_FILES.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full bg-background">
      {/* Left Navigation Rail */}
      <nav className="flex w-[72px] flex-col border-r border-border bg-[#181818]">
        <div className="flex flex-col items-center gap-1 pt-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                'flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] transition-colors',
                item.active
                  ? 'border-l-2 border-accent-700 bg-[#1e1e1e] text-accent-700'
                  : 'border-l-2 border-transparent text-text-tertiary hover:bg-[#1e1e1e] hover:text-text-secondary'
              )}
              onClick={item.label === 'New' ? () => inputRef.current?.click() : undefined}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-1 pb-3">
          {NAV_BOTTOM.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] text-text-tertiary transition-colors hover:bg-[#1e1e1e] hover:text-text-secondary"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-[#181818] px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">AstroClean</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-700 text-[10px] font-medium text-white">
              S
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Greeting */}
          <h1 className="mb-6 text-2xl font-semibold text-text-primary">Good afternoon</h1>

          {/* New Templates Section */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-text-secondary" />
                <h2 className="text-lg font-semibold text-text-primary">New</h2>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-accent-700 hover:text-accent-600"
              >
                More templates
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="group flex shrink-0 flex-col items-center"
                  onClick={() => inputRef.current?.click()}
                >
                  <div className="mb-2 flex h-[100px] w-[140px] items-center justify-center border border-border bg-surface-secondary transition-colors group-hover:border-accent-700">
                    <FileSpreadsheet className="h-8 w-8 text-accent-700 opacity-60" />
                  </div>
                  <span className="text-xs text-text-secondary">{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs and Search */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                    activeFilter === tab
                      ? 'border-accent-700 bg-accent-700 text-white'
                      : 'border-border text-text-secondary hover:bg-surface-hover'
                  )}
                  onClick={() => setActiveFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search for a file"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Recent Files Table */}
          <div className="border-t border-border">
            {/* Table Header */}
            <div className="flex items-center justify-between border-b border-border px-2 py-2">
              <span className="text-xs font-medium text-text-secondary">Name</span>
              <span className="text-xs font-medium text-text-secondary">Date modified</span>
            </div>

            {/* File Rows */}
            {filteredFiles.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">
                No files found
              </div>
            ) : (
              filteredFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className="flex w-full items-center justify-between border-b border-border px-2 py-3 transition-colors hover:bg-[#1e1e1e]"
                  onClick={() => inputRef.current?.click()}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center bg-accent-700">
                      <FileSpreadsheet className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">{file.name}</p>
                      <p className="text-xs text-text-tertiary">{file.path}</p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">{file.date}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {pickerOpen && (
        <SamplePickerModal
          onPick={(entry) => {
            setPickerOpen(false)
            onSample(entry)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
