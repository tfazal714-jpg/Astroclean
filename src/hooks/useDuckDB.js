import { useCallback, useEffect, useState } from 'react'
import { initDuckDB, terminateDuckDB } from '../services/duckdb.js'

/**
 * React hook that provides access to the singleton DuckDB instance.
 *
 * Safe under React StrictMode double-mounting: the singleton in
 * services/duckdb.js dedupes concurrent initialisation calls, and the
 * cleanup only resets state if no in-flight init exists.
 *
 * return {{
 *   dbReady: boolean,
 *   dbError: string | null,
 *   query: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   execute: (sql: string, params?: unknown[]) => Promise<unknown>,
 *   createTableFromObjects: (name: string, rows: object[]) => Promise<object>,
 *   getRowCount: (name: string) => Promise<number>,
 *   getSampleRows: (name: string, limit?: number) => Promise<object[]>,
 * }}
 */
export function useDuckDB() {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await initDuckDB()
        if (!cancelled) setDbReady(true)
      } catch (err) {
        if (!cancelled) {
          setDbError(err.message || 'DuckDB initialisation failed')
        }
      }
    }

    boot()

    return () => {
      cancelled = true
      terminateDuckDB()
    }
  }, [])

  const query = useCallback(
    async (sql, params = null) => {
      const { query: q } = await import('../services/duckdb.js')
      return q(sql, params)
    },
    [],
  )

  const execute = useCallback(
    async (sql, params = null) => {
      const { execute: exec } = await import('../services/duckdb.js')
      return exec(sql, params)
    },
    [],
  )

  const createTableFromObjects = useCallback(
    async (name, rows) => {
      const { createTableFromObjects: create } = await import(
        '../services/duckdb.js'
      )
      return create(name, rows)
    },
    [],
  )

  const getRowCount = useCallback(async (name) => {
    const { getRowCount: count } = await import(
      '../services/duckdb.js'
    )
    return count(name)
  }, [])

  const getSampleRows = useCallback(
    async (name, limit = 100) => {
      const { getSampleRows: sample } = await import(
        '../services/duckdb.js'
      )
      return sample(name, limit)
    },
    [],
  )

  return {
    dbReady,
    dbError,
    query,
    execute,
    createTableFromObjects,
    getRowCount,
    getSampleRows,
  }
}