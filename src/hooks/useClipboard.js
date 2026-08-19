import { useCallback, useState } from 'react'

/**
 * Copies text to the clipboard with a legacy fallback (execCommand).
 * Returns [copied, copy] where `copied` flips true briefly after a copy.
 */
export function useClipboard(timeout = 1600) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text) => {
      const value = String(text ?? '')
      if (value === '') return false
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value)
        } else {
          const ta = document.createElement('textarea')
          ta.value = value
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), timeout)
        return true
      } catch {
        return false
      }
    },
    [timeout],
  )

  return [copied, copy]
}
