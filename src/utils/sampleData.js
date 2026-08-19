// ---------------------------------------------------------------------------
// Deterministic sample dataset generators.
//
// Each generator produces a "dirty" CSV — mixed casing, stray whitespace,
// inconsistent formats, duplicate rows, empty cells, malformed values — so
// the scrubbing pipeline has something realistic to work on. All generators
// are seeded, so demos are stable and reproducible.
// ---------------------------------------------------------------------------

// mulberry32 — small deterministic PRNG.
function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)]
const chance = (rand, p) => rand() < p

/** CSV-escapes a field (defensive — our data has no commas, but stay correct). */
function escape(v) {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(header, rows) {
  const lines = [header.map(escape).join(',')]
  for (const row of rows) lines.push(row.map(escape).join(','))
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Dataset 1 — B2B leads (the original sample)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Sarah', 'Michael', 'Emily', 'James', 'Jessica', 'David', 'Ashley', 'Chris',
  'Amanda', 'Matthew', 'Stephanie', 'Joshua', 'Laura', 'Daniel', 'Rachel',
  'Brandon', 'Nicole', 'Kevin', 'Heather', 'Ryan', 'Megan', 'Jason',
]

const LAST_NAMES = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson',
  'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez',
]

const COMPANIES = [
  'Acme Corp', 'Globex', 'Initech', 'Umbrella Systems', 'Stark Industries',
  'Wayne Enterprises', 'Hooli', 'Pied Piper', 'Vandelay Industries', 'Dunder Mifflin',
]

const TITLES = [
  'CEO', 'CTO', 'VP Sales', 'Head of Marketing', 'Director of Operations',
  'Procurement Lead', 'Founder', 'Account Executive',
]

const EMAIL_DOMAINS = ['acme.com', 'globex.io', 'initech.net', 'umbrella.co', 'hooli.dev']

