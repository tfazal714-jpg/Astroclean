import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '../utils/cn.js'
import { FadeIn } from './motion/index.jsx'

const FAQS = [
  {
    q: 'Does my data leave my computer?',
    a: 'No. Files are processed entirely in your browser by a DuckDB database compiled to WebAssembly. There is no AstroClean server, no upload, and no cloud processing. The only exception: if you run an AI enrichment operation, the row values you choose are sent to the API provider you configured (OpenRouter, Grok, Orca, etc.) — and only then.',
  },
  {
    q: 'Do I need an account?',
    a: 'No sign-up, no email, no cookies, no analytics. Open the page and start cleaning. Everything you do is stored only in your own browser (settings, providers and activity metrics in localStorage; AI results in IndexedDB).',
  },
  {
    q: 'Is it really fast?',
    a: 'Yes. Because the engine runs locally, there are no server queues or round-trips. A 100k-row file loads, cleans and exports in seconds on a normal laptop — the browser does the work, not a shared cloud.',
  },
  {
    q: 'How does the pipeline work?',
    a: 'Every operation you apply is recorded in a history list. The working table is always rebuilt from the raw upload by replaying those operations in order — so you can undo, redo, or reset to the original file at any time and results are fully reproducible.',
  },
  {
    q: 'What is the AI enrichment feature?',
    a: 'A single “AI transform” operation lets you write a prompt rule (e.g. “return the industry for {{company}}”) and fill or generate a new column using your own API key. Results are cached locally, so undo/redo replays never re-bill your key.',
  },
  {
    q: 'Where are my API keys stored?',
    a: 'Only in your browser’s localStorage. They are sent exclusively to the provider you selected, over HTTPS, never to any AstroClean server. You can remove them at any time from Settings → Providers.',
  },
  {
    q: 'What file formats can I load and export?',
    a: 'You can load CSV and TSV files. You can export the cleaned result as CSV, TSV or JSON, with options for delimiter, header row and empty-cell placeholders.',
  },
  {
    q: 'Is there a limit on file size?',
    a: 'There is no hard limit — the grid pages through rows on demand and AI operations stream in small batches, so memory stays flat. Very large files (hundreds of MB) work best on desktop with a modern browser.',
  },
]

function FaqItem({ faq, index }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <div className="border border-border bg-surface transition-colors hover:border-border-secondary">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-xs font-semibold text-text-primary">{faq.q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-3 text-[11px] leading-4 text-text-secondary">{faq.a}</p>
        </div>
      </div>
    </div>
  )
}

/** FAQ accordion for the homepage. */
export default function FaqSection() {
  return (
    <section className="mt-12 w-full border-t border-border pt-8" aria-label="Frequently asked questions">
      <FadeIn>
        <h2 className="mb-1 flex items-center justify-center gap-2 text-sm font-semibold text-text-primary">
          <HelpCircle className="h-4 w-4 text-accent-700" />
          Questions, answered
        </h2>
        <p className="mb-5 text-center text-[11px] text-text-tertiary">
          Everything you might wonder about privacy, speed and the pipeline.
        </p>
      </FadeIn>
      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-2">
        {FAQS.map((faq, i) => (
          <FadeIn key={faq.q} delay={Math.min(200, i * 40)}>
            <FaqItem faq={faq} index={i} />
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
