import { useEffect, useRef, useState } from 'react'

/**
 * Observes a ref'd element and returns true once it enters the viewport.
 * Used by scroll-reveal animations. `once` stops observing after the first
 * intersection; `margin` is the rootMargin (e.g. "-40px" to trigger earlier).
 */
export function useInView({ once = true, margin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { rootMargin: margin, threshold: 0.05 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once, margin])

  return { ref, inView }
}
