import { useId } from 'react'

/**
 * Tiny line sparkline. `data` is an array of numbers; renders a smooth-ish
 * polyline with a soft gradient fill underneath.
 */
export default function Sparkline({ data, width = 120, height = 32, color = 'var(--color-accent-600)', className }) {
  const gradId = useId()

  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pad = 3
  const step = (width - pad * 2) / (data.length - 1)

  const points = data.map((v, i) => {
    const x = pad + i * step
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y]
  })

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `M${points[0][0].toFixed(1)},${height} L${line.replace(/\s+/g, ' L')} L${points[points.length - 1][0].toFixed(1)},${height} Z`

  return (
    <svg width={width} height={height} className={className} aria-hidden="true" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={color} />
    </svg>
  )
}
