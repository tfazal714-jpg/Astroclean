import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Confetti burst — dependency-free celebration for exports and milestones.
// Renders ~60 absolutely-positioned pieces that fall and fade via CSS.
// ---------------------------------------------------------------------------

const COLORS = [
  '#4338ca', '#818cf8', '#6366f1', '#f59e0b', '#38bdf8', '#f472b6', '#a78bfa',
]

const PIECES = 60

function makePieces(seed) {
  return Array.from({ length: PIECES }, (_, i) => {
    const r = mulberry32(seed * 1000 + i)
    return {
      id: `${seed}-${i}`,
      left: r() * 100,
      size: 5 + r() * 7,
      color: COLORS[Math.floor(r() * COLORS.length)],
      delay: r() * 0.35,
      duration: 1.6 + r() * 1.4,
      drift: (r() - 0.5) * 60,
      rotate: (r() - 0.5) * 720,
      round: r() > 0.7,
    }
  })
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Renders a full-screen confetti burst. `active` toggles visibility; the
 * pieces fall once and the component can be re-triggered by changing `seed`.
 */
export default function Confetti({ active = true, seed }) {
  const pieces = useMemo(() => makePieces(seed ?? Date.now() % 10000), [seed])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '1px',
            ['--confetti-drift' ]: `${p.drift}px`,
            ['--confetti-rotate' ]: `${p.rotate}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
