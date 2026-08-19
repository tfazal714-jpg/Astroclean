import { useRef, useState } from 'react'
import {
  BarChart3,
  Download,
  FileUp,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Sparkle,
  UserX,
  Zap,
} from 'lucide-react'
import { cn } from '../utils/cn.js'
import { Badge, Spinner } from './ui.jsx'
import { FadeIn, SlideIn, Stagger, CountUp, ScaleIn } from './motion/index.jsx'
import Logo from './Logo.jsx'
import SamplePickerModal from './SamplePickerModal.jsx'
import TrustMarquee from './TrustMarquee.jsx'
import FaqSection from './FaqSection.jsx'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'We never see your data',
    text: 'Files are processed inside your browser. Nothing is uploaded, stored, or sent to any AstroClean server — there are none.',
  },
  {
    icon: HardDrive,
    title: '100% on-device engine',
    text: 'A full DuckDB database compiled to WebAssembly runs the entire pipeline locally, in a background worker.',
  },
  {
    icon: Zap,
    title: 'Results in seconds',
    text: 'No queues, no waiting on a server. Clean, dedupe, normalize and enrich large files as fast as your machine allows.',
  },
  {
    icon: UserX,
    title: 'No accounts, no tracking',
    text: 'No sign-up, no cookies, no analytics, no fingerprinting. Open the page and start working.',
  },
  {
    icon: KeyRound,
    title: 'Your AI key, your call',
    text: 'Optional AI enrichment uses your own provider key — it lives only in your browser and goes only to the provider you pick.',
  },
  {
    icon: Download,
    title: 'Export anytime',
    text: 'Download the scrubbed result as CSV, TSV or JSON in one click — with undo, redo and reset along the way.',
  },
]

const STEPS = [
  { n: '01', title: 'Upload', text: 'Drop a lead CSV or TSV — it never leaves your machine.' },
  { n: '02', title: 'Clean', text: 'Trim, dedupe, normalize emails & phones, fill gaps.' },
  { n: '03', title: 'Export', text: 'Download the scrubbed dataset as CSV.' },
]

