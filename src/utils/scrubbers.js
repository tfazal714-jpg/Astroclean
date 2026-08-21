// ---------------------------------------------------------------------------
// Scrubbing / enrichment operation registry.
//
// Each operation describes its UI form (fields) and how to materialise it
// against the working table. Ops with a `build` return DuckDB SQL; ops with
// an `apply` receive the connection directly for data-driven work (e.g. type
// inference, AI enrichment). The pipeline is replayed from the raw upload on
// every change; AI ops additionally receive a ctx with the configured
// provider, progress callback, abort signal and a cache key.
// ---------------------------------------------------------------------------

import { chatComplete } from '../services/ai.js'
import { getAiCache, setAiCache, rowHash, promptHash } from '../services/aiCache.js'

const q = (name) => `"${String(name).replace(/"/g, '""')}"`
const esc = (value) => `'${String(value).replace(/'/g, "''")}'`

/** Rebuilds `table` from a SELECT statement via a staging table. */
async function replaceTable(conn, table, selectSql) {
  const stage = `${table}__stage`
  await conn.query(`DROP TABLE IF EXISTS ${q(stage)}`)
  await conn.query(`CREATE TABLE ${q(stage)} AS ${selectSql}`)
  await conn.query(`DROP TABLE ${q(table)}`)
  await conn.query(`ALTER TABLE ${q(stage)} RENAME TO ${q(table)}`)
}

/** Expands the user's column selection (null means every column; [] means none). */
function resolveColumns(selected, schema) {
  const names = schema.map((c) => c.name)
  if (selected == null) return names
  return selected.filter((name) => names.includes(name))
}

/** Filters a schema to text-like columns only (VARCHAR-ish types). */
const TEXT_TYPES = new Set(['VARCHAR', 'TEXT', 'STRING', 'CHAR', 'BPCHAR', 'UUID'])
function textColumns(schema, selected) {
  return resolveColumns(selected, schema).filter((name) => {
    const col = schema.find((c) => c.name === name)
    return !col || TEXT_TYPES.has(col.type.toUpperCase())
  })
}

function emailRegex() {
  return `'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`
}

// ---------------------------------------------------------------------------
// Operation definitions
// ---------------------------------------------------------------------------

