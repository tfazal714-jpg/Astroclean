import * as duckdb from '@duckdb/duckdb-wasm'
import { parseCsv, stringifyRows } from '../utils/csv.js'
import { OPS_BY_TYPE } from '../utils/scrubbers.js'
import { hashString } from './aiCache.js'

// ---------------------------------------------------------------------------
// DuckDB bundle configuration
// Two bundles: MVP (smaller, no SIMD) and EH (larger, with SIMD).
// The browser picks the best one at runtime via selectBundle().
// ---------------------------------------------------------------------------

// NOTE: URLs are passed as strings (not URL objects). duckdb-wasm posts the
// module reference to its worker via postMessage, and URL objects cannot be
// structured-cloned in all browsers — strings always work.
const MANUAL_BUNDLES = {
  mvp: {
    mainModule: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
      import.meta.url,
    ).href,
    mainWorker: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
      import.meta.url,
    ).href,
  },
  eh: {
    mainModule: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
      import.meta.url,
    ).href,
    mainWorker: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
      import.meta.url,
    ).href,
  },
}

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let dbInstance = null
let connInstance = null
let initPromise = null
let initResolved = false
// Bumped by terminateDuckDB() while an init is still in flight (e.g. React
// StrictMode's simulated unmount). An in-flight init captures the generation
// it started with and aborts once it no longer matches, terminating any
// worker it already created.
let initGeneration = 0

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = new duckdb.ConsoleLogger()

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialises DuckDB WASM and returns a singleton { db, conn }.
 *
 * Safe to call multiple times — subsequent calls return the already-resolved
 * singleton.  The first call creates the Web Worker, instantiates the WASM
 * module, and opens a default connection.
 */
export async function initDuckDB() {
  if (initResolved) {
    return { db: dbInstance, conn: connInstance }
  }

  if (initPromise) {
    // Another caller already started initialisation; wait for it.
    return initPromise
  }

  const generation = ++initGeneration
  const run = (async () => {
    try {
      // 1.  Select the best supported bundle (MVP vs EH).
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
      if (generation !== initGeneration) throw new Error('Initialisation aborted')

      // 2.  Spawn a Web Worker for DuckDB.
      const worker = new Worker(bundle.mainWorker)
      dbInstance = new duckdb.AsyncDuckDB(logger, worker)

      // 3.  Instantiate the WASM module.
      await dbInstance.instantiate(bundle.mainModule)
      if (generation !== initGeneration) {
        // A newer init superseded this one (StrictMode remount). Tear down
        // the worker we created so it isn't leaked.
        await dbInstance.terminate().catch(() => {})
        dbInstance = null
        throw new Error('Initialisation aborted')
      }

      // 4.  Open a default connection.
      connInstance = await dbInstance.connect()

      initResolved = true
      return { db: dbInstance, conn: connInstance }
    } catch (err) {
      // Reset only if this is still the active init, so a newer in-flight
      // promise keeps its dedupe behaviour.
      if (initPromise === run) initPromise = null
      throw new Error(
        `DuckDB initialisation failed: ${err.message || err}`,
      )
    }
  })()
  initPromise = run

  return initPromise
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Runs a SQL query and returns all rows as an array of objects. */
export async function query(sql, params = null) {
  const { conn } = await initDuckDB()
  if (params) {
    return conn.query(sql, params)
  }
  return conn.query(sql)
}

/**
 * Runs a SQL statement that doesn't return rows (CREATE, INSERT, etc.).
 *
 * Note: the AsyncDuckDBConnection API has no `execute`; DDL/DML is run
 * through `query`. Parameter binding is done via a prepared statement.
 */
export async function execute(sql, params = null) {
  const { conn } = await initDuckDB()
  if (params) {
    const stmt = await conn.prepare(sql)
    try {
      await stmt.query(...params)
    } finally {
      await stmt.close()
    }
    return
  }
  return conn.query(sql)
}

/**
 * Creates a table from a parsed CSV (array of objects) with automatic
 * column type detection.
 */
export async function createTableFromObjects(tableName, rows) {
  if (!rows || rows.length === 0) {
    throw new Error('No rows to insert')
  }

  const { conn } = await initDuckDB()

  // Infer column names and types from the first row.
  const columns = Object.keys(rows[0])
  const colDefs = columns
    .map((col) => `"${col}" VARCHAR`)
    .join(', ')

  // Drop existing table with the same name, then create.
  await conn.query(`DROP TABLE IF EXISTS "${tableName}"`)
  await conn.query(
    `CREATE TABLE "${tableName}" (${colDefs})`,
  )

  // Batch insert via a prepared statement.
  const stmt = await conn.prepare(
    `INSERT INTO "${tableName}" VALUES (${columns
      .map(() => '?')
      .join(', ')})`,
  )

  const batchSize = 5000
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    for (const row of batch) {
      await stmt.send(...columns.map((c) => row[c]))
    }
    await stmt.flush()
  }

  await stmt.close()
  return { rowCount: rows.length, columns }
}