export default function UploadView({
  busy,
  error,
  onFile,
  onSample,
  activity,
  onOpenMetrics,
}) {
  const [dragging, setDragging] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const file = files && files[0]
    if (file) onFile(file)
  }

  const hasActivity = Boolean(activity && activity.filesProcessed > 0)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <div className="mb-7 text-center">
        <FadeIn duration={600}>
          <Logo
            markClassName="h-12 w-12 animate-logo-pop"
            tagline="local-first CSV workspace"
            className="mb-5 justify-center"
          />
        </FadeIn>

        <SlideIn direction="up" delay={80}>
          <h1 className="mx-auto max-w-xl text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-[28px]">
            Clean your lead lists in seconds —{' '}
            <span className="text-accent-700">without your data leaving the machine</span>
          </h1>
        </SlideIn>

        <SlideIn direction="up" delay={160}>
          <p className="mx-auto mt-2.5 max-w-lg text-sm leading-5 text-text-secondary">
            AstroClean scrubs, dedupes, normalizes and enriches B2B lead CSVs with a
            local DuckDB engine. Drop a file, apply operations, download the result.
          </p>
        </SlideIn>

        <Stagger baseDelay={240} step={70} className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone="accent" className="gap-1 px-2 py-0.5 text-[11px]">
            <ShieldCheck className="h-3 w-3" /> 100% on-device
          </Badge>
          <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
            <Zap className="h-3 w-3" /> Results in seconds
          </Badge>
          <Badge tone="neutral" className="px-2 py-0.5 text-[11px]">
            <UserX className="h-3 w-3" /> No accounts
          </Badge>
        </Stagger>
      </div>

      {/* Drop zone */}
      <ScaleIn delay={200} className="w-full">
        <div
          data-dropzone
          className={cn(
            'group relative w-full cursor-pointer overflow-hidden rounded-sm border-2 border-dashed bg-surface p-8 text-center transition-colors sm:p-10',
            dragging
              ? 'border-accent-600 bg-accent-50'
              : 'border-border-secondary hover:border-accent-600',
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />

          {/* Animated scan line while hovering / dragging */}
          {!busy && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500 to-transparent',
                dragging ? 'animate-scan-fast' : 'animate-scan',
              )}
            />
          )}

          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-text-secondary">{busy}</p>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-surface-secondary transition-transform duration-200 group-hover:scale-105">
                <FileUp className="h-5 w-5 text-accent-700" />
              </div>
              <p className="text-sm font-medium text-text-primary">
                Drag and drop a CSV here, or click to browse
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                .csv or .tsv — the first row is treated as the header
              </p>
            </>
          )}
        </div>
      </ScaleIn>

      {error && (
        <div className="mt-4 w-full rounded-sm border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Trust marquee */}
      <TrustMarquee />

      {/* Sample + privacy */}
      <FadeIn delay={300} className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          data-sample-button
          onClick={() => setPickerOpen(true)}
          disabled={Boolean(busy)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-700 hover:text-accent-800 disabled:pointer-events-none disabled:opacity-45"
        >
          <Sparkle className="h-3.5 w-3.5" />
          No file handy? Browse sample datasets
        </button>
      </FadeIn>

      {/* Activity strip */}
      {hasActivity && (
        <FadeIn delay={360} className="w-full">
          <button
            type="button"
            onClick={onOpenMetrics}
            className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-sm border border-border bg-surface px-4 py-3 text-center transition-colors hover:border-accent-600 sm:justify-between sm:text-left"
          >
            <span className="inline-flex items-center gap-2 text-xs font-medium text-text-primary">
              <BarChart3 className="h-3.5 w-3.5 text-accent-700" />
              Your activity
            </span>
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-text-secondary">
              <span>
                <CountUp value={activity.filesProcessed} className="font-semibold text-text-primary" /> files
              </span>
              <span>
                <CountUp value={activity.totalRows} className="font-semibold text-text-primary" /> rows
              </span>
              <span>
                <CountUp value={activity.opsApplied} className="font-semibold text-text-primary" /> ops
              </span>
              <span className="inline-flex items-center gap-1 text-accent-700">
                View details
                <span aria-hidden="true">→</span>
              </span>
            </span>
          </button>
        </FadeIn>
      )}

      {/* Trust / features */}
      <Stagger baseDelay={150} step={55} className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group border border-border bg-surface px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-600 hover:shadow-sm"
          >
            <feature.icon className="mb-2 h-4 w-4 text-accent-700 transition-transform duration-200 group-hover:scale-110" />
            <h3 className="mb-1 text-xs font-semibold text-text-primary">{feature.title}</h3>
            <p className="text-[11px] leading-4 text-text-tertiary">{feature.text}</p>
          </div>
        ))}
      </Stagger>

      {/* Steps */}
      <div className="mt-10 grid w-full grid-cols-1 gap-5 border-t border-border pt-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <SlideIn key={step.n} direction="up" delay={i * 90}>
            <p className="mb-1 font-mono text-[11px] text-accent-700">{step.n}</p>
            <p className="mb-1 text-xs font-semibold text-text-primary">{step.title}</p>
            <p className="text-[11px] leading-4 text-text-tertiary">{step.text}</p>
          </SlideIn>
        ))}
      </div>

      {/* Keyboard hint */}
      <FadeIn delay={150} className="mt-8">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
          <kbd className="rounded-sm border border-border-secondary bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">Ctrl</kbd>
          <span>+</span>
          <kbd className="rounded-sm border border-border-secondary bg-surface-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">K</kbd>
          <span>opens the command palette</span>
        </p>
      </FadeIn>

      {/* FAQ */}
      <FaqSection />

      {/* Footer line */}
      <FadeIn delay={150} className="mt-10">
        <p className="text-center text-[10px] text-text-tertiary">
          AstroClean is free, open on this page, and leaves no trace on your device
          beyond what you save.
        </p>
      </FadeIn>

      {pickerOpen && (
        <SamplePickerModal
          onPick={(entry) => {
            setPickerOpen(false)
            onSample(entry)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
