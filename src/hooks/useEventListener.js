import { useEffect, useRef } from 'react'

/**
 * Attaches an event listener to an element (default window) with automatic
 * cleanup. The handler is kept in a ref, so it never needs to be memoised.
 *
 * @param {string} eventName
 * @param {(e: Event) => void} handler
 * @param {EventTarget} [element]
 */
export function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!element?.addEventListener) return undefined
    const listener = (event) => savedHandler.current(event)
    element.addEventListener(eventName, listener)
    return () => element.removeEventListener(eventName, listener)
  }, [eventName, element])
}
