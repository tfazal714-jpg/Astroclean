import { useCallback, useState } from 'react'
import { readStorage, writeStorage, removeStorage } from '../utils/storage.js'

/**
 * useState that persists to localStorage. Falls back gracefully when
 * storage is unavailable (private mode, quota).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue))

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        writeStorage(key, resolved)
        return resolved
      })
    },
    [key],
  )

  const remove = useCallback(() => {
    removeStorage(key)
    setValue(initialValue)
  }, [key, initialValue])

  return [value, set, remove]
}
