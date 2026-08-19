import { useEffect, useRef, useState } from 'react'
import { easeOutCubic } from '../utils/anim.js'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js'

/**
 * Animates from 0 (or `start`) to `end` over `duration` ms using
 * requestAnimationFrame with ease-out-cubic. Skips straight to the end when
 * the user prefers reduced motion.
 *
 * @param {number} end Target value.
 * @param {{ duration?: number, start?: number, delay?: number, decimals?: number }} opts
 * @returns {number} The current animated value.
 */
export function useCountUp(end, { duration = 900, start = 0, delay = 0, decimals = 0 } = {}) {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(start)
  const frameRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (reduced) {
      setValue(end)
      return undefined
    }

    const numericEnd = Number(end) || 0
    const from = Number(start) || 0
    startRef.current = null

    const tick = (now) => {
      if (startRef.current === null) startRef.current = now - delay
      const elapsed = Math.max(0, now - startRef.current)
      const progress = Math.min(1, elapsed / duration)
      const current = from + (numericEnd - from) * easeOutCubic(progress)
      setValue(decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    const id = window.setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick)
    }, Math.max(0, delay))

    return () => {
      window.clearTimeout(id)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration, delay, reduced])

  return value
}
