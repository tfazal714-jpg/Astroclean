import { useRef, useState } from 'react'
import { Home, FilePlus2, FolderOpen, User, Settings, Search, FileSpreadsheet, ChevronRight, X } from 'lucide-react'
import { cn } from '../utils/cn.js'
import { Spinner } from './ui.jsx'
import SamplePickerModal from './SamplePickerModal.jsx'
import { SAMPLE_GALLERY } from '../utils/sampleData.js'

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'new', icon: FilePlus2, label: 'New' },
  { id: 'open', icon: FolderOpen, label: 'Open' },
]

const NAV_BOTTOM = [
  { id: 'account', icon: User, label: 'Account' },
  { id: 'options', icon: Settings, label: 'Options' },
]

const TEMPLATES = [
  { id: 'blank', label: 'Blank Lead Set', sampleId: 'leads', ops: [] },
  { id: 'email', label: 'Corporate Email Scrub', sampleId: 'employees', ops: [
    { type: 'lowercase', column: 'email' },
    { type: 'trim_whitespace', column: 'email' },
    { type: 'dedupe', column: 'email' },
  ]},
  { id: 'phone', label: 'E.164 Phone Format', sampleId: 'leads', ops: [
    { type: 'normalize_phone', column: 'phone' },
    { type: 'trim_whitespace', column: 'phone' },
    { type: 'dedupe', column: 'phone' },
  ]},
  { id: 'enrich', label: 'Company Enricher', sampleId: 'orders', ops: [
    { type: 'trim_whitespace', column: 'company' },
    { type: 'capitalize', column: 'company' },
    { type: 'dedupe', column: 'company' },
  ]},
]

