import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import { cn } from '../../utils/cn.js'

/**
 * Infinite horizontal marquee. Content is duplicated to create a seamless
 * loop. `speed` is seconds per loop. Respects prefers-reduced-motion.
 */
export default function Marquee({
  children,
  className,
  speed = 24,
  pauseOnHover = true,
  direction = 'left',
}) {
  const reduced = usePrefersReducedMotion()

  if (reduced) {
    return <div className={cn('overflow-hidden', className)}>{children}</div>
  }

  return (
    <div className={cn('group flex overflow-hidden', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center',
          direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
