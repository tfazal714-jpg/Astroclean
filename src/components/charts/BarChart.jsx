import { useId } from 'react'
import { useInView } from '../../hooks/useInView.js'

/**
 * Minimal SVG bar chart. `data` is [{ label, value }]. Bars animate to full
 * height when scrolled into view. No dependencies.
 */
export default function BarChart({
  data,
  height = 120,
  color = 'var(--color-accent-600)',
  formatValue = (n) => String(n),
  className,
}) {
  const gradId = useId()
  const { ref, inView } = useInView({ once: true, margin: '0px' })

  const max = Math.max(1, ...data.map((d) => d.value))
  const chartW = 100
  const chartH = 100
  const slot = chartW / Math.max(1, data.length)
  const barW = Math.max(4, slot * 0.55)

  return (
    <div ref={ref} className={className}>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="block w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.9" />
            <stop offset="1" stopColor={color} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * 100)
          const x = i * slot + (slot - barW) / 2
          const y = 100 - h
          return (
            <rect
              key={d.label}
              x={x}
              y={inView ? y : 100}
              width={barW}
              height={inView ? h : 0}
              rx="1.5"
              fill={`url(#${gradId})`}
              style={{
                transition: `y 600ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, height 600ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
              }}
            >
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
          )
        })}
      </svg>
      {/* Labels */}
      <div className="mt-1 flex justify-between gap-1">
        {data.map((d) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 truncate text-center font-mono text-[9px] text-text-tertiary"
            title={`${d.label}: ${formatValue(d.value)}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
