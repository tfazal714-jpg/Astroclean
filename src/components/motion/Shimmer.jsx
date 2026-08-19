import { cn } from '../../utils/cn.js'

/**
 * Shimmering placeholder block used by skeletons. Mirrors the muted surface
 * colors in both themes via CSS variables.
 */
export default function Shimmer({ className, ...props }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'animate-shimmer block rounded-sm bg-gradient-to-r from-surface-secondary via-surface-hover to-surface-secondary bg-[length:400px_100%]',
        className,
      )}
      {...props}
    />
  )
}
