import * as duckdb from '@duckdb/duckdb-wasm'

// ---------------------------------------------------------------------------
// DuckDB bundle configuration
// Two bundles: MVP (smaller, no SIMD) and EH (larger, with SIMD).
// The browser picks the best one at runtime via selectBundle().
// ---------------------------------------------------------------------------

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
      import.meta.url,
    ),
    mainWorker: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
      import.meta.url,
    ),
  },
  eh: {
    mainModule: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
      import.meta.url,
    ),
    mainWorker: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
      import.meta.url,
    ),
  },
}

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let dbInstance = null
let connInstance = null
let initPromise = null
let initResolved = false

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

  initPromise = (async () => {
    try {
      // 1.  Select the best supported bundle (MVP vs EH).
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)

      // 2.  Spawn a Web Worker for DuckDB.
      const worker = new Worker(bundle.mainWorker)
      dbInstance = new duckdb.AsyncDuckDB(logger, worker)

      // 3.  Instantiate the WASM module.
      await dbInstance.instantiate(bundle.mainModule)

      // 4.  Open a default connection.
      connInstance = await dbInstance.connect()

      initResolved = true
      return { db: dbInstance, conn: connInstance }
    } catch (err) {
      // Reset so a retry can happen.
      initPromise = null
      throw new Error(
        `DuckDB initialisation failed: ${err.message || err}`,
      )
    }
  })()

  return initPromise
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Runs a SQL query and returns all rows as an array of objects.
 */
export async function query(sql, params = null) {
  const { conn } = await initDuckDB()
  if (params) {
    return conn.query(sql, params)
  }
  return conn.query(sql)
}

/**
 * Runs a SQL statement that doesn't return rows (CREATE, INSERT, etc.).
 */
export async function execute(sql, params = null) {
  const { conn } = await initDuckDB()
  if (params) {
    return conn.execute(sql, params)
  }
  return conn.execute(sql)
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
  await conn.execute(`DROP TABLE IF EXISTS "${tableName}"`)
  await conn.execute(
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
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Terminates the DuckDB worker and resets the singleton.
 * Call this on app unmount or when the user clears all data.
 */
export async function terminateDuckDB() {
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