export const OPS = [
  // ---- Cleaning ---------------------------------------------------------
  {
    type: 'trim',
    group: 'clean',
    label: 'Trim whitespace',
    description: 'Strip leading and trailing whitespace from cell values.',
    icon: 'scissors',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns', hint: 'Leave empty to apply to all text columns.' },
    ],
    build(table, params, schema) {
      const cols = textColumns(schema, params.columns)
      if (cols.length === 0) return null
      const sets = cols.map((c) => `${q(c)} = TRIM(${q(c)})`).join(', ')
      return { sql: `UPDATE ${q(table)} SET ${sets}` }
    },
  },

  {
    type: 'dropEmptyRows',
    group: 'clean',
    label: 'Remove empty rows',
    description: 'Delete rows where the selected columns are all empty.',
    icon: 'eraser',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns', hint: 'A row is removed only when EVERY selected column is empty. Leave empty to use all columns.' },
    ],
    build(table, params, schema) {
      const cols = resolveColumns(params.columns, schema)
      if (cols.length === 0) return null
      const conds = cols
        .map((c) => `(${q(c)} IS NULL OR TRIM(CAST(${q(c)} AS VARCHAR)) = '')`)
        .join(' AND ')
      return { sql: `DELETE FROM ${q(table)} WHERE ${conds}` }
    },
  },

  {
    type: 'dedupe',
    group: 'clean',
    label: 'Remove duplicates',
    description: 'Keep the first occurrence of each unique row, with optional normalization.',
    icon: 'copy',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Match on columns', hint: 'Rows match when these columns are equal. Leave empty to require a full-row match.' },
      {
        key: 'normMode', kind: 'select', label: 'Normalize before matching',
        options: [
          { value: 'none', label: 'None (exact match)' },
          { value: 'lowercase', label: 'Lowercase all values' },
          { value: 'emailDomain', label: 'Match on email domain only' },
          { value: 'companyName', label: 'Match on normalized company name' },
        ],
      },
    ],
    build(table, params, schema) {
      const cols = resolveColumns(params.columns, schema)
      const norm = params.normMode ?? 'none'
      // Build a normalized CTE so dedup logic stays clean.
      const normCols = cols.map((c) => {
        if (norm === 'lowercase') return `LOWER(TRIM(CAST(${q(c)} AS VARCHAR))) AS ${q(c)}`
        if (norm === 'emailDomain' && (c.toLowerCase().includes('email') || c.toLowerCase().includes('mail'))) {
          return `LOWER(REGEXP_EXTRACT(TRIM(CAST(${q(c)} AS VARCHAR)), '@([^@]+)$', 1)) AS ${q(c)}`
        }
        if (norm === 'companyName') return `LOWER(TRIM(REGEXP_REPLACE(CAST(${q(c)} AS VARCHAR), '(^\\s+|\\s+$|[^a-z0-9 ])', '', 'gi'))) AS ${q(c)}`
        return q(c)
      })
      let select
      if (cols.length === schema.length && norm === 'none') {
        select = `SELECT DISTINCT * FROM ${q(table)}`
      } else {
        const allNormCols = schema.map((c) => {
          if (cols.includes(c.name)) {
            const idx = cols.indexOf(c.name)
            return `${normCols[idx]} AS __norm_${c.name}`
          }
          return `${q(c.name)} AS __norm_${c.name}`
        })
        const partition = cols.map((c) => `__norm_${c}`).join(', ')
        select = `SELECT * EXCLUDE (__dup_rn_9x, ${cols.map((c) => `__norm_${c}`).join(', ')}) FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY ${partition}) AS __dup_rn_9x
          FROM (SELECT ${allNormCols.join(', ')}, * FROM ${q(table)})
        ) WHERE __dup_rn_9x = 1`
      }
      return { sql: select, replace: true }
    },
  },

  {
    type: 'case',
    group: 'clean',
    label: 'Change case',
    description: 'Convert text to lowercase, uppercase, or title case.',
    icon: 'case-sensitive',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns' },
      {
        key: 'mode', kind: 'select', label: 'Mode',
        options: [
          { value: 'lower', label: 'Lowercase' },
          { value: 'upper', label: 'Uppercase' },
          { value: 'title', label: 'Title case' },
        ],
      },
    ],
    build(table, params, schema) {
      const cols = textColumns(schema, params.columns)
      if (cols.length === 0) return null
      const fn = params.mode === 'upper'
        ? (c) => `UPPER(${q(c)})`
        : params.mode === 'title'
          ? (c) => `initcap(LOWER(${q(c)}))`
          : (c) => `LOWER(${q(c)})`
      const sets = cols.map((c) => `${q(c)} = ${fn(c)}`).join(', ')
      return { sql: `UPDATE ${q(table)} SET ${sets}` }
    },
  },

  {
    type: 'normalizeEmail',
    group: 'clean',
    label: 'Normalize email',
    description: 'Trim and lowercase an email column, optionally flagging invalid values.',
    icon: 'mail',
    fields: [
      { key: 'column', kind: 'column', label: 'Email column', required: true },
      { key: 'addFlag', kind: 'checkbox', label: 'Add validity flag column', default: true },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const stmts = [
        `UPDATE ${q(table)} SET ${q(col)} = LOWER(TRIM(CAST(${q(col)} AS VARCHAR))) WHERE ${q(col)} IS NOT NULL`,
      ]
      if (params.addFlag) {
        const flag = `${col}_is_valid`
        if (!schema.some((c) => c.name === flag)) {
          stmts.unshift(`ALTER TABLE ${q(table)} ADD COLUMN ${q(flag)} BOOLEAN`)
        }
        stmts.push(
          `UPDATE ${q(table)} SET ${q(flag)} = CASE
             WHEN ${q(col)} IS NOT NULL AND REGEXP_MATCHES(${q(col)}, ${emailRegex()}) THEN true
             ELSE false END`,
        )
      }
      return { sql: stmts }
    },
  },

  {
    type: 'normalizePhone',
    group: 'clean',
    label: 'Normalize phone',
    description: 'Strip formatting from phone numbers, keeping digits (and a leading +).',
    icon: 'phone',
    fields: [
      { key: 'column', kind: 'column', label: 'Phone column', required: true },
      { key: 'addFlag', kind: 'checkbox', label: 'Add validity flag column', default: true },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const digits = `REGEXP_REPLACE(CAST(${q(col)} AS VARCHAR), '[^0-9]', '', 'g')`
      const stmts = [
        `UPDATE ${q(table)} SET ${q(col)} = CASE
           WHEN CAST(${q(col)} AS VARCHAR) LIKE '+%' THEN '+' || ${digits}
           ELSE ${digits} END
         WHERE ${q(col)} IS NOT NULL`,
      ]
      if (params.addFlag) {
        const flag = `${col}_is_valid`
        if (!schema.some((c) => c.name === flag)) {
          stmts.unshift(`ALTER TABLE ${q(table)} ADD COLUMN ${q(flag)} BOOLEAN`)
        }
        stmts.push(
          `UPDATE ${q(table)} SET ${q(flag)} = CASE
             WHEN ${q(col)} IS NOT NULL
               AND LENGTH(CAST(${q(col)} AS VARCHAR)) BETWEEN 7 AND 15
               AND REGEXP_MATCHES(CAST(${q(col)} AS VARCHAR), '^\\+?[0-9]+$') THEN true
             ELSE false END`,
        )
      }
      return { sql: stmts }
    },
  },

  {
    type: 'e164Phone',
    group: 'clean',
    label: 'Phone to E.164',
    description: 'Standardize phone numbers to international E.164 format (+[country][number]).',
    icon: 'phone',
    fields: [
      { key: 'column', kind: 'column', label: 'Phone column', required: true },
      { key: 'defaultCountry', kind: 'text', label: 'Default country code', placeholder: 'e.g. 1 for US/CA', hint: 'Used when the number has no leading +. Leave empty to skip unknowns.' },
      { key: 'addFlag', kind: 'checkbox', label: 'Add validity flag column', default: true },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const cc = String(params.defaultCountry ?? '').trim()
      // Strip all non-digits, then prepend country code if no leading + was present.
      const stripped = `REGEXP_REPLACE(CAST(${q(col)} AS VARCHAR), '[^0-9]', '', 'g')`
      const stmts = []
      if (params.addFlag) {
        const flag = `${col}_e164_valid`
        if (!schema.some((c) => c.name === flag)) {
          stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(flag)} BOOLEAN`)
        }
      }
      stmts.push(
        `UPDATE ${q(table)} SET ${q(col)} = CASE
           WHEN ${q(col)} IS NULL THEN NULL
           -- Already has a leading +: strip formatting, keep as-is.
           WHEN CAST(${q(col)} AS VARCHAR) LIKE '+%' THEN '+' || ${stripped}
           -- Has a leading 00 (international dialing): strip 00, add +.
           WHEN CAST(${q(col)} AS VARCHAR) LIKE '00%' THEN '+' || SUBSTRING(${stripped}, 3)
           ${cc ? `-- No prefix: prepend default country code.
           ELSE '+' || '${cc}' || ${stripped}` : `ELSE '+' || ${stripped}`}
         END
         WHERE ${q(col)} IS NOT NULL`,
      )
      if (params.addFlag) {
        const flag = `${col}_e164_valid`
        stmts.push(
          `UPDATE ${q(table)} SET ${q(flag)} = CASE
             WHEN ${q(col)} IS NOT NULL
               AND CAST(${q(col)} AS VARCHAR) LIKE '+%'
               AND LENGTH(${stripped}) BETWEEN 7 AND 15
               AND REGEXP_MATCHES(${stripped}, '^[0-9]+$') THEN true
             ELSE false END`,
        )
      }
      return { sql: stmts }
    },
  },

  {
    type: 'classifyEmail',
    group: 'enrich',
    label: 'Classify email type',
    description: 'Flag email addresses as "corporate" (custom domain) or "free" (Gmail, Yahoo, etc.).',
    icon: 'mail',
    fields: [
      { key: 'column', kind: 'column', label: 'Email column', required: true },
      { key: 'targetColumn', kind: 'text', label: 'Output column name', placeholder: 'e.g. email_type', default: 'email_type' },
    ],
    build(table, params, schema) {
      const col = params.column
      const target = String(params.targetColumn ?? '').trim() || 'email_type'
      if (!col) return null
      const stmts = []
      if (!schema.some((c) => c.name === target)) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(target)} VARCHAR`)
      }
      // Known free email providers — matches against the domain part.
      const freeProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
        'icloud.com', 'mail.com', 'protonmail.com', 'proton.me',
        'zoho.com', 'yandex.com', 'gmx.com', 'live.com', 'msn.com',
        'att.net', 'comcast.net', 'verizon.net', 'cox.net', 'sbcglobal.net',
        'rocketmail.com', 'fastmail.com', 'hey.com', 'tutanota.com',
        '163.com', '126.com', 'qq.com', 'foxmail.com',
      ]
      const freeList = freeProviders.map((d) => `'${d}'`).join(', ')
      stmts.push(
        `UPDATE ${q(table)} SET ${q(target)} = CASE
           WHEN ${q(col)} IS NULL OR TRIM(CAST(${q(col)} AS VARCHAR)) = '' THEN NULL
           WHEN LOWER(SUBSTRING(TRIM(CAST(${q(col)} AS VARCHAR)),
             POSITION('@' IN TRIM(CAST(${q(col)} AS VARCHAR))) + 1)) IN (${freeList}) THEN 'free'
           ELSE 'corporate'
         END
         WHERE ${q(col)} IS NOT NULL`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'fillEmpty',
    group: 'clean',
    label: 'Fill empty values',
    description: 'Replace empty cells in the selected columns with a fixed value.',
    icon: 'droplet',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns' },
      { key: 'value', kind: 'text', label: 'Replacement value', required: true, placeholder: 'e.g. unknown' },
    ],
    build(table, params, schema) {
      const cols = resolveColumns(params.columns, schema)
      if (cols.length === 0 || params.value === undefined) return null
      const sets = cols.map((c) => `${q(c)} = ${esc(params.value)}`).join(', ')
      const conds = cols
        .map((c) => `(${q(c)} IS NULL OR TRIM(CAST(${q(c)} AS VARCHAR)) = '')`)
        .join(' OR ')
      return { sql: `UPDATE ${q(table)} SET ${sets} WHERE ${conds}` }
    },
  },

  {
    type: 'dropColumns',
    group: 'clean',
    label: 'Remove columns',
    description: 'Drop the selected columns from the table.',
    icon: 'columns',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns to remove', required: true, hint: 'Select at least one column.' },
    ],
    build(table, params, schema) {
      const cols = resolveColumns(params.columns, schema)
      if (cols.length === 0) return null
      const drops = cols.map((c) => `DROP COLUMN IF EXISTS ${q(c)}`).join(', ')
      return { sql: `ALTER TABLE ${q(table)} ${drops}` }
    },
  },

  {
    type: 'renameColumn',
    group: 'clean',
    label: 'Rename column',
    description: 'Rename a single column.',
    icon: 'pencil-line',
    fields: [
      { key: 'from', kind: 'column', label: 'Current name', required: true },
      { key: 'to', kind: 'text', label: 'New name', required: true, placeholder: 'e.g. company_name' },
    ],
    build(table, params, _schema) {
      if (!params.from || !params.to || params.from === params.to) return null
      return {
        sql: `ALTER TABLE ${q(table)} RENAME COLUMN ${q(params.from)} TO ${q(params.to)}`,
      }
    },
  },

  {
    type: 'regexReplace',
    group: 'clean',
    label: 'Find & replace (regex)',
    description: 'Replace text matching a regular expression across columns.',
    icon: 'replace',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns' },
      { key: 'find', kind: 'text', label: 'Find (regex)', required: true, placeholder: 'e.g. \\s+' },
      { key: 'replacement', kind: 'text', label: 'Replacement', placeholder: 'e.g. -' },
      { key: 'replaceAll', kind: 'checkbox', label: 'Replace all occurrences', default: true },
    ],
    build(table, params, schema) {
      const cols = textColumns(schema, params.columns)
      const find = String(params.find ?? '').trim()
      if (cols.length === 0 || !find) return null
      const replacement = String(params.replacement ?? '')
      const flags = params.replaceAll === false ? '' : `, 'g'`
      const sets = cols
        .map((c) => `${q(c)} = REGEXP_REPLACE(CAST(${q(c)} AS VARCHAR), ${esc(find)}, ${esc(replacement)}${flags})`)
        .join(', ')
      const where = cols
        .map((c) => `(CAST(${q(c)} AS VARCHAR) IS NOT NULL AND REGEXP_MATCHES(CAST(${q(c)} AS VARCHAR), ${esc(find)}))`)
        .join(' OR ')
      return { sql: `UPDATE ${q(table)} SET ${sets} WHERE ${where}` }
    },
  },

  {
    type: 'splitColumn',
    group: 'clean',
    label: 'Split column',
    description: 'Split one column on a delimiter into new columns (part_1, part_2, …).',
    icon: 'spline',
    fields: [
      { key: 'column', kind: 'column', label: 'Column to split', required: true },
      { key: 'delimiter', kind: 'text', label: 'Delimiter', required: true, allowWhitespace: true, placeholder: 'e.g. , or |' },
      { key: 'prefix', kind: 'text', label: 'New column prefix', placeholder: 'e.g. part', hint: 'Columns are named <prefix>_1, <prefix>_2, …' },
    ],
    async apply(conn, table, params, schema) {
      const col = params.column
      const delimiter = String(params.delimiter ?? '')
      const prefix = String(params.prefix ?? '').trim() || 'part'
      if (!col || !delimiter) return
      const list = `string_split(CAST(${q(col)} AS VARCHAR), ${esc(delimiter)})`
      const maxRes = await conn.query(
        `SELECT COALESCE(MAX(LENGTH(${list})), 0) AS n FROM ${q(table)} WHERE ${q(col)} IS NOT NULL`,
      )
      const n = Number(maxRes.toArray()[0].n)
      if (n === 0) return
      for (let i = 1; i <= n; i += 1) {
        const name = `${prefix}_${i}`
        if (!schema.some((c) => c.name === name)) {
          await conn.query(`ALTER TABLE ${q(table)} ADD COLUMN ${q(name)} VARCHAR`)
        }
        await conn.query(
          `UPDATE ${q(table)} SET ${q(name)} = TRIM(list_extract(${list}, ${i})) WHERE ${q(col)} IS NOT NULL`,
        )
      }
    },
  },

  {
    type: 'mergeColumns',
    group: 'clean',
    label: 'Merge columns',
    description: 'Combine several columns into one, skipping empty cells.',
    icon: 'merge',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns to merge' },
      { key: 'separator', kind: 'text', label: 'Separator', allowWhitespace: true, placeholder: 'e.g. space' },
      { key: 'target', kind: 'text', label: 'New column name', required: true, placeholder: 'e.g. full_name' },
    ],
    build(table, params, schema) {
      const cols = resolveColumns(params.columns, schema)
      const sep = params.separator ?? ' '
      const target = String(params.target ?? '').trim()
      if (cols.length === 0 || !target) return null
      const stmts = []
      if (!schema.some((c) => c.name === target)) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(target)} VARCHAR`)
      }
      const parts = cols
        .map((c) => `NULLIF(TRIM(CAST(${q(c)} AS VARCHAR)), '')`)
        .join(', ')
      stmts.push(
        `UPDATE ${q(table)} SET ${q(target)} = array_to_string([${parts}], ${esc(sep)})`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'filterRows',
    group: 'clean',
    label: 'Keep or drop rows',
    description: 'Keep or delete rows matching a value, text or regex.',
    icon: 'filter',
    fields: [
      { key: 'column', kind: 'column', label: 'Column', required: true },
      {
        key: 'mode', kind: 'select', label: 'Match type',
        options: [
          { value: 'contains', label: 'Contains text' },
          { value: 'equals', label: 'Equals exactly' },
          { value: 'regex', label: 'Matches regex' },
        ],
      },
      { key: 'match', kind: 'text', label: 'Value / pattern', required: true, placeholder: 'e.g. gmail.com' },
      {
        key: 'action', kind: 'select', label: 'Action',
        options: [
          { value: 'keep', label: 'Keep matching rows' },
          { value: 'drop', label: 'Drop matching rows' },
        ],
      },
    ],
    build(table, params, _schema) {
      const col = params.column
      const match = String(params.match ?? '')
      if (!col || !match) return null
      const value = `TRIM(CAST(${q(col)} AS VARCHAR))`
      let cond
      if (params.mode === 'equals') cond = `${value} = ${esc(match)}`
      else if (params.mode === 'regex') cond = `REGEXP_MATCHES(${value}, ${esc(match)})`
      else cond = `CONTAINS(${value}, ${esc(match)})`
      const where = params.action === 'drop' ? cond : `NOT (${cond})`
      return { sql: `DELETE FROM ${q(table)} WHERE ${where}` }
    },
  },


  {
    type: 'formatDate',
    group: 'clean',
    label: 'Format dates',
    description: 'Parse date/datetime strings and reformat to a standard layout.',
    icon: 'calendar',
    fields: [
      { key: 'column', kind: 'column', label: 'Date column', required: true },
      { key: 'datetime', kind: 'checkbox', label: 'Column contains time components', default: false },
      { key: 'inputFormat', kind: 'text', label: 'Input format', placeholder: 'e.g. %m/%d/%Y — leave empty to auto-detect', hint: 'Uses strptime patterns. Auto-detect handles ISO 8601.' },
      { key: 'outputFormat', kind: 'select', label: 'Output format', options: [
        { value: '%Y-%m-%d', label: 'YYYY-MM-DD (ISO)' },
        { value: '%m/%d/%Y', label: 'MM/DD/YYYY (US)' },
        { value: '%d/%m/%Y', label: 'DD/MM/YYYY (EU)' },
        { value: '%Y/%m/%d', label: 'YYYY/MM/DD' },
        { value: '%Y-%m-%d %H:%M:%S', label: 'YYYY-MM-DD HH:MM:SS' },
        { value: '%B %d, %Y', label: 'Month DD, YYYY' },
      ]},
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const inputFmt = String(params.inputFormat ?? '').trim()
      const outputFmt = params.outputFormat || '%Y-%m-%d'

      let dateExpr
      if (inputFmt) {
        dateExpr = `TRY_STRPTIME(CAST(${q(col)} AS VARCHAR), '${inputFmt.replace(/'/g, "''")}')`
      } else if (params.datetime === true) {
        dateExpr = `TRY_CAST(${q(col)} AS TIMESTAMP)`
      } else {
        dateExpr = `TRY_CAST(${q(col)} AS DATE)`
      }

      const formatted = `strftime(${dateExpr}, '${outputFmt.replace(/'/g, "''")}')`

      return {
        sql: `UPDATE ${q(table)} SET ${q(col)} = COALESCE(
          CAST(${formatted} AS VARCHAR),
          CAST(${q(col)} AS VARCHAR)
        ) WHERE ${q(col)} IS NOT NULL`,
      }
    },
  },

  {
    type: 'fillFromColumn',
    group: 'clean',
    label: 'Fill from another column',
    description: 'Copy values from a source column to fill empty cells in a target column.',
    icon: 'arrow-right-left',
    fields: [
      { key: 'target', kind: 'column', label: 'Target column (fill empty cells)', required: true },
      { key: 'source', kind: 'column', label: 'Source column (copy from)', required: true },
    ],
    build(table, params, schema) {
      const target = params.target
      const source = params.source
      if (!target || !source) return null
      return {
        sql: `UPDATE ${q(table)} SET ${q(target)} = ${q(source)}
 WHERE (${q(target)} IS NULL OR TRIM(CAST(${q(target)} AS VARCHAR)) = '')
              AND ${q(source)} IS NOT NULL AND TRIM(CAST(${q(source)} AS VARCHAR)) <> ''`,
      }
    },
  },

  {
    type: 'sortRows',
    group: 'clean',
    label: 'Sort rows',
    description: 'Reorder all rows based on a column value.',
    icon: 'arrow-up-down',
    fields: [
      { key: 'column', kind: 'column', label: 'Sort by', required: true },
      {
        key: 'direction', kind: 'select', label: 'Direction',
        options: [
          { value: 'ASC', label: 'Ascending (A-Z, 0-9)' },
          { value: 'DESC', label: 'Descending (Z-A, 9-0)' },
        ],
      },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const dir = params.direction || 'ASC'
      return {
        sql: `SELECT * FROM ${q(table)} ORDER BY ${q(col)} ${dir} NULLS LAST`,
        replace: true,
      }
    },
  },
  // ---- Enrichment -------------------------------------------------------
  {
    type: 'extractDomain',
    group: 'enrich',
    label: 'Extract email domain',
    description: 'Adds a lowercase `domain` column parsed from an email column.',
    icon: 'globe',
    fields: [
      { key: 'column', kind: 'column', label: 'Email column', required: true },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const stmts = []
      if (!schema.some((c) => c.name === 'domain')) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q('domain')} VARCHAR`)
      }
      stmts.push(
        `UPDATE ${q(table)} SET ${q('domain')} =
           LOWER(REGEXP_EXTRACT(TRIM(CAST(${q(col)} AS VARCHAR)), '@([^@]+)$', 1))
         WHERE ${q(col)} IS NOT NULL`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'inferCompany',
    group: 'enrich',
    label: 'Infer company name',
    description: 'Adds a `company` column derived from an email domain (e.g. acme.com → Acme).',
    icon: 'building',
    fields: [
      { key: 'column', kind: 'column', label: 'Domain column', required: true, hint: 'Usually the `domain` column produced by "Extract email domain".' },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const stmts = []
      if (!schema.some((c) => c.name === 'company')) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q('company')} VARCHAR`)
      }
      stmts.push(
        `UPDATE ${q(table)} SET ${q('company')} =
           initcap(REGEXP_REPLACE(
             REGEXP_REPLACE(LOWER(TRIM(CAST(${q(col)} AS VARCHAR))), '^www\\.', ''), '\\..*$', ''))
         WHERE ${q(col)} IS NOT NULL`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'splitName',
    group: 'enrich',
    label: 'Split full name',
    description: 'Adds first_name / last_name columns from a full name column.',
    icon: 'user',
    fields: [
      { key: 'column', kind: 'column', label: 'Full name column', required: true },
    ],
    build(table, params, schema) {
      const col = params.column
      if (!col) return null
      const stmts = []
      if (!schema.some((c) => c.name === 'first_name')) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q('first_name')} VARCHAR`)
      }
      if (!schema.some((c) => c.name === 'last_name')) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q('last_name')} VARCHAR`)
      }
      stmts.push(
        `UPDATE ${q(table)} SET
           ${q('first_name')} = NULLIF(split_part(TRIM(CAST(${q(col)} AS VARCHAR)), ' ', 1), ''),
           ${q('last_name')} = CASE
             WHEN POSITION(' ' IN TRIM(CAST(${q(col)} AS VARCHAR))) > 0
               THEN REGEXP_REPLACE(TRIM(CAST(${q(col)} AS VARCHAR)), '^\\S+\\s+', '')
             ELSE NULL END
         WHERE ${q(col)} IS NOT NULL`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'extractRegex',
    group: 'enrich',
    label: 'Extract regex group',
    description: 'Pull the first capture group of a pattern into a new column.',
    icon: 'regex',
    fields: [
      { key: 'column', kind: 'column', label: 'Column', required: true },
      { key: 'pattern', kind: 'text', label: 'Pattern (one capture group)', required: true, placeholder: 'e.g. (\\d{5})' },
      { key: 'target', kind: 'text', label: 'New column name', required: true, placeholder: 'e.g. zip' },
    ],
    build(table, params, schema) {
      const col = params.column
      const pattern = String(params.pattern ?? '')
      const target = String(params.target ?? '').trim()
      if (!col || !pattern || !target) return null
      const stmts = []
      if (!schema.some((c) => c.name === target)) {
        stmts.push(`ALTER TABLE ${q(table)} ADD COLUMN ${q(target)} VARCHAR`)
      }
      stmts.push(
        `UPDATE ${q(table)} SET ${q(target)} = REGEXP_EXTRACT(CAST(${q(col)} AS VARCHAR), ${esc(pattern)}, 1)
         WHERE ${q(col)} IS NOT NULL`,
      )
      return { sql: stmts }
    },
  },

  {
    type: 'inferTypes',
    group: 'enrich',
    label: 'Infer column types',
    description: 'Converts columns that look numeric or date-like to typed columns (DOUBLE / DATE).',
    icon: 'braces',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Columns', hint: 'Leave empty to scan all columns. Non-numeric values become NULL after conversion.' },
    ],
    async apply(conn, table, params, schema) {
      const targets = resolveColumns(params.columns, schema)
      const casts = []
      for (const col of targets) {
        const detected = await detectColumnType(conn, table, col)
        if (detected === 'DOUBLE') {
          casts.push(`TRY_CAST(${q(col)} AS DOUBLE) AS ${q(col)}`)
        } else if (detected === 'DATE') {
          casts.push(`TRY_CAST(${q(col)} AS DATE) AS ${q(col)}`)
        } else if (detected === 'DATE_US') {
          casts.push(`TRY_STRPTIME(${q(col)}, '%m/%d/%Y') AS ${q(col)}`)
        } else {
          casts.push(q(col))
        }
      }
      if (casts.every((c) => !c.includes('TRY_'))) return // nothing to convert
      await replaceTable(conn, table, `SELECT ${casts.join(', ')} FROM ${q(table)}`)
    },
  },

  // ---- AI enrichment -----------------------------------------------------
  {
    type: 'aiTransform',
    group: 'ai',
    label: 'AI transform',
    description: 'Fill or generate a column using your AI provider — batched, cached, cancellable.',
    icon: 'sparkles',
    fields: [
      { key: 'columns', kind: 'columns', label: 'Input columns', hint: 'Values available to the prompt as {{column}} placeholders. Empty = all columns.' },
      { key: 'prompt', kind: 'textarea', label: 'Prompt rule', required: true, placeholder: 'e.g. Return the industry sector for this company: {{company}}', hint: 'One concise instruction per row. {{column}} inserts that column’s value.' },
      { key: 'targetColumn', kind: 'text', label: 'Output column', required: true, placeholder: 'e.g. industry' },
      { key: 'onlyEmpty', kind: 'checkbox', label: 'Only fill empty cells in the output column', default: true },
      {
        key: 'batch', kind: 'select', label: 'Rows per request',
        options: [
          { value: '5', label: '5' },
          { value: '10', label: '10' },
          { value: '25', label: '25' },
        ],
      },
      {
        key: 'concurrency', kind: 'select', label: 'Parallel requests',
        options: [
          { value: '1', label: '1 (gentle)' },
          { value: '3', label: '3 (balanced)' },
          { value: '6', label: '6 (fast)' },
        ],
      },
      { key: 'providerId', kind: 'provider', label: 'Provider', hint: 'Rows are sent to this provider’s API. Defaults to your active provider.' },
    ],
    async apply(conn, table, params, schema, ctx) {
      const { onProgress, onAiDone, signal, opKey, provider } = ctx ?? {}
      if (!provider?.apiKey?.trim()) {
        throw new Error('No API key configured. Open Settings (gear icon, top right) to add a provider key.')
      }
      const inputCols = resolveColumns(params.columns, schema)
      const target = String(params.targetColumn ?? '').trim()
      const prompt = String(params.prompt ?? '').trim()
      const onlyEmpty = params.onlyEmpty !== false
      const batchSize = Math.max(1, Number(params.batch) || 10)
      const concurrency = Math.min(8, Math.max(1, Number(params.concurrency) || 3))
      if (!target) throw new Error('An output column name is required.')
      if (!prompt) throw new Error('A prompt rule is required.')

      // 1. Ensure the output column exists.
      if (!schema.some((c) => c.name === target)) {
        await conn.query(`ALTER TABLE ${q(table)} ADD COLUMN ${q(target)} VARCHAR`)
      }

      // 2. Read rows once: rowid + inputs + current target value.
      const selects = ['rowid AS __rid', ...inputCols, target]
      const result = await conn.query(
        `SELECT ${selects.map((c) => (c === 'rowid AS __rid' ? c : q(c))).join(', ')} FROM ${q(table)}`,
      )
      const rows = result.toArray()

      // Map content hash -> rowids (identical rows share a hash and update together).
      const ridByHash = new Map()
      for (const r of rows) {
        const h = rowHash(r, target)
        const rid = Number(r.__rid)
        if (!ridByHash.has(h)) ridByHash.set(h, [])
        ridByHash.get(h).push(rid)
      }

      // 3. Which rows need processing?
      const pending = rows.filter((r) => {
        if (!onlyEmpty) return true
        const v = r[target]
        return v === null || v === undefined || String(v).trim() === ''
      })

      // 4. Cache lookup — two layers:
      //    a) opKey cache: instant replay when the pipeline prefix matches exactly.
      //    b) Prompt-level cache: prevents duplicate API calls for the same
      //       prompt+row combination across different pipeline states.
      const opCache = opKey ? (await getAiCache(opKey)) ?? new Map() : new Map()
      const promptCacheKey = promptHash(prompt, inputCols)
      const promptCache = await getAiCache(promptCacheKey).catch(() => null) ?? new Map()

      const toRun = pending.filter((r) => {
        const h = rowHash(r, target)
        return !opCache.has(h) && !promptCache.has(h)
      })

      // Merge both caches for writing results back.
      const cacheMap = new Map([...promptCache, ...opCache])

      const writeEntries = async (entries) => {
        if (entries.length === 0) return
        const stmt = await conn.prepare(`UPDATE ${q(table)} SET ${q(target)} = ? WHERE rowid = ?`)
        try {
          for (const [hash, value] of entries) {
            for (const rid of ridByHash.get(hash) ?? []) {
              await stmt.query(value, rid)
            }
          }
        } finally {
          await stmt.close()
        }
      }

      // 5. Cache hit — instant, free replay.
      if (toRun.length === 0) {
        await writeEntries([...cacheMap.entries()])
        onProgress?.('AI · restored from cache')
        return { cached: true, rows: cacheMap.size }
      }

      // 6. Run the model over the remaining rows in batches.
      const chunks = []
      for (let i = 0; i < toRun.length; i += batchSize) {
        chunks.push(toRun.slice(i, i + batchSize))
      }

      const system =
        'You transform tabular data. For each row produce exactly one output value ' +
        'following the user rule. Respond with ONLY a JSON array of strings, one per ' +
        'row, in the same order. No commentary, no markdown, no code fences.'
      let errors = 0

      const runChunk = async (chunk) => {
        if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
        const payload = chunk.map((r) => {
          const obj = {}
          for (const c of inputCols) obj[c] = r[c] === null || r[c] === undefined ? '' : String(r[c])
          return obj
        })
        const content = await chatComplete(provider, {
          system,
          user: `Rule: ${prompt}\nRows (JSON):\n${JSON.stringify(payload)}`,
          temperature: 0.1,
          maxTokens: 600,
          signal,
        })
        const values = parseJsonArray(content, chunk.length)
        if (!values) {
          errors += chunk.length
          return
        }
        const entries = []
        chunk.forEach((r, i) => {
          const v = values[i]
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            entries.push([rowHash(r, target), String(v)])
          } else {
            errors += 1
          }
        })
        if (entries.length > 0) {
          await writeEntries(entries)
          for (const [h, v] of entries) cacheMap.set(h, v)
          // Persist to both the opKey cache and the prompt-level cache
          // so future pipeline states skip identical prompt+row combinations.
          if (opKey) await setAiCache(opKey, cacheMap)
          await setAiCache(promptCacheKey, cacheMap)
          onAiDone?.(entries.length)
        }
      }

      const done = { n: 0 }
      const worker = async () => {
        while (chunks.length > 0) {
          const chunk = chunks.shift()
          await runChunk(chunk)
          done.n += chunk.length
          onProgress?.(`AI · ${Math.min(done.n, toRun.length)}/${toRun.length} rows…`)
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(concurrency, chunks.length || 1) }, () => worker()),
      )

      onProgress?.(`AI · done (${cacheMap.size} values)`)
      if (errors > 0 && cacheMap.size === 0) {
        throw new Error('The AI provider failed for every row — check the provider and model in Settings.')
      }
      return {
        rows: cacheMap.size,
        errors,
        // Partial success: some rows got values, others failed. The UI
        // can display a warning badge without blocking the pipeline.
        partial: errors > 0 && cacheMap.size > 0,
      }
    },
  },
]