export function generateLeadsCsv(rowCount = 150, seed = 42) {
  const rand = mulberry32(seed)
  const header = [
    'first_name', 'last_name', 'email', 'phone', 'company',
    'job_title', 'industry', 'created_at', 'notes',
  ]
  const rows = []

  for (let i = 0; i < rowCount; i += 1) {
    const first = pick(rand, FIRST_NAMES)
    const last = pick(rand, LAST_NAMES)
    const company = pick(rand, COMPANIES)
    const domain = pick(rand, EMAIL_DOMAINS)

    let email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`
    if (chance(rand, 0.12)) email = email.toUpperCase()
    if (chance(rand, 0.1)) email = `  ${email}  `
    if (chance(rand, 0.06)) email = email.replace('@', ' at ')
    if (chance(rand, 0.04)) email = ''

    const phoneRoll = rand()
    let phone
    if (phoneRoll < 0.25) {
      phone = `(${200 + Math.floor(rand() * 700)}) ${100 + Math.floor(rand() * 800)}-${1000 + Math.floor(rand() * 8999)}`
    } else if (phoneRoll < 0.45) {
      phone = `+1 ${200 + Math.floor(rand() * 700)} ${100 + Math.floor(rand() * 800)} ${1000 + Math.floor(rand() * 8999)}`
    } else if (phoneRoll < 0.55) {
      phone = `${200 + Math.floor(rand() * 700)}-${100 + Math.floor(rand() * 800)}-${1000 + Math.floor(rand() * 8999)}`
    } else {
      phone = `${200 + Math.floor(rand() * 700)}${100 + Math.floor(rand() * 800)}${1000 + Math.floor(rand() * 8999)}`
    }
    if (chance(rand, 0.05)) phone = 'n/a'
    if (chance(rand, 0.03)) phone = ''

    const created = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const notes = chance(rand, 0.5) ? '' : pick(rand, ['Met at trade show', 'Inbound form', 'Referred by partner', 'Cold outreach', 'Webinar attendee'])

    rows.push([
      first, last, email, phone, company, pick(rand, TITLES),
      pick(rand, ['Software', 'Healthcare', 'Manufacturing', 'Finance', 'Logistics', 'Energy', 'Retail', 'Telecom']),
      created, notes,
    ])
  }

  for (let d = 0; d < 6; d += 1) {
    rows.push([...rows[Math.floor(rand() * rows.length)]])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Dataset 2 — E-commerce products
// ---------------------------------------------------------------------------

const PRODUCT_NAMES = [
  'Wireless Mouse', 'Mechanical Keyboard', 'USB-C Hub', 'Monitor Stand', 'Laptop Sleeve',
  'Desk Mat', 'Webcam Cover', 'Cable Organizer', 'Phone Stand', 'Ergonomic Chair',
  'Standing Desk', 'LED Strip Light', 'Smart Plug', 'Air Purifier', 'Desk Lamp',
]

const CATEGORIES = ['Electronics', 'Office', 'Furniture', 'Accessories', 'Home']
const SUPPLIERS = ['Northwind', 'BlueWave', 'CraftWorks', 'Zenith', 'Harbor Supply']

export function generateProductsCsv(rowCount = 120, seed = 7) {
  const rand = mulberry32(seed)
  const header = ['sku', 'name', 'category', 'price', 'stock', 'supplier', 'listed_date', 'description']
  const rows = []

  for (let i = 0; i < rowCount; i += 1) {
    const name = pick(rand, PRODUCT_NAMES)
    const suffix = chance(rand, 0.5) ? ` v${1 + Math.floor(rand() * 4)}` : ''
    const sku = chance(rand, 0.08)
      ? `SKU-${1000 + Math.floor(rand() * 9000)}`
      : `${pick(rand, ['AC', 'NW', 'BW'])}-${1000 + Math.floor(rand() * 9000)}`
    const price = (rand() * 180 + 9.99).toFixed(2)
    const stock = chance(rand, 0.12) ? '' : String(Math.floor(rand() * 400))
    const supplier = pick(rand, SUPPLIERS)
    const listed = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const description = chance(rand, 0.4) ? '' : `${name.toLowerCase()} — durable, tested, ready to ship`

    rows.push([sku, `${name}${suffix}`, pick(rand, CATEGORIES), price, stock, supplier, listed, description])
  }

  for (let d = 0; d < 4; d += 1) {
    rows.push([...rows[Math.floor(rand() * rows.length)]])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Dataset 3 — Customer orders
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  'Acme Corp', 'Globex', 'Initech', 'Stark Industries', 'Hooli',
  'Pied Piper', 'Dunder Mifflin', 'Vandelay Industries', 'Umbrella', 'Wayne Enterprises',
]

const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled', 'refunded']

export function generateOrdersCsv(rowCount = 100, seed = 21) {
  const rand = mulberry32(seed)
  const header = ['order_id', 'customer', 'product', 'quantity', 'unit_price', 'total', 'status', 'ordered_at', 'notes']
  const rows = []

  for (let i = 0; i < rowCount; i += 1) {
    const quantity = 1 + Math.floor(rand() * 12)
    const unitPrice = (rand() * 200 + 5).toFixed(2)
    const total = (quantity * Number(unitPrice)).toFixed(2)
    const status = pick(rand, STATUSES)
    const ordered = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const orderId = chance(rand, 0.06)
      ? String(100000 + Math.floor(rand() * 900000))
      : `ORD-${1000 + Math.floor(rand() * 9000)}`
    const notes = chance(rand, 0.55) ? '' : pick(rand, ['Priority customer', 'Gift order', 'Bulk discount', 'Rush shipping', 'Recurring'])

    rows.push([
      orderId, pick(rand, CUSTOMERS), pick(rand, PRODUCT_NAMES),
      quantity, unitPrice, total, status, ordered, notes,
    ])
  }

  for (let d = 0; d < 3; d += 1) {
    rows.push([...rows[Math.floor(rand() * rows.length)]])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Dataset 4 — Support tickets
// ---------------------------------------------------------------------------

const TICKET_TOPICS = [
  'Cannot log in', 'Billing question', 'Feature request', 'Bug report',
  'Account locked', 'Refund request', 'Integration help', 'Password reset',
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

export function generateTicketsCsv(rowCount = 90, seed = 33) {
  const rand = mulberry32(seed)
  const header = ['ticket_id', 'customer_email', 'topic', 'priority', 'status', 'opened_at', 'closed_at', 'description']
  const rows = []

  for (let i = 0; i < rowCount; i += 1) {
    const email = chance(rand, 0.1)
      ? `${pick(rand, FIRST_NAMES).toLowerCase()} at ${pick(rand, EMAIL_DOMAINS)}`
      : `${pick(rand, FIRST_NAMES).toLowerCase()}.${pick(rand, LAST_NAMES).toLowerCase()}@${pick(rand, EMAIL_DOMAINS)}`
    const opened = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const closed = chance(rand, 0.25) ? '' : opened
    const description = chance(rand, 0.3) ? '' : `${pick(rand, TICKET_TOPICS).toLowerCase()} — please investigate`

    rows.push([
      `TK-${1000 + Math.floor(rand() * 9000)}`,
      email,
      pick(rand, TICKET_TOPICS),
      pick(rand, PRIORITIES),
      pick(rand, ['open', 'in_progress', 'resolved', 'closed']),
      opened,
      closed,
      description,
    ])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Dataset 5 — Invoices
// ---------------------------------------------------------------------------

const INVOICE_STATUSES = ['paid', 'pending', 'overdue', 'void']

const PAYMENT_METHODS = ['card', 'bank transfer', 'paypal', 'cash']

export function generateInvoicesCsv(rowCount = 80, seed = 55) {
  const rand = mulberry32(seed)
  const header = ['invoice_id', 'customer', 'amount', 'currency', 'status', 'issued_at', 'due_at', 'payment_method']
  const rows = []

  for (let i = 0; i < rowCount; i += 1) {
    const amount = (rand() * 5000 + 15).toFixed(2)
    const currency = pick(rand, ['USD', 'EUR', 'GBP', 'USD', 'USD'])
    const status = pick(rand, INVOICE_STATUSES)
    const issued = `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const due = chance(rand, 0.15) ? '' : issued
    const invoiceId = chance(rand, 0.07)
      ? String(10000 + Math.floor(rand() * 90000))
      : `INV-${1000 + Math.floor(rand() * 9000)}`

    rows.push([
      invoiceId,
      pick(rand, CUSTOMERS),
      amount,
      currency,
      status,
      issued,
      due,
      pick(rand, PAYMENT_METHODS),
    ])
  }

  for (let d = 0; d < 3; d += 1) {
    rows.push([...rows[Math.floor(rand() * rows.length)]])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Dataset 6 — Employees
// ---------------------------------------------------------------------------

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Support']

export function generateEmployeesCsv(rowCount = 110, seed = 77) {
  const rand = mulberry32(seed)
  const header = ['employee_id', 'full_name', 'email', 'department', 'manager', 'salary', 'start_date', 'location']
  const rows = []

  const locations = ['New York', 'London', 'Berlin', 'Tokyo', 'Remote', 'Austin']

  for (let i = 0; i < rowCount; i += 1) {
    const first = pick(rand, FIRST_NAMES)
    const last = pick(rand, LAST_NAMES)
    let email = `${first.toLowerCase()}.${last.toLowerCase()}@acme.io`
    if (chance(rand, 0.08)) email = email.toUpperCase()
    if (chance(rand, 0.06)) email = ` ${email} `
    const salary = chance(rand, 0.08) ? '' : String(45000 + Math.floor(rand() * 120000))
    const start = `20${20 + Math.floor(rand() * 5)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`
    const manager = chance(rand, 0.3) ? '' : pick(rand, LAST_NAMES)

    rows.push([
      `EMP-${1000 + Math.floor(rand() * 9000)}`,
      `${first} ${last}`,
      email,
      pick(rand, DEPARTMENTS),
      manager,
      salary,
      start,
      pick(rand, locations),
    ])
  }

  return toCsv(header, rows)
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export const SAMPLE_GALLERY = [
  {
    id: 'leads',
    name: 'sample-leads.csv',
    title: 'B2B lead list',
    description: '150 leads with messy emails, phones, duplicates and empty cells — perfect for a first pass.',
    rows: 156,
    fileType: 'text/csv',
    generate: generateLeadsCsv,
  },
  {
    id: 'products',
    name: 'sample-products.csv',
    title: 'E-commerce catalog',
    description: '120 products with inconsistent SKUs, prices and stock levels.',
    rows: 124,
    fileType: 'text/csv',
    generate: generateProductsCsv,
  },
  {
    id: 'orders',
    name: 'sample-orders.csv',
    title: 'Customer orders',
    description: '100 orders with mixed order-id formats and totals that need re-checking.',
    rows: 103,
    fileType: 'text/csv',
    generate: generateOrdersCsv,
  },
  {
    id: 'tickets',
    name: 'sample-tickets.csv',
    title: 'Support tickets',
    description: '90 support tickets with malformed emails and missing close dates.',
    rows: 90,
    fileType: 'text/csv',
    generate: generateTicketsCsv,
  },
  {
    id: 'invoices',
    name: 'sample-invoices.csv',
    title: 'Invoices',
    description: '80 invoices with inconsistent IDs, mixed currencies and missing due dates.',
    rows: 83,
    fileType: 'text/csv',
    generate: generateInvoicesCsv,
  },
  {
    id: 'employees',
    name: 'sample-employees.csv',
    title: 'Employee directory',
    description: '110 employees with messy emails, uppercase names and missing salary data.',
    rows: 110,
    fileType: 'text/csv',
    generate: generateEmployeesCsv,
  },
]

/** Builds a File object for a gallery entry. */
export function sampleFileFor(entry) {
  return new File([entry.generate()], entry.name, { type: entry.fileType })
}

/** Backwards-compatible default generator (original sample). */
export function generateSampleCsv(rowCount = 150, seed = 42) {
  return generateLeadsCsv(rowCount, seed)
}