/**
 * Returns the row count of a table.
 */
export async function getRowCount(tableName) {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM "${tableName}"`,
  )
  return Number(result.toArray()[0].cnt)
}

/**
 * Returns a sample of rows from a table (default 100).
 */
export async function getSampleRows(tableName, limit = 100) {
  const result = await query(
    `SELECT * FROM "${tableName}" LIMIT ${limit}`,
  )
  return result.toArray()
}

// ---------------------------------------------------------------------------
// CSV file loading
// ---------------------------------------------------------------------------

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`

/**
 * Returns the schema of a table: [{ name, type }].
 */
export async function getSchema(tableName) {
  const { conn } = await initDuckDB()
  const result = await conn.query(`DESCRIBE ${quoteIdent(tableName)}`)
  return result.toArray().map((r) => ({
    name: r.column_name,
    type: r.column_type,
  }))
}

/**
 * Loads a CSV File into a new table. Uses DuckDB's native CSV sniffer with
 * progressively simpler attempts, falling back to a JS parser for files
 * DuckDB cannot auto-detect.
 *
 * @param {string} tableName Target table name.
 * @param {File} file Browser File object.
 * @param {{ delimiter?: string, header?: boolean, columnTypes?: Record<string, string> }} opts
 *   delimiter: optional custom delimiter (e.g. ';').
 *   header: whether the first row is a header (default auto-detect).
 *   columnTypes: per-column overrides ('text' | 'number' | 'date').
 * @returns {Promise<{ rowCount: number, columns: Array<{ name: string, type: string }> }>}
 */
export async function loadCsvFile(tableName, file, opts = {}) {
  const { delimiter, header, columnTypes } = opts ?? {}
  const { db, conn } = await initDuckDB()

  const bufName = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}.csv`
  const data = new Uint8Array(await file.arrayBuffer())
  await db.registerFileBuffer(bufName, data)

  // Build read_csv options from the user's import preferences.
  const readOpts = ['auto_detect = true', 'sample_size = -1']
  if (delimiter && delimiter !== 'auto') {
    readOpts.push(`delim = '${String(delimiter).replace(/'/g, "''")}'`)
  }
  if (header === true || header === false) {
    readOpts.push(`header = ${header}`)
  }
  const readOptsSql = readOpts.join(', ')

  let loaded = false
  const attempts = [
    // Preferred: everything as text so raw values survive for scrubbing.
    `SELECT * FROM read_csv('${bufName}', ${readOptsSql}, all_varchar = true)`,
    // Fallback: let DuckDB infer types.
    `SELECT * FROM read_csv('${bufName}', ${readOptsSql})`,
  ]

  try {
    for (const select of attempts) {
      try {
        await conn.query(
          `CREATE TABLE ${quoteIdent(tableName)} AS ${select}`,
        )
        loaded = true
        break
      } catch {
        // Try the next strategy.
      }
    }

    if (!loaded) {
      // Last resort: parse in JS and insert row-by-row.
      const text = await file.text()
      const { rows } = parseCsv(text)
      await createTableFromObjects(tableName, rows)
    }

    // Apply explicit column type overrides by rebuilding the table with casts.
    if (loaded && columnTypes && Object.keys(columnTypes).length > 0) {
      const schema = await getSchema(tableName)
      const casts = schema.map((col) => {
        const override = columnTypes[col.name]
        const target = { text: 'VARCHAR', number: 'DOUBLE', date: 'DATE' }[override]
        if (!target || override === 'text') return quoteIdent(col.name)
        return `TRY_CAST(${quoteIdent(col.name)} AS ${target}) AS ${quoteIdent(col.name)}`
      })
      const stage = `${tableName}__typed`
      await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(stage)}`)
      await conn.query(
        `CREATE TABLE ${quoteIdent(stage)} AS SELECT ${casts.join(', ')} FROM ${quoteIdent(tableName)}`,
      )
      await conn.query(`DROP TABLE ${quoteIdent(tableName)}`)
      await conn.query(`ALTER TABLE ${quoteIdent(stage)} RENAME TO ${quoteIdent(tableName)}`)
    }
  } finally {
    try {
      db.dropFile(bufName)
    } catch {
      // Non-fatal cleanup failure.
    }
  }

  const meta = await getTableMeta(tableName)
  if (meta.rowCount === 0) {
    throw new Error('The file contains no data rows.')
  }
  return meta
}

// ---------------------------------------------------------------------------
// Table metadata + paging
// ---------------------------------------------------------------------------

/**
 * Returns { rowCount, columns: [{ name, type }] } for a table.
 */
export async function getTableMeta(tableName) {
  const schema = await getSchema(tableName)
  const rowCount = await getRowCount(tableName)
  return { rowCount, columns: schema }
}

/**
 * Fetches a page of rows with optional SQL ordering and filtering.
 *
 * @param {string} tableName
 * @param {{ offset?: number, limit?: number, orderBy?: string|null, orderDir?: 'ASC'|'DESC', where?: string|null }} options
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchPage(tableName, options = {}) {
  const { offset = 0, limit = 500, orderBy = null, orderDir = 'ASC', where = null } = options
  const { conn } = await initDuckDB()
  const order =
    orderBy && orderBy.trim()
      ? ` ORDER BY ${quoteIdent(orderBy)} ${orderDir} NULLS LAST`
      : ''
  const whereSql = where && String(where).trim() ? ` WHERE ${where}` : ''
  const result = await conn.query(
    `SELECT * FROM ${quoteIdent(tableName)}${whereSql}${order} LIMIT ${limit} OFFSET ${offset}`,
  )
  return result.toArray()
}

/**
 * Returns the number of rows matching a WHERE clause (used for search).
 */
export async function countRowsWhere(tableName, where = null) {
  const { conn } = await initDuckDB()
  const whereSql = where && String(where).trim() ? ` WHERE ${where}` : ''
  const result = await conn.query(
    `SELECT COUNT(*) AS n FROM ${quoteIdent(tableName)}${whereSql}`,
  )
  return Number(result.toArray()[0].n)
}

// ---------------------------------------------------------------------------
// Column statistics
// ---------------------------------------------------------------------------

/**
 * Computes quality statistics for a single column:
 * counts, empties, distinct values, "looks like" hints, and top values.
 */
export async function getColumnStats(tableName, columnName) {
  const { conn } = await initDuckDB()
  const c = quoteIdent(columnName)
  const t = quoteIdent(tableName)

  const statsResult = await conn.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(${c}) AS non_empty,
       COUNT(DISTINCT ${c}) AS distinct_vals,
       COUNT(*) FILTER (WHERE ${c} IS NULL OR TRIM(CAST(${c} AS VARCHAR)) = '') AS empty_vals,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL
         AND REGEXP_MATCHES(LOWER(CAST(${c} AS VARCHAR)), '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')) AS looks_email,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL
         AND TRY_CAST(${c} AS DOUBLE) IS NOT NULL
         AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS looks_number,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL
         AND TRY_CAST(${c} AS DATE) IS NOT NULL
         AND TRIM(CAST(${c} AS VARCHAR)) <> '') AS looks_date,
       COUNT(*) FILTER (WHERE ${c} IS NOT NULL
         AND REGEXP_MATCHES(REPLACE(REPLACE(CAST(${c} AS VARCHAR), ' ', ''), '-', ''),
           '^\\+?[0-9]{7,15}$')) AS looks_phone
     FROM ${t}`,
  )
  const s = statsResult.toArray()[0]

  const topResult = await conn.query(
    `SELECT CAST(${c} AS VARCHAR) AS value, COUNT(*) AS n
     FROM ${t}
     WHERE ${c} IS NOT NULL AND TRIM(CAST(${c} AS VARCHAR)) <> ''
     GROUP BY 1
     ORDER BY n DESC, value ASC
     LIMIT 4`,
  )

  return {
    total: Number(s.total),
    nonEmpty: Number(s.non_empty),
    empty: Number(s.empty_vals),
    distinct: Number(s.distinct_vals),
    looksEmail: Number(s.looks_email),
    looksNumber: Number(s.looks_number),
    looksDate: Number(s.looks_date),
    looksPhone: Number(s.looks_phone),
    topValues: topResult.toArray().map((r) => ({ value: r.value, count: Number(r.n) })),
  }
}

