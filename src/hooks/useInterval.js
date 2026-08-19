import { useEffect, useRef } from 'react'

/**
 * Runs `callback` every `delay` ms. The callback ref is updated each render
 * so it always sees fresh state. Passing a null delay pauses the interval.
 */
export function useInterval(callback, delay = null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null || delay === undefined) return undefined
    const id = window.setInterval(() => savedCallback.current(), delay)
    return () => window.clearInterval(id)
  }, [delay])
}
