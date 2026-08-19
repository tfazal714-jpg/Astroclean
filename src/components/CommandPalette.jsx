import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CornerDownLeft,
  FileDown,
  FilePlus2,
  HelpCircle,
  KeyRound,
  Moon,
  Search,
  Sparkles,
  Sun,
  Undo2,
  X,
} from 'lucide-react'
import { fuzzyMatch } from '../utils/strings.js'
import { cn } from '../utils/cn.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcuts.js'

const ICONS = {
  FilePlus2,
  Sparkles,
  FileDown,
  KeyRound,
  BarChart3,
  Moon,
  Sun,
  HelpCircle,
  Undo2,
}

/**
 * Command palette (Ctrl+K / Ctrl+P): fuzzy-searchable actions. Everything
 * runs through the `actions` prop, so App decides what each command does.
 */
export default function CommandPalette({
  actions,
  open,
  onClose,
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  useFocusTrap(listRef, open)

  useKeyboardShortcut('escape', onClose)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (actions ?? []).filter((a) => fuzzyMatch(q, `${a.title} ${a.subtitle ?? ''} ${a.keywords ?? ''}`))
  }, [actions, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const run = (action) => {
    onClose()
    action.run()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      run(results[activeIndex])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-black/45 px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={listRef}
        className="w-full max-w-lg border border-border bg-surface shadow-md"
        role="dialog"
        aria-label="Command palette"
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            aria-label="Search commands"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="scrollbar-thin max-h-72 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-text-tertiary">
              No commands match “{query}”.
            </p>
          ) : (
            results.map((action, i) => {
              const Icon = ICONS[action.icon] ?? Search
              return (
                <button
                  key={action.id ?? action.title}
                  type="button"
                  onClick={() => run(action)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                    i === activeIndex ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-accent-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-text-primary">
                      {action.title}
                    </span>
                    {action.subtitle && (
                      <span className="block truncate text-[10px] text-text-tertiary">
                        {action.subtitle}
                      </span>
                    )}
                  </span>
                  {i === activeIndex && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 text-[10px] text-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded-sm border border-border-secondary bg-surface-secondary px-1 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded-sm border border-border-secondary bg-surface-secondary px-1 font-mono">↵</kbd>
            select
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded-sm border border-border-secondary bg-surface-secondary px-1 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}
