import { useInView } from '../../hooks/useInView.js'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import { cn } from '../../utils/cn.js'

/**
 * Scales content in (0.96 -> 1) with a fade. Use sparingly — buttons,
 * badges, small cards.
 */
export default function ScaleIn({
  children,
  className,
  delay = 0,
  duration = 400,
  scale = 0.96,
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
        transform: reduced || inView ? 'none' : `scale(${scale})`,
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
