import type { Ratio } from './api'

const numbers = new Intl.NumberFormat('en-US')

export function formatNumber(value: number) {
  return numbers.format(value)
}

export function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** 685,875 → 685.9K, for axis ticks. */
export function formatCompact(value: number) {
  return compact.format(value)
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

/** District and tehsil names arrive in capitals: "D.I.KHAN" → "D.I.Khan", "TOWN III" → "Town III". */
export function formatPlaceName(name: string) {
  return name
    .toLowerCase()
    .replace(/(^|[\s.(])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase())
    .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix)\b/g, (numeral) => numeral.toUpperCase())
}
