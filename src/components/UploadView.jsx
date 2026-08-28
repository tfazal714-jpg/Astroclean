import { useRef, useState, useMemo } from 'react'
import { Home, FilePlus2, FolderOpen, User, Settings, Search, FileSpreadsheet, ChevronRight, X, ChevronDown, Grid3X3, LayoutGrid } from 'lucide-react'
import { cn } from '../utils/cn.js'

var NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'new', icon: FilePlus2, label: 'New' },
  { id: 'open', icon: FolderOpen, label: 'Open' },
]

var NAV_BOTTOM = [
  { id: 'account', icon: User, label: 'Account' },
  { id: 'options', icon: Settings, label: 'Options' },
]

var CATEGORIES = ['All', 'Business', 'Personal', 'Planners', 'Lists', 'Budgets', 'Charts', 'Calendars']

var TEMPLATES = [
  { id: 'blank', label: 'Blank workbook', cat: 'All', desc: 'Start with an empty spreadsheet', color: '#107c41', accent: '#0e6a37',
    preview: { cols: 3, rows: 6, headerBg: '#107c41', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['A','B','C'] } },
  { id: 'welcome', label: 'Welcome to Excel', cat: 'Personal', desc: 'Tour of Excel features', color: '#107c41', accent: '#2d8c4e',
    preview: { cols: 4, rows: 5, headerBg: '#107c41', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['A','B','C','D'], data: [['','Name','Score','Grade'],['1','Alice','95','A'],['2','Bob','87','B'],['3','Carol','92','A'],['4','Dave','78','C']] } },
  { id: 'formula', label: 'Formula tutorial', cat: 'Personal', desc: 'Learn basic formulas', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['A','B','C','D'], data: [['','Item','Qty','Price'],['1','Widget','10','$5'],['2','Gadget','5','$12'],['3','','','=B2*C2'],['4','Total','','=SUM']] } },
  { id: 'pivot', label: 'PivotTable tutorial', cat: 'Business', desc: 'Create pivot tables', color: '#7b5ea7', accent: '#9b7fd4',
    preview: { cols: 3, rows: 5, headerBg: '#7b5ea7', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['A','B','C'], data: [['','Region','Sales'],['1','North','$12K'],['2','South','$9K'],['3','East','$15K'],['4','West','$11K']] } },
  { id: 'gantt', label: 'Simple Gantt chart', cat: 'Planners', desc: 'Project timeline view', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 5, rows: 4, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Task','W1','W2','W3','W4'], data: [['Design','##','','',''],['Dev','','####','',''],['Test','','','###',''],['Deploy','','','','#']] } },
  { id: 'calendar', label: 'Any year calendar', cat: 'Calendars', desc: 'Customizable yearly calendar', color: '#c43e1c', accent: '#e05530',
    preview: { cols: 7, rows: 5, headerBg: '#c43e1c', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['S','M','T','W','T','F','S'], data: [['','','1','2','3','4','5'],['6','7','8','9','10','11','12'],['13','14','15','16','17','18','19'],['20','21','22','23','24','25','26'],['27','28','29','30','','','']] } },
  { id: 'invoice', label: 'Simple invoice', cat: 'Business', desc: 'Basic invoice template', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Item','Qty','Rate','Total'], data: [['Service A','1','$100','$100'],['Service B','2','$50','$100'],['Service C','1','$75','$75'],['','','Total','$275']] } },
  { id: 'agile-gantt', label: 'Agile Gantt chart', cat: 'Planners', desc: 'Sprint-based project plan', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Sprint','Start','End','Status'], data: [['Sprint 1','Jan 1','Jan 14','Done'],['Sprint 2','Jan 15','Jan 28','Done'],['Sprint 3','Jan 29','Feb 11','Active'],['Sprint 4','Feb 12','Feb 25','Planned']] } },
  { id: 'invoice-calc', label: 'Invoice calculator', cat: 'Business', desc: 'Auto-calculating invoice', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 3, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Description','Hours','Amount'], data: [['Consulting','10','$500'],['Development','20','$2000'],['Testing','5','$500'],['Total','','$3000']] } },
  { id: 'marketing', label: 'Channel marketing budget', cat: 'Budgets', desc: 'Track marketing spend', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 4, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Channel','Budget','Spent','Remaining'], data: [['Social','$5000','$3200','$1800'],['Email','$2000','$1500','$500'],['Ads','$8000','$7200','$800'],['Events','$3000','$1000','$2000']] } },
  { id: 'workplan', label: 'Work plan timeline', cat: 'Planners', desc: 'Team work plan', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Phase','Owner','Start','End'], data: [['Research','Alice','Jan 1','Jan 15'],['Design','Bob','Jan 16','Feb 1'],['Build','Carol','Feb 2','Mar 1'],['Launch','Dave','Mar 2','Mar 15']] } },
  { id: 'service-invoice', label: 'Simple service invoice', cat: 'Business', desc: 'Service-based billing', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 3, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Service','Qty','Total'], data: [['Web Design','1','$2500'],['Hosting','12','$120'],['Domain','1','$15'],['Maintenance','1','$500']] } },
  { id: 'project-plan', label: 'Project planner', cat: 'Planners', desc: 'Full project tracker', color: '#7b5ea7', accent: '#9b7fd4',
    preview: { cols: 4, rows: 5, headerBg: '#7b5ea7', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Task','Status','Priority','Due'], data: [['Planning','Done','High','Jan 5'],['Design','Done','High','Jan 20'],['Coding','Active','High','Feb 15'],['Testing','Pending','Med','Mar 1']] } },
  { id: 'expense', label: 'Expense tracker', cat: 'Budgets', desc: 'Personal expense log', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 4, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Date','Category','Description','Amount'], data: [['Jan 1','Food','Groceries','$85'],['Jan 2','Transport','Gas','$45'],['Jan 3','Utilities','Electric','$120'],['Jan 4','Food','Restaurant','$35']] } },
  { id: 'contact', label: 'Contact list', cat: 'Lists', desc: 'Name, email, phone list', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 3, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Name','Email','Phone'], data: [['John Doe','john@email.com','555-0101'],['Jane Smith','jane@email.com','555-0102'],['Bob Lee','bob@email.com','555-0103'],['Sara Kim','sara@email.com','555-0104']] } },
  { id: 'inventory', label: 'Inventory tracker', cat: 'Lists', desc: 'Stock & quantity management', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Item','SKU','Qty','Reorder'], data: [['Widget A','WA-001','150','Yes'],['Widget B','WB-002','45','Yes'],['Gadget X','GX-003','200','No'],['Gadget Y','GY-004','8','Yes']] } },
  { id: 'attendance', label: 'Attendance sheet', cat: 'Lists', desc: 'Employee attendance log', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 5, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Name','Mon','Tue','Wed','Thu'], data: [['Alice','P','P','A','P'],['Bob','P','A','P','P'],['Carol','A','P','P','P'],['Dave','P','P','P','A']] } },
  { id: 'budget', label: 'Monthly budget', cat: 'Budgets', desc: 'Track income vs expenses', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 3, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Category','Budget','Actual'], data: [['Rent','$1500','$1500'],['Food','$400','$450'],['Transport','$200','$180'],['Savings','$500','$500']] } },
  { id: 'timeline', label: 'Project timeline', cat: 'Charts', desc: 'Visual project timeline', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 3, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Milestone','Date','Status'], data: [['Kickoff','Jan 1','Done'],['Alpha','Feb 1','Done'],['Beta','Mar 1','Active'],['Launch','Apr 1','Planned']] } },
  { id: 'sales', label: 'Sales tracker', cat: 'Business', desc: 'Track sales pipeline', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Deal','Value','Stage','Close'], data: [['Alpha','$50K','Won','Jan'],['Beta','$30K','Active','Feb'],['Gamma','$80K','Proposal','Mar'],['Delta','$20K','Lead','Apr']] } },
  { id: 'payroll', label: 'Payroll sheet', cat: 'Business', desc: 'Employee payroll data', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Employee','Hours','Rate','Pay'], data: [['Alice','40','$25','$1000'],['Bob','38','$22','$836'],['Carol','42','$28','$1176'],['Dave','40','$20','$800']] } },
  { id: 'task-list', label: 'Task list', cat: 'Personal', desc: 'Simple to-do tracker', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 3, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Task','Priority','Done'], data: [['Buy groceries','High','Yes'],['Call dentist','High','No'],['File taxes','Med','No'],['Plan trip','Low','No']] } },
  { id: 'habit', label: 'Habit tracker', cat: 'Personal', desc: 'Daily habit log', color: '#2d8c4e', accent: '#4a9d6e',
    preview: { cols: 5, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Habit','Mon','Tue','Wed','Thu'], data: [['Exercise','Y','Y','N','Y'],['Reading','Y','N','Y','Y'],['Meditate','N','Y','Y','Y'],['Water','Y','Y','Y','N']] } },
  { id: 'goals', label: 'Goals tracker', cat: 'Personal', desc: 'Track personal goals', color: '#7b5ea7', accent: '#9b7fd4',
    preview: { cols: 4, rows: 5, headerBg: '#7b5ea7', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Goal','Target','Current','%'], data: [['Run 100mi','100','45','45%'],['Read 20 books','20','12','60%'],['Save $5K','$5000','$3200','64%'],['Learn JS','100h','60h','60%']] } },
  { id: 'grades', label: 'Grade book', cat: 'Lists', desc: 'Student grade tracker', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Student','Quiz','Mid','Final'], data: [['Alice','95','88','92'],['Bob','82','79','85'],['Carol','91','94','90'],['Dave','76','72','78']] } },
  { id: 'meal-plan', label: 'Meal planner', cat: 'Personal', desc: 'Weekly meal planning', color: '#c43e1c', accent: '#e05530',
    preview: { cols: 4, rows: 5, headerBg: '#c43e1c', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Day','Breakfast','Lunch','Dinner'], data: [['Mon','Oats','Salad','Pasta'],['Tue','Eggs','Wrap','Stir fry'],['Wed','Smoothie','Soup','Curry'],['Thu','Toast','Sandwich','Pizza']] } },
  { id: 'subscription', label: 'Subscription tracker', cat: 'Lists', desc: 'Recurring payments log', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 3, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Service','Cost','Renewal'], data: [['Netflix','$15','Jan 15'],['Spotify','$10','Jan 20'],['Gym','$30','Feb 1'],['Storage','$8','Mar 1']] } },
  { id: 'weekly-schedule', label: 'Weekly schedule', cat: 'Planners', desc: 'Time-blocked weekly plan', color: '#7b5ea7', accent: '#9b7fd4',
    preview: { cols: 5, rows: 5, headerBg: '#7b5ea7', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Time','Mon','Tue','Wed','Thu'], data: [['9AM','Meet','Code','Meet','Code'],['12PM','Lunch','Lunch','Lunch','Lunch'],['2PM','Design','Code','Review','Code'],['5PM','Wrap','Wrap','Wrap','Wrap']] } },
  { id: 'donation', label: 'Donation tracker', cat: 'Budgets', desc: 'Charitable giving log', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 3, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Charity','Amount','Date'], data: [['Red Cross','$50','Jan'],['UNICEF','$100','Feb'],['Local Shelter','$25','Mar'],['Doctors','$75','Apr']] } },
  { id: 'crm', label: 'Simple CRM', cat: 'Business', desc: 'Customer relationship tracker', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Contact','Company','Stage','Last Touch'], data: [['John ACME','ACME Corp','Lead','Jan 5'],['Jane Beta','Beta Inc','Active','Jan 12'],['Bob Gamma','Gamma LLC','Won','Jan 20'],['Sara Delta','Delta Co','Proposal','Feb 1']] } },
  { id: 'reading', label: 'Reading list', cat: 'Personal', desc: 'Books to read & finished', color: '#7b5ea7', accent: '#9b7fd4',
    preview: { cols: 3, rows: 5, headerBg: '#7b5ea7', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Title','Author','Status'], data: [['Dune','Herbert','Read'],['1984','Orwell','Reading'],['Sapiens','Harari','To Read'],['Atomic Habits','Clear','Read']] } },
  { id: 'wedding', label: 'Wedding planner', cat: 'Planners', desc: 'Wedding planning checklist', color: '#c43e1c', accent: '#e05530',
    preview: { cols: 3, rows: 5, headerBg: '#c43e1c', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Task','Status','Due'], data: [['Book venue','Done','Jan'],['Send invites','Active','Mar'],['Book caterer','Pending','Apr'],['Dress fitting','Pending','May']] } },
  { id: 'weekly-expenses', label: 'Weekly expenses', cat: 'Budgets', desc: 'Week-by-week spending', color: '#bf8f00', accent: '#d4a017',
    preview: { cols: 3, rows: 5, headerBg: '#bf8f00', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Week','Category','Amount'], data: [['W1','Food','$120'],['W1','Transport','$45'],['W2','Food','$95'],['W2','Transport','$50']] } },
  { id: 'stock-inventory', label: 'Stock inventory', cat: 'Business', desc: 'Warehouse stock levels', color: '#2d8c4e', accent: '#107c41',
    preview: { cols: 4, rows: 5, headerBg: '#2d8c4e', headerText: '#fff', cellBg: '#1a1a1a', gridColor: '#333', headerLabels: ['Product','SKU','In Stock','Reserved'], data: [['Laptop','LP-001','25','8'],['Mouse','MS-002','150','20'],['Keyboard','KB-003','80','15'],['Monitor','MN-004','40','5']] } },
]

function getGreeting() {
  var h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function MiniPreview({ template }) {
  var p = template.preview
  if (!p) return null
  var cellStyle = {
    border: '1px solid ' + p.gridColor,
    padding: '1px 3px',
    fontSize: '7px',
    lineHeight: '10px',
    color: '#ccc',
    background: p.cellBg,
    textAlign: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  }
  var headerStyle = {
    ...cellStyle,
    background: p.headerBg,
    color: p.headerText,
    fontWeight: 600,
    fontSize: '7px',
  }
  var gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(' + p.cols + ', 1fr)',
    width: '100%',
    height: '100%',
    borderCollapse: 'collapse',
  }
  return (
    <div style={gridStyle}>
      {p.headerLabels.map(function(h, i) {
        return <div key={'h' + i} style={headerStyle}>{h}</div>
      })}
      {p.data && p.data.map(function(row, ri) {
        return row.map(function(cell, ci) {
          var isHash = cell.indexOf('##') === 0 || cell.indexOf('#') === 0
          var barWidth = isHash ? (cell.length * 20) + '%' : '0%'
          return (
            <div key={'c' + ri + '-' + ci} style={{...cellStyle, position: 'relative'}}>
              {isHash ? (
                <div style={{ position: 'absolute', left: '1px', top: '1px', bottom: '1px', width: barWidth, background: p.headerBg + '44', borderRadius: '2px' }} />
              ) : cell}
            </div>
          )
        })
      })}
    </div>
  )
}

function TemplateCard({ template, onClick }) {
  return (
    <button
      type="button"
      className="group flex shrink-0 flex-col items-center"
      onClick={function() { onClick(template) }}
    >
      <div className="mb-2 flex h-[110px] w-[150px] items-center justify-center overflow-hidden border border-[#2d2d2d] bg-[#1a1a1a] transition-all group-hover:border-[#107c41] group-hover:shadow-[0_0_0_1px_#107c41]">
        <MiniPreview template={template} />
      </div>
      <span className="max-w-[150px] truncate text-xs text-[#cccccc]">{template.label}</span>
    </button>
  )
}

function MoreTemplatesModal({ onSelect, onClose }) {
  var [search, setSearch] = useState('')
  var [activeCat, setActiveCat] = useState('All')

  var filtered = useMemo(function() {
    return TEMPLATES.filter(function(t) {
      var matchCat = activeCat === 'All' || t.cat === activeCat
      var matchSearch = !search || t.label.toLowerCase().indexOf(search.toLowerCase()) !== -1 || t.desc.toLowerCase().indexOf(search.toLowerCase()) !== -1
      return matchCat && matchSearch
    })
  }, [search, activeCat])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="flex h-[80vh] w-[900px] flex-col border border-[#2d2d2d] bg-[#181818]" onClick={function(e) { e.stopPropagation() }}>
        <div className="flex items-center justify-between border-b border-[#2d2d2d] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">More Templates</h2>
          <button type="button" onClick={onClose} className="text-[#888888] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-4 border-b border-[#2d2d2d] px-6 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              placeholder="Search for online templates"
              value={search}
              onChange={function(e) { setSearch(e.target.value) }}
              className="h-9 w-full rounded-sm border border-[#2d2d2d] bg-[#1a1a1a] pl-9 pr-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 border-b border-[#2d2d2d] px-6 py-2">
          {CATEGORIES.map(function(cat) {
            return (
              <button
                key={cat}
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  activeCat === cat ? 'border-[#107c41] bg-[#107c41] text-white' : 'border-[#2d2d2d] text-[#888888] hover:bg-[#1e1e1e] hover:text-[#ccc]'
                )}
                onClick={function() { setActiveCat(cat) }}
              >
                {cat}
              </button>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#888888]">No templates found</div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {filtered.map(function(t) {
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="group flex flex-col items-center"
                    onClick={function() { onSelect(t) }}
                  >
                    <div className="mb-2 flex h-[100px] w-full items-center justify-center overflow-hidden border border-[#2d2d2d] bg-[#1a1a1a] transition-all group-hover:border-[#107c41]">
                      <MiniPreview template={t} />
                    </div>
                    <span className="w-full truncate text-center text-xs text-[#cccccc]">{t.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UploadView({ busy, error, onFile, onSample, onNewDataset, activity, onOpenMetrics, onOpenSettings, onToggleTheme, dark }) {
  var [activeFilter, setActiveFilter] = useState('Recent')
  var [searchQuery, setSearchQuery] = useState('')
  var [activeNav, setActiveNav] = useState('home')
  var [profileOpen, setProfileOpen] = useState(false)
  var [moreTemplatesOpen, setMoreTemplatesOpen] = useState(false)
  var inputRef = useRef(null)

  var [userProfile, setUserProfile] = useState(function() {
    try {
      var saved = localStorage.getItem('astroclean_profile')
      return saved ? JSON.parse(saved) : { name: '', email: '' }
    } catch(e) { return { name: '', email: '' } }
  })

  var handleFiles = function(files) { var file = files && files[0]; if (file) onFile(file) }

  var handleNavClick = function(id) {
    if (id === 'new') { setActiveNav('new') }
    else if (id === 'open') { inputRef.current?.click() }
    else if (id === 'options') { if (onOpenSettings) onOpenSettings() }
    else if (id === 'account') { setProfileOpen(true) }
    else { setActiveNav(id) }
  }

  var handleBlankWorkbook = function() {
    var csvContent = 'Column A,Column B,Column C\n'
    var blob = new Blob([csvContent], { type: 'text/csv' })
    var file = new File([blob], 'Book1.csv', { type: 'text/csv' })
    onFile(file)
  }

  var handleTemplateClick = function(template) {
    if (template.id === 'blank') {
      handleBlankWorkbook()
    } else {
      onSample({ id: template.id, name: template.label + '.csv', generate: function() {
        var p = template.preview
        if (!p || !p.data) return 'Column A,Column B,Column C\n'
        var header = p.headerLabels.join(',')
        var rows = p.data.map(function(r) { return r.join(',') })
        return header + '\n' + rows.join('\n')
      }, fileType: 'text/csv' })
    }
  }

  var RECENT_FILES = [
    { id: 1, name: "sample-leads-clean (1).csv", path: "Downloads", date: 'Tue at 9:58 PM' },
    { id: 2, name: "Lyly'S Cleaning Services_VERIFIED_SAMPLE.xlsx", path: "Downloads » Lyly'S Cleaning Services", date: 'July 25' },
    { id: 3, name: 'Pre Unverified 2.csv', path: "Downloads » Lyly'S Cleaning Services", date: 'July 23' },
    { id: 4, name: 'Pre Sample validated.csv', path: "Downloads » Lyly'S Cleaning Services", date: 'July 23' },
    { id: 5, name: 'Pre Sample Unverified - pre filtered Sample.csv', path: "Downloads » Lyly'S Cleaning Services", date: 'July 23' },
    { id: 6, name: '1422 Verified Email List.xlsx', path: 'Downloads', date: 'July 23' },
    { id: 7, name: 'Pre filtered Sample.csv', path: "Downloads » Lyly'S Cleaning Services", date: 'July 23' },
    { id: 8, name: 'Pre Sample.xlsx', path: "Downloads » Lyly'S Cleaning Services", date: 'July 23' },
  ]

  var FILTER_TABS = ['Recent', 'Favorites', 'Shared with Me']

  var filteredFiles = RECENT_FILES.filter(function(f) {
    return f.name.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1
  })

  var homeTemplates = TEMPLATES.filter(function(t) { return t.id === 'blank' || t.id === 'welcome' || t.id === 'formula' || t.id === 'pivot' || t.id === 'gantt' || t.id === 'calendar' || t.id === 'invoice' })

  var newTemplates = TEMPLATES.filter(function(t) { return t.id !== 'blank' }).slice(0, 12)

  var isHome = activeNav === 'home'
  var isNew = activeNav === 'new'

  return (
    <div className="flex h-full bg-[#121212]">
      <nav className="flex w-[72px] flex-col border-r border-[#2d2d2d] bg-[#181818]">
        <div className="flex flex-col items-center gap-1 pt-3">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded bg-[#107c41]">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          {NAV_ITEMS.map(function(item) {
            var isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] transition-colors',
                  isActive
                    ? 'border-l-2 border-[#107c41] bg-[#1e1e1e] text-[#107c41]'
                    : 'border-l-2 border-transparent text-[#888888] hover:bg-[#1e1e1e] hover:text-[#cccccc]'
                )}
                onClick={function() { handleNavClick(item.id) }}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1 pb-3">
          {NAV_BOTTOM.map(function(item) {
            return (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-col items-center gap-1 px-2 py-3 text-[10px] text-[#888888] transition-colors hover:bg-[#1e1e1e] hover:text-[#cccccc]"
                onClick={function() { handleNavClick(item.id) }}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isHome && (
          <div>
            <h1 className="mb-6 text-2xl font-semibold text-white">{getGreeting()}</h1>
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 text-[#cccccc]" />
                  <h2 className="text-lg font-semibold text-white">New</h2>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-[#107c41] hover:text-[#0e6a37]"
                  onClick={function() { setMoreTemplatesOpen(true) }}
                >
                  More templates <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {homeTemplates.map(function(t) {
                  return <TemplateCard key={t.id} template={t} onClick={handleTemplateClick} />
                })}
              </div>
            </div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {FILTER_TABS.map(function(tab) {
                  return (
                    <button
                      key={tab}
                      type="button"
                      className={cn(
                        'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                        activeFilter === tab ? 'border-[#107c41] bg-[#107c41] text-white' : 'border-[#2d2d2d] text-[#cccccc] hover:bg-[#1e1e1e]'
                      )}
                      onClick={function() { setActiveFilter(tab) }}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
              <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                <input
                  type="text"
                  placeholder="Search for a file"
                  value={searchQuery}
                  onChange={function(e) { setSearchQuery(e.target.value) }}
                  className="h-8 w-full rounded-sm border border-[#2d2d2d] bg-[#1e1e1e] pl-9 pr-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none"
                />
              </div>
            </div>
            <div className="border-t border-[#2d2d2d]">
              <div className="flex items-center justify-between border-b border-[#2d2d2d] px-2 py-2">
                <span className="text-xs font-medium text-[#888888]">Name</span>
                <span className="text-xs font-medium text-[#888888]">Date modified</span>
              </div>
              {filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#888888]">No files found</div>
              ) : (
                filteredFiles.map(function(file) {
                  var ext = file.name.split('.').pop().toLowerCase()
                  var isXlsx = ext === 'xlsx' || ext === 'xls'
                  return (
                    <button
                      key={file.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-[#2d2d2d] px-2 py-3 transition-colors hover:bg-[#1e1e1e]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-sm', isXlsx ? 'bg-[#107c41]' : 'bg-[#1a5c2e]')}>
                          <span className="text-[10px] font-bold text-white">{isXlsx ? 'X' : 'CSV'}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{file.name}</p>
                          <p className="text-xs text-[#888888]">{file.path}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#cccccc]">{file.date}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {isNew && (
          <div>
            <h1 className="mb-6 text-2xl font-semibold text-white">New</h1>
            <div className="mb-6">
              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  className="group flex flex-col items-center"
                  onClick={handleBlankWorkbook}
                >
                  <div className="mb-2 flex h-[110px] w-[150px] items-center justify-center overflow-hidden border border-[#2d2d2d] bg-[#1a1a1a] transition-all group-hover:border-[#107c41] group-hover:shadow-[0_0_0_1px_#107c41]">
                    <MiniPreview template={TEMPLATES[0]} />
                  </div>
                  <span className="max-w-[150px] truncate text-xs text-[#cccccc]">Blank workbook</span>
                </button>
              </div>
            </div>
            <div className="mb-4 flex items-center gap-4 border-t border-[#2d2d2d] pt-4">
              <Search className="h-4 w-4 text-[#888888]" />
              <input
                type="text"
                placeholder="Search for online templates"
                className="h-9 w-full max-w-[400px] rounded-sm border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none"
              />
            </div>
            <div className="mb-4 flex gap-3 text-xs text-[#107c41]">
              {CATEGORIES.slice(1).map(function(cat) {
                return (
                  <button key={cat} type="button" className="hover:underline">{cat}</button>
                )
              })}
            </div>
            <div className="grid grid-cols-6 gap-4">
              {newTemplates.map(function(t) {
                return <TemplateCard key={t.id} template={t} onClick={handleTemplateClick} />
              })}
            </div>
            <div className="mt-6 border-t border-[#2d2d2d] pt-4">
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-[#107c41] hover:text-[#0e6a37]"
                onClick={function() { setMoreTemplatesOpen(true) }}
              >
                More templates <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {activeNav === 'open' && (
          <div>
            <h1 className="mb-6 text-2xl font-semibold text-white">Open</h1>
            <p className="mb-4 text-sm text-[#888888]">Select a file from your computer</p>
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-[#2d2d2d] bg-[#1e1e1e] px-6 py-3 text-sm text-white hover:border-[#107c41]"
              onClick={function() { inputRef.current?.click() }}
            >
              <FolderOpen className="h-4 w-4" />
              Browse files
            </button>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".csv,.tsv,.xlsx,.xls,.parquet,.duckdb,.db,text/csv,text/tab-separated-values" className="hidden" onChange={function(e) { handleFiles(e.target.files); e.target.value = '' }} />

      {moreTemplatesOpen && (
        <MoreTemplatesModal
          onSelect={function(t) { setMoreTemplatesOpen(false); handleTemplateClick(t) }}
          onClose={function() { setMoreTemplatesOpen(false) }}
        />
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[400px] border border-[#2d2d2d] bg-[#1e1e1e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Account Profile</h3>
              <button type="button" onClick={function() { setProfileOpen(false) }} className="text-[#888888] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[#888888]">Display Name</label>
                <input type="text" value={userProfile.name} onChange={function(e) { setUserProfile({ ...userProfile, name: e.target.value }) }} className="h-8 w-full border border-[#2d2d2d] bg-[#121212] px-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none" placeholder="Enter your name" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888888]">Email</label>
                <input type="email" value={userProfile.email} onChange={function(e) { setUserProfile({ ...userProfile, email: e.target.value }) }} className="h-8 w-full border border-[#2d2d2d] bg-[#121212] px-3 text-sm text-white placeholder:text-[#888888] focus:border-[#107c41] focus:outline-none" placeholder="Enter your email" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={function() { setProfileOpen(false) }} className="px-4 py-1.5 text-sm text-[#888888] hover:text-white">Cancel</button>
                <button type="button" onClick={function() {
                  try { localStorage.setItem('astroclean_profile', JSON.stringify(userProfile)) } catch(e) {}
                  setProfileOpen(false)
                }} className="bg-[#107c41] px-4 py-1.5 text-sm text-white hover:bg-[#0e6a37]">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}