// ---------------------------------------------------------------------------
// Pipeline rebuild
// ---------------------------------------------------------------------------

/**
 * Replays the operation pipeline against the raw upload, materialising the
 * result into the working table. Each operation is applied sequentially, so
 * the pipeline stays auditable and easy to undo.
 *
 * @param {object} [ctx] { provider, onProgress, signal } — forwarded to ops
 *   that implement `apply` (currently the AI transform), along with an opKey
 *   derived from the pipeline prefix so AI results can be cached.
 */
export async function rebuildPipeline(rawTable, ops, workTable, ctx = {}) {
  const { conn } = await initDuckDB()

  await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(workTable)}`)
  await conn.query(
    `CREATE TABLE ${quoteIdent(workTable)} AS SELECT * FROM ${quoteIdent(rawTable)}`,
  )

  if (!ops || ops.length === 0) return

  // Schema is refreshed after every op so ops that add columns (split, merge,
  // AI transform, …) are visible to the ops that follow them in the pipeline.
  let schema = await getSchema(workTable)

  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i]
    const meta = OPS_BY_TYPE[op.type]
    if (!meta) {
      throw new Error(`Unknown operation: ${op.type}`)
    }
    const params = op.params ?? {}

    if (meta.apply) {
      const opCtx = {
        ...ctx,
        // The opKey identifies the exact table state this op ran against, so
        // cached AI results are only reused when the prefix is identical.
        opKey: hashString(JSON.stringify(ops.slice(0, i)) + '|' + JSON.stringify(op)),
      }
      await meta.apply(conn, workTable, params, schema, opCtx)
    } else {
      const result = meta.build(workTable, params, schema)
      if (result) {
        const statements = Array.isArray(result.sql) ? result.sql : [result.sql]
        if (result.replace) {
          await replaceTable(conn, workTable, statements[0])
        } else {
          for (const statement of statements) {
            await conn.query(statement)
          }
        }
      }
    }

    schema = await getSchema(workTable)
  }
}

/** Rebuilds `table` from a SELECT via a staging table (atomic swap). */
async function replaceTable(conn, table, selectSql) {
  const stage = `${table}__stage`
  await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(stage)}`)
  await conn.query(`CREATE TABLE ${quoteIdent(stage)} AS ${selectSql}`)
  await conn.query(`DROP TABLE ${quoteIdent(table)}`)
  await conn.query(`ALTER TABLE ${quoteIdent(stage)} RENAME TO ${quoteIdent(table)}`)
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Exports a table and returns a downloadable Blob.
 * Prefers DuckDB's native COPY (correct quoting, streaming-friendly); falls
 * back to a JS stringifier for robustness. Supports CSV, TSV and JSON.
 *
 * @param {string} tableName
 * @param {{ format?: 'csv'|'tsv'|'json', delimiter?: string, includeHeader?: boolean, nullValue?: string }} opts
 * @returns {Promise<Blob>}
 */