async function detectColumnType(conn, table, col) {
  const c = q(col)
  const result = await conn.query(
    `SELECT
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS nonempty,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL AND TRY_CAST(${c} AS DOUBLE) IS NULL
         AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS non_numeric,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL AND TRY_CAST(${c} AS DATE) IS NULL
         AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS non_iso_date,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL AND TRY_CAST(${c} AS DATE) IS NULL
         AND TRY_STRPTIME(CAST(${c} AS VARCHAR), '%m/%d/%Y') IS NULL
         AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS non_any_date
     FROM ${q(table)}`,
  )
  const r = result.toArray()[0]
  if (Number(r.nonempty) === 0) return null
  if (Number(r.non_numeric) === 0) return 'DOUBLE'
  if (Number(r.non_iso_date) === 0) return 'DATE'
  if (Number(r.non_any_date) === 0) return 'DATE_US'
  return null
}

// ---------------------------------------------------------------------------
// Lookup + summarisation helpers
// ---------------------------------------------------------------------------

export const CLEAN_OPS = OPS.filter((o) => o.group === 'clean')
export const ENRICH_OPS = OPS.filter((o) => o.group === 'enrich')
export const AI_OPS = OPS.filter((o) => o.group === 'ai')

export const OPS_BY_TYPE = Object.fromEntries(OPS.map((o) => [o.type, o]))

