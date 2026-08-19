import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, X } from 'lucide-react'
import { cn } from '../utils/cn.js'
import { Button, IconButton } from './ui.jsx'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'

// ---------------------------------------------------------------------------
// Onboarding tour — a spotlight walkthrough of the app's key surfaces.
//
// Steps reference elements by `target` (a CSS selector or a function).
// Missing targets are skipped gracefully so the tour never blocks the app.
// ---------------------------------------------------------------------------

const TOUR_STEPS = [
  {
    id: 'brand',
    title: 'Welcome to AstroClean',
    body: 'Privacy-first CSV cleaning that runs entirely in your browser. No uploads, no accounts — your data never leaves this machine.',
    target: 'header',
    placement: 'bottom',
  },
  {
    id: 'dropzone',
    title: 'Drop your file',
    body: 'Drag a CSV or TSV anywhere on this zone — or click to browse. A preview lets you check the parse before it loads.',
    target: () => document.querySelector('[data-dropzone]'),
    placement: 'bottom',
  },
  {
    id: 'samples',
    title: 'Try a sample first',
    body: 'No file handy? Browse the sample gallery to explore the pipeline with realistic dirty data.',
    target: () => document.querySelector('[data-sample-button]'),
    placement: 'top',
  },
  {
    id: 'metrics',
    title: 'Track your activity',
    body: 'The chart icon opens your metrics — files processed, rows handled, operations applied, all stored only in this browser.',
    target: () => document.querySelector('[data-metrics-button]'),
    placement: 'bottom',
  },
  {
    id: 'settings',
    title: 'Bring your own AI key',
    body: 'The gear icon manages optional AI enrichment providers (OpenRouter, Grok, Orca, or any OpenAI-compatible endpoint). Keys stay local.',
    target: () => document.querySelector('[data-settings-button]'),
    placement: 'bottom',
  },
  {
    id: 'pipeline',
    title: 'The pipeline',
    body: 'Every operation you apply is recorded here and replayed from the raw upload — undo, redo and reset at any time.',
    target: () => document.querySelector('[data-pipeline-panel]'),
    placement: 'top',
  },
]

function resolveTarget(step) {
  try {
    return typeof step.target === 'function' ? step.target() : document.querySelector(step.target)
  } catch {
    return null
  }
}

export default function OnboardingTour({ onFinish }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const reduced = usePrefersReducedMotion()

  const steps = useMemo(
    () => TOUR_STEPS.filter((step) => Boolean(resolveTarget(step))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index],
  )

  const measure = useCallback(() => {
    const step = steps[index]
    if (!step) return
    const el = resolveTarget(step)
    if (el) {
      const r = el.getBoundingClientRect()
      setRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })
    } else {
      setRect(null)
    }
  }, [steps, index])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  const step = steps[index]
  const isLast = index === steps.length - 1

  const next = () => {
    if (isLast) {
      onFinish()
      return
    }
    setIndex((i) => Math.min(steps.length - 1, i + 1))
  }

  const prev = () => setIndex((i) => Math.max(0, i - 1))

  if (!step) {
    // Nothing to highlight — finish quietly.
    return null
  }

  const placement = step.placement ?? 'bottom'

  const tooltipStyle = (() => {
    if (!rect) return { top: '50%', left: '50%' }
    const GAP = 12
    if (placement === 'bottom') {
      return {
        top: rect.top + rect.height + GAP,
        left: rect.left,
        maxWidth: Math.min(320, Math.max(240, rect.width)),
      }
    }
    return {
      bottom: window.innerHeight - rect.top + GAP,
      left: rect.left,
      maxWidth: Math.min(320, Math.max(240, rect.width)),
    }
  })()

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-label={`Tour step ${index + 1}`}>
      {/* Spotlight */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[81] rounded-sm shadow-[0_0_0_9999px_rgba(2,6,23,0.55)] transition-all duration-300"
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            transitionProperty: reduced ? 'none' : 'left, top, width, height',
          }}
        />
      )}
      {!rect && <div className="fixed inset-0 z-[81] bg-black/40" />}

      {/* Tooltip */}
      <div
        className="fixed z-[82] border border-border bg-surface p-4 shadow-md"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-accent-700">
            {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
          </span>
          <IconButton title="Dismiss tour" onClick={onFinish} className="h-5 w-5">
            <X className="h-3.5 w-3.5" />
          </IconButton>
        </div>
        <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
        <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-accent-700' : 'w-1.5 bg-border-secondary hover:bg-text-tertiary',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={next}>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