export async function exportTableToCsv(tableName, opts = {}) {
  const {
    format = 'csv',
    delimiter = ',',
    includeHeader = true,
    nullValue = '',
  } = opts ?? {}
  const { db, conn } = await initDuckDB()

  // JSON export — pull rows into JS and serialise.
  if (format === 'json') {
    const result = await conn.query(`SELECT * FROM ${quoteIdent(tableName)}`)
    const rows = result.toArray()
    let text = JSON.stringify(rows, null, 2)
    if (nullValue !== '') {
      text = JSON.stringify(rows, (_k, v) => (v === null ? nullValue : v), 2)
    }
    return new Blob([text], { type: 'application/json;charset=utf-8' })
  }

  const path = '/export.csv'
  const delim = format === 'tsv' ? '\t' : delimiter || ','
  const headerSql = includeHeader ? 'HEADER' : ''
  const copySql =
    `COPY (SELECT * FROM ${quoteIdent(tableName)}) TO '${path}' ` +
    `(${headerSql}, DELIMITER '${String(delim).replace(/'/g, "''")}')`

  try {
    try {
      db.dropFile(path)
    } catch {
      // No previous file; fine.
    }
    await conn.query(copySql)
    const buffer = await db.copyFileToBuffer(path)
    try {
      db.dropFile(path)
    } catch {
      // Non-fatal cleanup failure.
    }
    return new Blob([buffer], { type: 'text/csv;charset=utf-8' })
  } catch {
    // Fallback: pull everything into JS and stringify.
    const result = await conn.query(`SELECT * FROM ${quoteIdent(tableName)}`)
    const text = stringifyRows(result.toArray(), { delimiter: delim, includeHeader, nullValue })
    return new Blob([text], { type: 'text/csv;charset=utf-8' })
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/** Drops a table (best effort — missing tables are ignored). */
export async function dropTable(tableName) {
  try {
    const { conn } = await initDuckDB()
    await conn.query(`DROP TABLE IF EXISTS ${quoteIdent(tableName)}`)
  } catch {
    // Non-fatal.
  }
}

/**
 * Terminates the DuckDB worker and resets the singleton.
 * Call this on app unmount or when the user clears all data.
 */
export async function terminateDuckDB() {
  // Invalidate any in-flight init so it aborts and cleans up its own worker.
  initGeneration += 1
  if (connInstance) {
    await connInstance.close()
    connInstance = null
  }
  if (dbInstance) {
    await dbInstance.terminate()
    dbInstance = null
  }
  initPromise = null
  initResolved = false
}