const columnLabel = (cols) =>
  !cols || cols.length === 0
    ? 'All columns'
    : cols.length === 1
      ? cols[0]
      : `${cols.length} columns`

/** Human-readable one-line summary of an applied op, for the pipeline list. */
export function summarizeOp(op) {
  const p = op.params ?? {}
  switch (op.type) {
    case 'trim': return columnLabel(p.columns)
    case 'dropEmptyRows': return columnLabel(p.columns)
    case 'dedupe': return columnLabel(p.columns)
    case 'case': return `${columnLabel(p.columns)} · ${p.mode ?? 'lower'}`
    case 'normalizeEmail': return `${p.column ?? '—'}${p.addFlag ? ' · flag' : ''}`
    case 'normalizePhone': return `${p.column ?? '—'}${p.addFlag ? ' · flag' : ''}`
    case 'e164Phone': return `${p.column ?? '—'} → E.164${p.defaultCountry ? ` (cc=${p.defaultCountry})` : ''}`
    case 'classifyEmail': return `${p.column ?? '—'} → ${p.targetColumn || 'email_type'}`
    case 'fillEmpty': return `${columnLabel(p.columns)} → ${p.value ?? ''}`
    case 'dropColumns': return columnLabel(p.columns)
    case 'renameColumn': return `${p.from ?? '—'} → ${p.to ?? '—'}`
    case 'regexReplace': return `${columnLabel(p.columns)} · ${p.find ?? ''}`
    case 'splitColumn': return `${p.column ?? '—'} → ${(p.prefix || 'part')}_1…`
    case 'mergeColumns': return `${columnLabel(p.columns)} → ${p.target ?? '—'}`
    case 'filterRows': return `${p.action === 'drop' ? 'drop' : 'keep'} · ${p.column ?? '—'} (${p.mode ?? ''})`
    case 'formatDate': return `${p.column ?? '—'} → ${p.outputFormat ?? 'ISO'}`
    case 'fillFromColumn': return `${p.source ?? '—'} → ${p.target ?? '—'}`
    case 'sortRows': return `${p.column ?? '—'} ${p.direction ?? 'ASC'}`
    case 'extractDomain': return p.column ?? '—'
    case 'inferCompany': return p.column ?? '—'
    case 'splitName': return p.column ?? '—'
    case 'extractRegex': return `${p.column ?? '—'} → ${p.target ?? '—'}`
    case 'inferTypes': return columnLabel(p.columns)
    case 'aiTransform': return `${p.targetColumn ?? '—'} · ${columnLabel(p.columns)}`
    default: return ''
  }
}

