import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { IconButton } from './ui.jsx'

const GROUPS = [
  {
    title: 'General',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Command palette' },
      { keys: ['Ctrl', '?'], label: 'This shortcut reference' },
      { keys: ['Ctrl', 'E'], label: 'Export dataset' },
      { keys: ['Ctrl', 'N'], label: 'New dataset' },
      { keys: ['Esc'], label: 'Close dialogs & popovers' },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { keys: ['Ctrl', 'Z'], label: 'Undo last operation' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo operation' },
      { keys: ['Ctrl', 'Shift', 'R'], label: 'Reset pipeline' },
    ],
  },
  {
    title: 'Table',
    items: [
      { keys: ['Click'], label: 'Copy cell value' },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { keys: ['Ctrl', 'Shift', 'D'], label: 'Toggle dark mode' },
    ],
  },
]

function Key({ children }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border-secondary bg-surface-secondary px-1 font-mono text-[10px] font-medium text-text-secondary">
      {children}
    </kbd>
  )
}

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md border border-border bg-surface shadow-md">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Keyboard shortcuts</h2>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                {group.title}
              </h3>
              <div className="divide-y divide-border/70 border border-border">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="text-xs text-text-primary">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-text-tertiary">+</span>}
                          <Key>{k}</Key>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end border-t border-border px-4 py-3">
          <p className="mr-auto text-[11px] text-text-tertiary">
            Shortcuts work unless you are typing in a field.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
