import { useEffect, useRef } from 'react'

/**
 * Returns the value from the previous render. Useful for diffing in effects.
 */
export function usePrevious(value) {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
