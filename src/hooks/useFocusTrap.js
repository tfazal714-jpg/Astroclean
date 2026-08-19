import { useEffect } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus inside `ref` so Tab/Shift+Tab cycle within a modal,
 * and returns focus to the previously focused element on unmount.
 */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const el = ref.current
    if (!el) return undefined

    const previouslyFocused = document.activeElement

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return
      const focusables = [...el.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      )
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Move focus into the dialog on open.
    const firstFocusable = el.querySelector(FOCUSABLE)
    if (firstFocusable) firstFocusable.focus()

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [ref, active])
}
