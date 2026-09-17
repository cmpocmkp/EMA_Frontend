import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Ratio } from '../../api'
import { formatNumber, formatPercent } from '../../format'

interface SummaryCardProps {
  icon: LucideIcon
  title: string
  headline: Ratio
  caption: string
  children: ReactNode
}

/** A headline figure with its total and share, followed by breakdown sections. */
export function SummaryCard({ icon: Icon, title, headline, caption, children }: SummaryCardProps) {
  return (
    <article className="glass summary-card">
      <header className="summary-card__header">
        <span className="summary-card__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <h3>{title}</h3>
      </header>

      <div className="summary-card__headline">
        <p className="summary-card__value-line">
          <span className="summary-card__value">{formatNumber(headline.value)}</span>
          <span className="summary-card__percent">{formatPercent(headline)}</span>
        </p>
        <p className="summary-card__caption">
          of {formatNumber(headline.total)} {caption}
        </p>
        <Meter ratio={headline} />
      </div>

      {children}
    </article>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="summary-card__section">
      <h4>{title}</h4>
      <ul className="ratio-list">{children}</ul>
    </section>
  )
}

export function RatioRow({ label, ratio }: { label: string; ratio: Ratio }) {
  return (
    <li className="ratio-row">
      <span>{label}</span>
      <span className="ratio-row__numbers">
        {formatNumber(ratio.value)}
        <span className="ratio-row__total"> / {formatNumber(ratio.total)}</span>
      </span>
      <span className="ratio-row__percent">{formatPercent(ratio)}</span>
      <Meter ratio={ratio} small />
    </li>
  )
}

/**
 * A count with its share after it in small type, e.g. 134 (9.9%). Hovering shows the base, unless the
 * figure sits on a chart mark whose own tooltip already says it.
 */
export function Figure({ ratio, baseOnHover = true }: { ratio: Ratio; baseOnHover?: boolean }) {
  if (!ratio.total) return <span className="figure">–</span>
  return (
    <span
      className="figure"
      title={baseOnHover ? `${formatNumber(ratio.value)} of ${formatNumber(ratio.total)}` : undefined}
    >
      {formatNumber(ratio.value)}{' '}
      <small className="figure__share">({formatPercent(ratio)})</small>
    </span>
  )
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="summary-card__note">{children}</p>
}

/** A share as a bar; the numbers beside it carry the value, so it is hidden from screen readers. */
export function Meter({ ratio, small = false }: { ratio: Ratio; small?: boolean }) {
  const percent = ratio.total ? Math.min(100, (ratio.value / ratio.total) * 100) : 0
  return (
    <span className={small ? 'meter meter--small' : 'meter'} aria-hidden="true">
      {/* A sliver keeps small but non-zero shares visible. */}
      <span className="meter__fill" style={{ width: percent > 0 ? `max(3px, ${percent}%)` : 0 }} />
    </span>
  )
}

interface SegmentedProps {
  label: string
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
}

/** A row of toggle buttons choosing one option. */
export function Segmented({ label, options, value, onChange }: SegmentedProps) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.key === value ? 'segmented__option is-selected' : 'segmented__option'}
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface PanelProps {
  title: string
  description?: string
  /** Spans the full width of the section grid. */
  wide?: boolean
  actions?: ReactNode
  children: ReactNode
}

/** A glass panel holding one chart or table. */
export function Panel({ title, description, wide = false, actions, children }: PanelProps) {
  return (
    <section className={wide ? 'glass panel panel--wide' : 'glass panel'}>
      <header className="panel__header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}
