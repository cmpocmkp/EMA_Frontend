import type { Ratio } from './api'

const numbers = new Intl.NumberFormat('en-US')

export function formatNumber(value: number) {
  return numbers.format(value)
}

/** One decimal place; a partial share is never shown as 0% or 100%. */
export function formatPercent({ value, total }: Ratio) {
  if (total === 0) return '–'
  const percent = (value / total) * 100
  if (value > 0 && percent < 0.1) return '<0.1%'
  if (value < total && percent > 99.9) return '>99.9%'
  return `${percent.toFixed(1)}%`
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
