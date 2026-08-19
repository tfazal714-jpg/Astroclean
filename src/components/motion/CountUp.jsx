import { useInView } from '../../hooks/useInView.js'
import { useCountUp } from '../../hooks/useCountUp.js'
import { cn } from '../../utils/cn.js'

/**
 * Animated number that counts up when scrolled into view.
 *
 * @param {number|string} value Target value.
 * @param {{ format?: (n:number)=>string, duration?: number, delay?: number, decimals?: number, className?: string }} props
 */
export default function CountUp({
  value,
  format,
  duration = 900,
  delay = 0,
  decimals = 0,
  className,
  ...props
}) {
  const { ref, inView } = useInView({ once: true, margin: '0px' })
  const animated = useCountUp(inView ? Number(value) || 0 : 0, { duration, delay, decimals })

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      data-value={value}
      aria-label={format ? format(Number(value) || 0) : String(value ?? '')}
      {...props}
    >
      {format ? format(animated) : decimals > 0 ? animated.toFixed(decimals) : animated.toLocaleString('en-US')}
    </span>
  )
}
