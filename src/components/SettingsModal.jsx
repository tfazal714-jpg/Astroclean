import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { PROVIDER_PRESETS, testProvider } from '../services/ai.js'
import { cn } from '../utils/cn.js'
import { Button, Field, IconButton, Select, Spinner, TextInput } from './ui.jsx'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { storageUsage } from '../utils/storage.js'
import { formatBytes } from '../utils/fileSize.js'

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`

const TABS = [
  { id: 'providers', label: 'Providers', icon: KeyRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'export', label: 'Export', icon: Database },
  { id: 'data', label: 'Data', icon: ShieldCheck },
]

export default function SettingsModal({
  providers,
  onSave,
  settings,
  onSettingsChange,
  onClearActivity,
  onClearAiCache,
  onReplayTour,
  onClose,
}) {
  const [tab, setTab] = useState('providers')
  const [draft, setDraft] = useState(() => providers.map((p) => ({ ...p })))
  const [adding, setAdding] = useState(false)
  const [showKeys, setShowKeys] = useState({})
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState({})
  const [confirmClear, setConfirmClear] = useState(false)
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const update = (id, patch) =>
    setDraft((ds) => ds.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const addPreset = (preset) => {
    setDraft((ds) => [
      ...ds,
      {
        id: newId(),
        name: preset.name,
        baseUrl: preset.baseUrl,
        model: preset.model,
        apiKey: '',
        active: ds.length === 0,
      },
    ])
    setAdding(false)
  }

  const remove = (id) =>
    setDraft((ds) => {
      const rest = ds.filter((p) => p.id !== id)
      const wasActive = ds.find((p) => p.id === id)?.active
      if (wasActive && rest.length > 0 && !rest.some((p) => p.active)) {
        rest[0].active = true
      }
      return rest
    })

  const setActive = (id) =>
    setDraft((ds) => ds.map((p) => ({ ...p, active: p.id === id })))

  const test = async (p) => {
    if (!p.apiKey?.trim()) {
      setTestResult((t) => ({ ...t, [p.id]: { ok: false, msg: 'Enter an API key first.' } }))
      return
    }
    setTestingId(p.id)
    setTestResult((t) => ({ ...t, [p.id]: null }))
    try {
      await testProvider(p)
      setTestResult((t) => ({ ...t, [p.id]: { ok: true, msg: 'Connected ✓' } }))
    } catch (err) {
      setTestResult((t) => ({ ...t, [p.id]: { ok: false, msg: err.message } }))
    } finally {
      setTestingId(null)
    }
  }

  const save = () => {
    const cleaned = draft
      .filter((p) => p.name?.trim())
      .map((p) => ({
        ...p,
        name: p.name.trim(),
        baseUrl: p.baseUrl.trim(),
        model: p.model.trim(),
      }))
    const hasActive = cleaned.some((p) => p.active)
    onSave(hasActive ? cleaned : cleaned.map((p, i) => ({ ...p, active: i === 0 })))
    onClose()
  }

  const patchSettings = (patch) => onSettingsChange(patch)

  const handleClearActivity = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    onClearActivity()
    setConfirmClear(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={modalRef} className="w-full max-w-xl border border-border bg-surface shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-accent-700" />
            <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border border-border bg-surface-secondary text-text-primary shadow-sm'
                  : 'border border-transparent text-text-tertiary hover:text-text-primary',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-4 py-4 scrollbar-thin">
          {/* ------------------------------ Providers ------------------------------ */}
          {tab === 'providers' && (
            <div className="space-y-3">
              <p className="flex items-start gap-2 border border-border bg-surface-secondary px-3 py-2 text-[11px] leading-4 text-text-secondary">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-accent-700" />
                <span>
                  Keys are stored only in this browser (localStorage) and are sent
                  exclusively to the provider you select — never to any AstroClean
                  server. When an AI operation runs, row values are sent to that
                  provider for processing.
                </span>
              </p>

              {draft.length === 0 && (
                <p className="px-1 text-xs text-text-tertiary">
                  No providers yet — add one below (OpenRouter, Grok, Orca Router,
                  or any OpenAI-compatible endpoint).
                </p>
              )}

              {draft.map((p) => {
                const result = testResult[p.id]
                return (
                  <div key={p.id} className="border border-border">
                    <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setActive(p.id)}
                        title="Use as the default provider for AI operations"
                        className="flex min-w-0 items-center gap-2"
                      >
                        <span
                          className={cn(
                            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
                            p.active
                              ? 'border-accent-700 bg-accent-700 text-white'
                              : 'border-border-secondary bg-surface',
                          )}
                        >
                          {p.active && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <input
                          value={p.name}
                          onChange={(e) => update(p.id, { name: e.target.value })}
                          className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-text-primary focus:outline-none"
                          aria-label="Provider name"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="shrink-0 rounded-sm p-1 text-text-tertiary transition-colors hover:bg-error/10 hover:text-error"
                        title="Remove provider"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-2">
                      <Field label="Base URL">
                        <TextInput
                          value={p.baseUrl}
                          placeholder="https://api.example.com/v1"
                          onChange={(e) => update(p.id, { baseUrl: e.target.value })}
                          spellCheck={false}
                        />
                      </Field>
                      <Field label="Model">
                        <TextInput
                          value={p.model}
                          placeholder="model-name"
                          onChange={(e) => update(p.id, { model: e.target.value })}
                          spellCheck={false}
                        />
                      </Field>
                      <div className="col-span-1 sm:col-span-2">
                        <Field label="API key">
                          <div className="relative">
                            <TextInput
                              type={showKeys[p.id] ? 'text' : 'password'}
                              value={p.apiKey}
                              placeholder="sk-…"
                              onChange={(e) => update(p.id, { apiKey: e.target.value })}
                              className="pr-9 font-mono"
                              spellCheck={false}
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))
                              }
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-text-tertiary hover:text-text-primary"
                              aria-label={showKeys[p.id] ? 'Hide key' : 'Show key'}
                            >
                              {showKeys[p.id] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </Field>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={testingId === p.id || !p.apiKey?.trim()}
                        onClick={() => test(p)}
                      >
                        {testingId === p.id ? (
                          <>
                            <Spinner className="h-3 w-3" /> Testing…
                          </>
                        ) : (
                          'Test connection'
                        )}
                      </Button>
                      {result && (
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-[11px]',
                            result.ok ? 'text-success' : 'text-error',
                          )}
                          title={result.msg}
                        >
                          {result.msg}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {adding ? (
                <div className="border border-border">
                  <div className="border-b border-border bg-surface-secondary px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    Add provider
                  </div>
                  <div className="divide-y divide-border/70">
                    {PROVIDER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => addPreset(preset)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-text-primary">
                            {preset.name}
                          </span>
                          <span className="block truncate text-[11px] text-text-tertiary">
                            {preset.hint}
                          </span>
                        </span>
                        <Plus className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add provider
                </Button>
              )}
            </div>
          )}

          {/* ------------------------------ Appearance ----------------------------- */}
          {tab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">Theme</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'system', label: 'System', icon: Monitor },
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patchSettings({ theme: opt.value })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-sm border px-2 py-3 transition-colors',
                        settings?.theme === opt.value
                          ? 'border-accent-600 bg-accent-50 text-accent-800'
                          : 'border-border-secondary bg-surface text-text-secondary hover:border-accent-600',
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={Boolean(settings?.reduceMotion)}
                  onChange={(e) => patchSettings({ reduceMotion: e.target.checked })}
                  className="h-3.5 w-3.5 accent-accent-700"
                />
                Reduce animations (overrides system preference)
              </label>

              <p className="border border-border bg-surface-secondary px-3 py-2 text-[11px] leading-4 text-text-secondary">
                Animations are subtle by design and always disabled when your OS
                reports “reduce motion”.
              </p>
            </div>
          )}

          {/* -------------------------------- Export ------------------------------- */}
          {tab === 'export' && (
            <div className="space-y-4">
              <Field label="Default format" hint="Pre-selected in the export dialog.">
                <Select
                  value={settings?.export?.format ?? 'csv'}
                  onChange={(e) => patchSettings({ export: { format: e.target.value } })}
                >
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="json">JSON</option>
                </Select>
              </Field>

              <Field label="Default delimiter">
                <Select
                  value={settings?.export?.delimiter ?? ','}
                  onChange={(e) => patchSettings({ export: { delimiter: e.target.value } })}
                  disabled={settings?.export?.format === 'tsv'}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </Select>
              </Field>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={settings?.export?.includeHeader !== false}
                  onChange={(e) => patchSettings({ export: { includeHeader: e.target.checked } })}
                  className="h-3.5 w-3.5 accent-accent-700"
                />
                Include header row by default
              </label>

              <Field label="Empty cells become" hint="Applied when the JS export path is used.">
                <TextInput
                  value={settings?.export?.nullValue ?? ''}
                  placeholder="(empty)"
                  onChange={(e) => patchSettings({ export: { nullValue: e.target.value } })}
                />
              </Field>
            </div>
          )}

          {/* --------------------------------- Data -------------------------------- */}
          {tab === 'data' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border border-border bg-surface-secondary/60 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-text-primary">Local storage usage</p>
                  <p className="text-[11px] text-text-tertiary">
                    Settings, providers and activity — all in this browser.
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-text-secondary">
                  {formatBytes(storageUsage())}
                </span>
              </div>

              <button
                type="button"
                onClick={onClearAiCache}
                className="flex w-full items-center justify-between gap-3 border border-border px-3 py-2.5 text-left transition-colors hover:border-warning/50"
              >
                <div>
                  <p className="text-xs font-medium text-text-primary">Clear AI result cache</p>
                  <p className="text-[11px] text-text-tertiary">
                    IndexedDB cache of past AI enrichments. Re-running the same op
                    afterwards will re-bill your key.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-warning">Clear</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onReplayTour()
                  onClose()
                }}
                className="flex w-full items-center justify-between gap-3 border border-border px-3 py-2.5 text-left transition-colors hover:border-accent-600"
              >
                <div>
                  <p className="text-xs font-medium text-text-primary">Replay onboarding tour</p>
                  <p className="text-[11px] text-text-tertiary">
                    Walk through the main screens again.
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-accent-700">Replay</span>
              </button>

              <button
                type="button"
                onClick={handleClearActivity}
                className={cn(
                  'flex w-full items-center justify-between gap-3 border border-border px-3 py-2.5 text-left transition-colors',
                  confirmClear ? 'border-error/50' : 'hover:border-error/50',
                )}
              >
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {confirmClear ? 'Confirm — erase all activity?' : 'Clear activity metrics'}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {confirmClear
                      ? 'This cannot be undone.'
                      : 'Files processed, rows and operation history — stored only here.'}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-[11px] font-medium',
                    confirmClear ? 'text-error' : 'text-error/80',
                  )}
                >
                  {confirmClear ? 'Erase' : 'Clear'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
