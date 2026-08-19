import { cn } from '../utils/cn.js'

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

const BUTTON_VARIANTS = {
  primary:
    'border border-accent-700 bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-900',
  outline:
    'border border-border-secondary bg-surface text-text-primary hover:bg-surface-hover active:bg-surface-hover',
  ghost:
    'border border-transparent bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  danger:
    'border border-error bg-transparent text-error hover:bg-error hover:text-white',
}

const BUTTON_SIZES = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  ...props
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium',
        'transition-colors disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({ className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-transparent',
        'text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Panel / Badge / Spinner
// ---------------------------------------------------------------------------

export function Panel({ title, actions, className, children, bodyClassName }) {
  return (
    <section className={cn('border border-border bg-surface', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {title}
          </h3>
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

const BADGE_TONES = {
  neutral: 'border-border bg-surface-secondary text-text-secondary',
  accent: 'border-accent-200 bg-accent-50 text-accent-800',
  warn: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-error/40 bg-error/10 text-error',
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-px text-[10px] font-medium leading-4',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }) {
  return (
    <span
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-border-secondary border-t-text-tertiary',
        className,
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-text-tertiary">{hint}</span>}
    </label>
  )
}

export function TextInput({ className, ...props }) {
  return (
    <input
      type="text"
      className={cn(
        'h-8 w-full rounded-sm border border-border-secondary bg-surface px-2.5 text-sm text-text-primary',
        'placeholder:text-text-tertiary focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      rows={3}
      className={cn(
        'w-full resize-y rounded-sm border border-border-secondary bg-surface px-2.5 py-2 text-sm leading-5 text-text-primary',
        'placeholder:text-text-tertiary focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-8 w-full appearance-none rounded-sm border border-border-secondary bg-surface px-2.5 pr-8 text-sm text-text-primary',
          'focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-accent-700"
      />
      {label}
    </label>
  )
}
