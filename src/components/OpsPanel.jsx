import { useState } from 'react'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { defaultParams, paramsComplete } from '../utils/scrubbers.js'
import { cn } from '../utils/cn.js'
import { Button, Checkbox, Field, Select, TextInput, Textarea } from './ui.jsx'
import { OpIcon } from './opIcons.jsx'

export default function OpsPanel({ ops, columns, busy, onApply, providers = [], onOpenSettings }) {
  const [expanded, setExpanded] = useState(null)
  const [forms, setForms] = useState({})

  const toggle = (op) => {
    if (expanded === op.type) {
      setExpanded(null)
      return
    }
    setExpanded(op.type)
    setForms((f) => (op.type in f ? f : { ...f, [op.type]: defaultParams(op) }))
  }

  const setParam = (op, key, value) => {
    setForms((f) => ({ ...f, [op.type]: { ...f[op.type], [key]: value } }))
  }

  const apply = (op) => {
    onApply({ type: op.type, params: forms[op.type] })
    setExpanded(null)
    setForms((f) => ({ ...f, [op.type]: defaultParams(op) }))
  }

  return (
    <div className="divide-y divide-border">
      {ops.map((op) => {
        const isOpen = expanded === op.type
        const params = forms[op.type] ?? defaultParams(op)
        const ready = paramsComplete(op, params)
        const needsProvider = op.group === 'ai'
        const noProvider = needsProvider && providers.length === 0
        return (
          <div key={op.type}>
            <button
              type="button"
              onClick={() => toggle(op)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
            >
              <OpIcon name={op.icon} className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-5 text-text-primary">
                  {op.label}
                </span>
                <span className="block truncate text-[11px] leading-4 text-text-tertiary">
                  {op.description}
                </span>
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border bg-surface-secondary/60 px-3 py-3">
                <div className="space-y-3">
                  {op.fields.map((field) => (
                    <OpField
                      key={field.key}
                      field={field}
                      value={params[field.key]}
                      columns={columns}
                      providers={providers}
                      onOpenSettings={onOpenSettings}
                      onChange={(v) => setParam(op, field.key, v)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  {noProvider && (
                    <span className="mr-auto text-[11px] text-text-tertiary">
                      Configure an API key to use AI ops.
                    </span>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy || !ready || noProvider}
                    onClick={() => apply(op)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OpField({ field, value, columns, providers, onOpenSettings, onChange }) {
  if (field.kind === 'provider') {
    if (providers.length === 0) {
      return (
        <Field label={field.label} hint={field.hint}>
          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-700 hover:underline"
          >
            <Settings className="h-3.5 w-3.5" />
            Open Settings to add an API key
          </button>
        </Field>
      )
    }
    return (
      <Field label={field.label} hint={field.hint}>
        <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Active provider (auto)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
    )
  }
  if (field.kind === 'columns') {
    return (
      <Field label={field.label} hint={field.hint}>
        <ColumnPicker columns={columns} value={value} onChange={onChange} />
      </Field>
    )
  }
  if (field.kind === 'column') {
    return (
      <Field label={field.label} hint={field.hint}>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Select a column…
          </option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
    )
  }
  if (field.kind === 'select') {
    return (
      <Field label={field.label}>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    )
  }
  if (field.kind === 'text') {
    return (
      <Field label={field.label} hint={field.hint}>
        <TextInput
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    )
  }
  if (field.kind === 'textarea') {
    return (
      <Field label={field.label} hint={field.hint}>
        <Textarea
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </Field>
    )
  }
  if (field.kind === 'checkbox') {
    return <Checkbox label={field.label} checked={Boolean(value)} onChange={onChange} />
  }
  return null
}

function ColumnPicker({ columns, value, onChange }) {
  const [open, setOpen] = useState(false)

  const all = value === null
  const selected = value ?? []
  const label = all
    ? `All columns (${columns.length})`
    : selected.length === 0
      ? 'No columns selected'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} columns`

  const toggleColumn = (c) => {
    if (all) {
      onChange(columns.filter((x) => x !== c))
      return
    }
    onChange(
      selected.includes(c)
        ? selected.filter((x) => x !== c)
        : [...selected, c],
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-7 w-full items-center justify-between gap-2 rounded-sm border border-border-secondary bg-surface px-2.5 text-xs text-text-primary',
          'hover:bg-surface-hover',
        )}
      >
        <span className="truncate font-mono">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full border border-border bg-surface shadow-md">
            <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] font-medium text-accent-700 hover:underline"
              >
                All columns
              </button>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-text-tertiary hover:text-text-secondary hover:underline"
              >
                None
              </button>
            </div>
            <div className="scrollbar-thin max-h-44 overflow-auto">
              {columns.map((c) => {
                const checked = all || selected.includes(c)
                return (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs hover:bg-surface-hover"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColumn(c)}
                      className="h-3.5 w-3.5 accent-accent-700"
                    />
                    <span className="truncate font-mono text-text-primary">{c}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
