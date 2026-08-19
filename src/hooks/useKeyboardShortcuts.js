import { useEffect, useRef } from 'react'

function normalize(e) {
  const mods = []
  if (e.ctrlKey || e.metaKey) mods.push('ctrl')
  if (e.altKey) mods.push('alt')
  if (e.shiftKey) mods.push('shift')
  const key = e.key.toLowerCase()
  if (key === ' ') return [...mods, 'space'].join('+')
  if (key === 'escape') return [...mods, 'escape'].join('+')
  if (key === 'arrowup') return [...mods, 'up'].join('+')
  if (key === 'arrowdown') return [...mods, 'down'].join('+')
  if (key === 'arrowleft') return [...mods, 'left'].join('+')
  if (key === 'arrowright') return [...mods, 'right'].join('+')
  if (key === 'enter') return [...mods, 'enter'].join('+')
  if (key === 'backspace') return [...mods, 'backspace'].join('+')
  if (key === 'delete') return [...mods, 'delete'].join('+')
  return [...mods, key].join('+')
}

const IGNORE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Registers a shortcut. The shortcut is a string like "ctrl+k", "ctrl+shift+z"
 * or "escape". Handlers are kept in a ref so they can change without
 * re-binding. Shortcuts are ignored while typing in form fields unless
 * `allowInInputs` is set.
 */
export function useKeyboardShortcut(shortcut, handler, { allowInInputs = false } = {}) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!shortcut) return undefined
    const target = shortcut.toLowerCase()

    const onKeyDown = (e) => {
      if (!allowInInputs) {
        const tag = e.target?.tagName
        if (tag && IGNORE_TAGS.has(tag)) return
      }
      if (normalize(e) === target) {
        e.preventDefault()
        handlerRef.current?.(e)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut, allowInInputs])
}

/** Registers a map of shortcuts: { 'ctrl+k': handler, ... }. */
export function useKeyboardShortcuts(shortcuts, opts) {
  for (const [shortcut, handler] of Object.entries(shortcuts ?? {})) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeyboardShortcut(shortcut, handler, opts)
  }
}
