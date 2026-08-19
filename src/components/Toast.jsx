import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { uuid } from '../utils/guid.js'
import { cn } from '../utils/cn.js'

// ---------------------------------------------------------------------------
// Toast system — a lightweight, dependency-free notification provider.
//
// Usage:
//   const toast = useToast()
//   toast.success('Exported', 'download started')
//   toast.error('Something failed')
// ---------------------------------------------------------------------------

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const TONES = {
  success: 'text-success',
  error: 'text-error',
  info: 'text-accent-700',
  warning: 'text-warning',
}

const DEFAULT_DURATION = {
  success: 3800,
  info: 3400,
  warning: 5000,
  error: 7000,
}

export function ToastProvider({ children, position = 'bottom-right' }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (type, title, message, opts = {}) => {
      const id = opts.id ?? uuid()
      const duration = opts.duration ?? DEFAULT_DURATION[type] ?? 4000
      setToasts((prev) => {
        const next = [...prev, { id, type, title, message, action: opts.action }]
        // Cap the queue so we never overflow the viewport.
        return next.slice(-4)
      })
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      success: (title, message, opts) => push('success', title, message, opts),
      error: (title, message, opts) => push('error', title, message, opts),
      info: (title, message, opts) => push('info', title, message, opts),
      warning: (title, message, opts) => push('warning', title, message, opts),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Viewport */}
      <div
        role="region"
        aria-label="Notifications"
        className={cn(
          'pointer-events-none fixed z-[60] flex w-full max-w-sm flex-col gap-2 px-4',
          position === 'top-right' && 'right-0 top-0 pt-4 items-end',
          position === 'top-left' && 'left-0 top-0 pt-4 items-start',
          position === 'bottom-left' && 'left-0 bottom-0 pb-4 items-start',
          position === 'bottom-right' && 'right-0 bottom-0 pb-4 items-end',
        )}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'animate-toast-in pointer-events-auto flex w-full items-start gap-2.5 border border-border bg-surface px-3 py-2.5 shadow-md',
                t.type === 'error' && 'border-error/40',
                t.type === 'success' && 'border-success/30',
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[t.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-primary">{t.title}</p>
                {t.message && (
                  <p className="mt-0.5 break-words text-[11px] leading-4 text-text-secondary">
                    {t.message}
                  </p>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action.onClick?.()
                      dismiss(t.id)
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent-700 hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-sm p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/** Hook to access the toast API inside a ToastProvider. */
export function useToast() { // eslint-disable-line react/only-export-components -- provider + hook together is intentional
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback that no-ops so components can be rendered outside the provider
    // (e.g. in tests) without crashing.
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}