/** Parses a JSON array from a model reply, tolerating code fences. */
function parseJsonArray(content, _expected) {
  let s = String(content ?? '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end <= start) return null
  let arr
  try {
    arr = JSON.parse(s.slice(start, end + 1))
  } catch {
    return null
  }
  if (!Array.isArray(arr)) return null
  return arr.map((v) =>
    v === null || v === undefined
      ? ''
      : typeof v === 'object'
        ? JSON.stringify(v)
        : String(v),
  )
}

/** Initial (empty) params for an op's form, derived from its field schema. */
export function defaultParams(op) {
  const params = {}
  for (const field of op.fields) {
    if (field.kind === 'columns') params[field.key] = null
    else if (field.kind === 'column') params[field.key] = ''
    else if (field.kind === 'select') params[field.key] = field.options[0]?.value ?? ''
    else if (field.kind === 'text' || field.kind === 'textarea' || field.kind === 'provider') params[field.key] = ''
    else if (field.kind === 'checkbox') params[field.key] = field.default ?? false
  }
  return params
}

/** True when the op's params satisfy its required fields. */
export function paramsComplete(op, params) {
  return op.fields.every((field) => {
    const value = params[field.key]
    if (field.kind === 'columns') {
      return !field.required || (Array.isArray(value) && value.length > 0)
    }
    if (field.required) {
      if (field.allowWhitespace) {
        return typeof value === 'string' && value.length > 0
      }
      return typeof value === 'string' && value.trim() !== ''
    }
    return true
  })
}
