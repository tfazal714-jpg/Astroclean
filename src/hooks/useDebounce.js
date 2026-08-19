import { useEffect, useState } from 'react'

/**
 * Returns a value that only updates `delay` ms after the input stops
 * changing. Useful for search inputs that trigger expensive queries.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
