import { useState, type ReactNode } from 'react'

/* ---------------- Card ---------------- */
export function Card({
  children,
  className = '',
  raised = false,
}: {
  children: ReactNode
  className?: string
  raised?: boolean
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line ${
        raised ? 'bg-card-raised' : 'bg-card'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------------- Collapsible section ---------------- */
export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  accent = 'pine',
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  accent?: 'pine' | 'gold' | 'clay' | 'slate'
}) {
  const [open, setOpen] = useState(defaultOpen)
  const dot =
    accent === 'gold'
      ? 'bg-gold'
      : accent === 'clay'
        ? 'bg-clay'
        : accent === 'slate'
          ? 'bg-slate'
          : 'bg-pine'
  return (
    <div className="border-b border-line-soft last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 py-3.5 text-left"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="flex-1 font-display text-[15px] font-semibold tracking-wide text-ink">
          {title}
        </span>
        {icon}
        <svg
          className={`h-4 w-4 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="pb-5 pt-0.5">{children}</div>}
    </div>
  )
}

/* ---------------- Slider field ---------------- */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  hint?: string
  format?: (v: number) => string
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-[13px] text-ink-soft">{label}</label>
        <div className="flex items-baseline gap-1">
          <span className="tnum font-display text-[17px] font-semibold leading-none text-ink">
            {format ? format(value) : value.toLocaleString('ja-JP')}
          </span>
          {unit && <span className="text-[11px] text-ink-faint">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  )
}

/* ---------------- Number field ---------------- */
export function NumberField({
  label,
  value,
  onChange,
  unit = '',
  min,
  max,
  step = 1,
  className = '',
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-[12px] text-ink-soft">{label}</span>}
      <span className="flex items-center gap-1.5 rounded-lg border border-line bg-card-raised px-2.5 py-1.5 focus-within:border-pine">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="tnum w-full bg-transparent text-[15px] font-medium text-ink outline-none"
        />
        {unit && <span className="shrink-0 text-[11px] text-ink-faint">{unit}</span>}
      </span>
    </label>
  )
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-paper-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-[6px] font-medium transition-colors ${
              size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
            } ${
              active
                ? 'bg-card-raised text-pine shadow-sm'
                : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Toggle ---------------- */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      type="button"
    >
      <span
        className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
          checked ? 'bg-pine' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card-raised shadow transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      {label && <span className="text-[13px] text-ink-soft">{label}</span>}
    </button>
  )
}

/* ---------------- Field row (label + control on right) ---------------- */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 last:mb-0">
      <span className="text-[13px] text-ink-soft">{label}</span>
      {children}
    </div>
  )
}
