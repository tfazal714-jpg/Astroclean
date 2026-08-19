// ---------------------------------------------------------------------------
// Animation helpers — shared easing curves, durations and delay utilities
// for the motion primitives. Everything respects prefers-reduced-motion at
// the CSS layer; these values drive the React-side choreography.
// ---------------------------------------------------------------------------

/** Standard easing curves (cubic-bezier equivalents, keyed for reuse). */
export const EASE = {
  out: [0.16, 1, 0.3, 1], // fast-out, gentle settle
  inOut: [0.65, 0, 0.35, 1],
  in: [0.7, 0, 0.84, 0],
  bounce: [0.34, 1.56, 0.64, 1],
  linear: [0, 0, 1, 1],
}

/** Duration scale (ms) — short for micro-interactions, long for entrances. */
export const DURATION = {
  fast: 150,
  base: 220,
  slow: 350,
  entrance: 500,
  hero: 650,
}

/** Convenience: cubic-bezier() CSS string from EASE entries. */
export function bezier(name = 'out') {
  const c = EASE[name] ?? EASE.out
  return `cubic-bezier(${c.join(',')})`
}

/**
 * Returns a transition style object (React inline style) for a CSS property.
 * @param {string|string[]} property
 * @param {{ duration?: number, ease?: string, delay?: number }} opts
 */
export function transition(property, { duration = DURATION.base, ease = 'out', delay = 0 } = {}) {
  const props = Array.isArray(property) ? property : [property]
  return {
    transitionProperty: props.join(', '),
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: bezier(ease),
    transitionDelay: `${delay}ms`,
  }
}

/** Stagger helper: returns delay (ms) for item `i` in a group of `count`. */
export function stagger(i, { step = 45, base = 0 } = {}) {
  return base + i * step
}

/** Simple linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Clamp a number into [min, max]. */
export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

/** Ease-out cubic — good for count-up deceleration. */
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t), 3)
}
