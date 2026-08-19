import { useInView } from '../../hooks/useInView.js'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import { cn } from '../../utils/cn.js'

/**
 * Fades an element in when it scrolls into view. Renders a plain div so it
 * composes anywhere. `delay` (ms) staggers siblings.
 */
export default function FadeIn({
  children,
  className,
  delay = 0,
  duration = 500,
  once = true,
  as: Tag = 'div',
  ...props
}) {
  const { ref, inView } = useInView({ once })
  const reduced = usePrefersReducedMotion()

  return (
    <Tag
      ref={ref}
      className={cn(className)}
      style={{
        opacity: reduced || inView ? 1 : 0,
        transform: reduced || inView ? 'none' : 'translateY(8px)',
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
