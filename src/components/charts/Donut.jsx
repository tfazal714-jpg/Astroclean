import { useId } from 'react'

const FALLBACK_COLORS = ['#4338ca', '#818cf8', '#38bdf8', '#f59e0b', '#a78bfa', '#f472b6']

/**
 * Donut chart. `data` is [{ label, value }]; slices are drawn as SVG arcs
 * with a subtle gap. Center content can be passed as `children`.
 */
export default function Donut({
  data,
  size = 120,
  thickness = 14,
  colors = FALLBACK_COLORS,
  centerLabel,
  centerValue,
  className,
}) {
  const gradId = useId()
  const total = data.reduce((acc, d) => acc + Math.max(0, d.value), 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r

  if (total <= 0 || data.length === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={thickness}
        />
      </svg>
    )
  }

  let offset = 0
  const slices = data.map((d, i) => {
    const frac = Math.max(0, d.value) / total
    const dash = frac * c
    const slice = { ...d, dash, offset, color: colors[i % colors.length] }
    offset += dash
    return slice
  })

  return (
    <div className={className}>
      <div className="relative inline-block">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#818cf8" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={thickness}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {slices.map((s) => (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${s.dash - 1.5} ${c - s.dash + 1.5}`}
                strokeDashoffset={-s.offset}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[9px] uppercase tracking-wide text-text-tertiary">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
