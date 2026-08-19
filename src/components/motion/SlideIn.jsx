import { useInView } from '../../hooks/useInView.js'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import { cn } from '../../utils/cn.js'

const OFFSETS = {
  up: 'translateY(18px)',
  down: 'translateY(-18px)',
  left: 'translateX(18px)',
  right: 'translateX(-18px)',
}

/**
 * Slides content in from a direction as it scrolls into view.
 * `distance` overrides the default 18px offset.
 */
export default function SlideIn({
  children,
  className,
  direction = 'up',
  distance,
  delay = 0,
  duration = 550,
  once = true,
  as: Tag = 'div',
  ...props
}) {
  const { ref, inView } = useInView({ once })
  const reduced = usePrefersReducedMotion()
  const hidden = reduced || inView ? 'none' : OFFSETS[direction] ?? OFFSETS.up

  return (
    <Tag
      ref={ref}
      className={cn(className)}
      style={{
        opacity: reduced || inView ? 1 : 0,
        transform: reduced || inView ? 'none' : distance ? `translateY(${distance}px)` : hidden,
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
