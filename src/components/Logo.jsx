import { useId } from 'react'
import { cn } from '../utils/cn.js'

/**
 * AstroClean brand mark: a teal gradient chip with a four-point sparkle,
 * evoking "clean" (the sparkle) and "data table" (the tile).
 */
export function LogoMark({ className }) {
  const gradId = useId()
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('block h-6 w-6', className)}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="7" fill={`url(#${gradId})`} />
      <path
        d="M16 5.5 L18.9 13.1 L26.5 16 L18.9 18.9 L16 26.5 L13.1 18.9 L5.5 16 L13.1 13.1 Z"
        fill="#ffffff"
      />
    </svg>
  )
}

/**
 * Full brand: mark + wordmark. `compact` hides the tagline (used in the header).
 */
export default function Logo({ className, markClassName, tagline }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="min-w-0 leading-none">
        <span className="block whitespace-nowrap text-[15px] font-semibold tracking-tight text-text-primary">
          Astro<span className="text-accent-700">Clean</span>
        </span>
        {tagline && (
          <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-text-tertiary">
            {tagline}
          </span>
        )}
      </span>
    </span>
  )
}