const RECENT_FILES = [
  { id: 1, name: "Lyly'S Cleaning Services_VERIFIED_SAMPLE.xlsx", path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 25', sampleId: 'leads' },
  { id: 2, name: 'Pre Unverified 2.csv', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'products' },
  { id: 3, name: 'Pre Sample validated.csv', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'orders' },
  { id: 4, name: 'Pre Sample Unverified - pre filtered Sample.csv', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'tickets' },
  { id: 5, name: '1422 Verified Email List.xlsx', path: 'Downloads', date: 'July 23', sampleId: 'invoices' },
  { id: 6, name: 'Pre filtered Sample.csv', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'employees' },
  { id: 7, name: 'Pre Sample.xlsx', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'leads' },
  { id: 8, name: 'Central-Florida-Commercial-Leads-csv.csv', path: "Downloads \u00BB Lyly'S Cleaning Services", date: 'July 23', sampleId: 'leads' },
]

const FILTER_TABS = ['Recent', 'Favorites', 'Shared with Me']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function UploadView({ busy, error, onFile, onSample, activity, onOpenMetrics, onOpenSettings, onToggleTheme, dark }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('Recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeNav, setActiveNav] = useState('home')
  const [profileOpen, setProfileOpen] = useState(false)
  const inputRef = useRef(null)

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('astroclean_profile')
      return saved ? JSON.parse(saved) : { name: '', email: '' }
    } catch { return { name: '', email: '' } }
  })

  const handleFiles = (files) => { const file = files && files[0]; if (file) onFile(file) }

  const handleNavClick = (id) => {
    if (id === 'new') { const entry = SAMPLE_GALLERY.find((s) => s.id === 'leads'); if (entry) onSample(entry) }
    else if (id === 'open') { inputRef.current?.click() }
    else if (id === 'options') { if (onOpenSettings) onOpenSettings() }
    else if (id === 'account') { setProfileOpen(true) }
    else { setActiveNav(id) }
  }

  const handleTemplateClick = (template) => { const entry = SAMPLE_GALLERY.find((s) => s.id === template.sampleId); if (entry) onSample(entry) }
  const handleRecentFileClick = (file) => { const entry = SAMPLE_GALLERY.find((s) => s.id === file.sampleId); if (entry) onSample(entry) }

  const handleSaveProfile = () => {
    try { localStorage.setItem('astroclean_profile', JSON.stringify(userProfile)) } catch {}
    setProfileOpen(false)
  }

  const filteredFiles = RECENT_FILES.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex h-full bg-[#121212]">
      {/* Left Navigation Rail */}
      <nav className="flex w-[72px] flex-col border-r border-[#2d2d2d] bg-[#181818]">
        <div className="flex flex-col items-center gap-1 pt-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] transition-colors',
                activeNav === item.id
                  ? 'border-l-2 border-[#107c41] bg-[#1e1e1e] text-[#107c41]'
                  : 'border-l-2 border-transparent text-[#888888] hover:bg-[#1e1e1e] hover:text-[#cccccc]'
              )}
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1 pb-3">
          {NAV_BOTTOM.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] text-[#888888] transition-colors hover:bg-[#1e1e1e] hover:text-[#cccccc]"
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="mb-6 text-2xl font-semibold text-white">{getGreeting()}</h1>

        {/* New Templates */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-[#cccccc]" />
              <h2 className="text-lg font-semibold text-white">New</h2>
            </div>
            <button type="button" className="flex items-center gap-1 text-sm text-[#107c41] hover:text-[#0e6a37]">
              More templates <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {TEMPLATES.map((template) => (
              <button key={template.id} type="button" className="group flex shrink-0 flex-col items-center" onClick={() => handleTemplateClick(template)}>
                <div className="mb-2 flex h-[100px] w-[140px] items-center justify-center border border-[#2d2d2d] bg-[#1e1e1e] transition-colors group-hover:border-[#107c41]">
                  <FileSpreadsheet className="h-8 w-8 text-[#107c41] opacity-60" />
                </div>
                <span className="text-xs text-[#cccccc]">{template.label}</span>
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
                  activeFilter === tab ? 'border-[#107c41] bg-[#107c41] text-white' : 'border-[#2d2d2d] text-[#cccccc] hover:bg-[#1e1e1e]'
                )}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              placeholder="Search for a file"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] pl-9 pr-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none"
            />
          </div>
        </div>

        {/* Recent Files Table */}
        <div className="border-t border-[#2d2d2d]">
          <div className="flex items-center justify-between border-b border-[#2d2d2d] px-2 py-2">
            <span className="text-xs font-medium text-[#888888]">Name</span>
            <span className="text-xs font-medium text-[#888888]">Date modified</span>
          </div>
          {filteredFiles.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#888888]">No files found</div>
          ) : (
            filteredFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex w-full items-center justify-between border-b border-[#2d2d2d] px-2 py-3 transition-colors hover:bg-[#1e1e1e]"
                onClick={() => handleRecentFileClick(file)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#107c41]">
                    <FileSpreadsheet className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-[#888888]">{file.path}</p>
                  </div>
                </div>
                <span className="text-xs text-[#cccccc]">{file.date}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.parquet,.duckdb,.db,text/csv,text/tab-separated-values" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />

      {pickerOpen && (
        <SamplePickerModal onPick={(entry) => { setPickerOpen(false); onSample(entry) }} onClose={() => setPickerOpen(false)} />
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[400px] border border-[#2d2d2d] bg-[#1e1e1e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Account Profile</h3>
              <button type="button" onClick={() => setProfileOpen(false)} className="text-[#888888] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[#888888]">Display Name</label>
                <input type="text" value={userProfile.name} onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })} className="h-8 w-full border border-[#2d2d2d] bg-[#121212] px-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none" placeholder="Enter your name" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888888]">Email</label>
                <input type="email" value={userProfile.email} onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })} className="h-8 w-full border border-[#2d2d2d] bg-[#121212] px-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none" placeholder="Enter your email" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setProfileOpen(false)} className="px-4 py-1.5 text-sm text-[#888888] hover:text-white">Cancel</button>
                <button type="button" onClick={handleSaveProfile} className="bg-[#107c41] px-4 py-1.5 text-sm text-white hover:bg-[#0e6a37]">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
