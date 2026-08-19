// ---------------------------------------------------------------------------
// Guided demo.
//
// "Run demo" loads the leads sample and replays a small showcase pipeline
// (trim → dedupe → normalize email) with staggered delays and toasts, so
// first-time users see the whole flow without having to click through it.
// ---------------------------------------------------------------------------

import { SAMPLE_GALLERY } from './sampleData.js'

/** Delay between demo steps (ms). */
const STEP_DELAY = 900

export const DEMO_OPS = [
  {
    type: 'trim',
    params: { columns: null },
    label: 'Trim whitespace',
  },
  {
    type: 'dedupe',
    params: { columns: null },
    label: 'Remove duplicates',
  },
  {
    type: 'normalizeEmail',
    params: { column: 'email', addFlag: true },
    label: 'Normalize email',
  },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs the demo:
 *  1. load the leads sample,
 *  2. apply each demo op with a small pause and progress toasts.
 *
 * @param {{ onSample: (entry) => void, onApplyOp: (op) => void, toast: object, signal?: AbortSignal }} ctx
 */
export async function runDemo({ onSample, onApplyOp, toast, signal }) {
  const entry = SAMPLE_GALLERY.find((s) => s.id === 'leads')
  if (!entry) {
    toast.error('Demo unavailable', 'Sample data was not found.')
    return
  }

  toast.info('Starting demo', 'Loading the sample leads dataset…')
  // handleSample already wraps the gallery entry in a File via sampleFileFor.
  onSample(entry)

  await sleep(STEP_DELAY + 400)

  for (const op of DEMO_OPS) {
    if (signal?.aborted) return
    await sleep(STEP_DELAY)
    if (signal?.aborted) return
    toast.info(`Applying “${op.label}”`, 'Watching the pipeline rebuild…')
    onApplyOp({ type: op.type, params: op.params })
    await sleep(STEP_DELAY + 600)
  }

  if (signal?.aborted) return
  toast.success('Demo complete', 'Try the columns tab to see the cleaned result.')
}
