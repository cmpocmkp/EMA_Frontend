import { ArrowDown, ArrowUp } from 'lucide-react'
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import type { Ratio } from '../../api'
import { formatCompact, formatNumber, formatPercent } from '../../format'
import { ratioRow, type Tip, useChartTooltip } from './chart-tooltip'
import { ChartTooltip } from './ChartTooltip'
import { ratio, share } from './data'
import { Figure } from './parts'

/* Horizontal bars ------------------------------------------------------------------------------ */

export interface BarItem {
  key: string
  label: string
  /** Bar length, in the same unit as `max`. */
  value: number
  /** Shown after the bar. */
  display: ReactNode
  /** Shown on hover, tap or keyboard focus. */
  tip: Tip
  emphasized?: boolean
}

interface BarListProps {
  items: BarItem[]
  max: number
  /** A vertical marker for comparison, such as the provincial figure. */
  reference?: { value: number; label: ReactNode }
}

export function BarList({ items, max, reference }: BarListProps) {
  const tooltip = useChartTooltip()
  const anyEmphasized = items.some((item) => item.emphasized)
  const position = (value: number) => `${max ? Math.min(100, (value / max) * 100) : 0}%`

  return (
    <div className="bar-list">
      <ol onKeyDown={tooltip.onKeyDown}>
        {items.map((item, index) => (
          <li
            key={item.key}
            className={[
              'bar-list__item',
              item.emphasized ? 'is-emphasized' : '',
              anyEmphasized && !item.emphasized ? 'is-muted' : '',
              tooltip.activeIndex === index ? 'is-hovered' : '',
            ].join(' ')}
            {...tooltip.itemProps(index, item.tip)}
          >
            <span className="bar-list__label">{item.label}</span>
            <span className="bar-list__track" aria-hidden="true">
              <span className="bar-list__bar" style={{ width: position(item.value) }} />
              {reference && <span className="bar-list__reference" style={{ left: position(reference.value) }} />}
            </span>
            <span className="bar-list__value">{item.display}</span>
          </li>
        ))}
      </ol>
      {reference && (
        <p className="chart-legend">
          <span className="chart-legend__item">
            <span className="chart-legend__line" aria-hidden="true" />
            {reference.label}
          </span>
        </p>
      )}
      <ChartTooltip id={tooltip.id} placement={tooltip.placement} />
    </div>
  )
}

/* Heatmap -------------------------------------------------------------------------------------- */

interface HeatmapProps {
  rowHeader: string
  rows: { key: string; label: string; emphasized?: boolean }[]
  columns: { key: string; label: string }[]
  cell: (rowKey: string, columnKey: string) => Ratio | null
  /** Completes a cell's tooltip after its count and share, given the base, e.g. "of 473 schools have an IT lab". */
  describe: (total: string) => string
  /** A cell's tooltip when it has nothing to count. */
  emptyNote: string
}

/** Shares on a single-hue scale: the darker the cell, the higher the share. */
export function Heatmap({ rowHeader, rows, columns, cell, describe, emptyNote }: HeatmapProps) {
  const tooltip = useChartTooltip(columns.length)

  return (
    <div className="heatmap">
      <div className="table-scroll">
        <table onKeyDown={tooltip.onKeyDown}>
          <thead>
            <tr>
              <th scope="col">{rowHeader}</th>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key} className={row.emphasized ? 'is-emphasized' : undefined}>
                <th scope="row">{row.label}</th>
                {columns.map((column, columnIndex) => {
                  const counts = cell(row.key, column.key)
                  const fraction = counts ? share(counts) : null
                  const index = rowIndex * columns.length + columnIndex
                  const title = `${row.label} · ${column.label}`
                  const hovered = tooltip.activeIndex === index ? ' is-hovered' : ''
                  if (fraction === null || !counts) {
                    return (
                      <td
                        key={column.key}
                        className={`heatmap__cell heatmap__cell--empty${hovered}`}
                        {...tooltip.itemProps(index, { title, rows: [], note: emptyNote })}
                      >
                        –
                      </td>
                    )
                  }
                  return (
                    <td
                      key={column.key}
                      // Light text only where the cell is dark enough for it.
                      className={`heatmap__cell${fraction >= 0.65 ? ' heatmap__cell--dark' : ''}${hovered}`}
                      style={{ '--share': `${Math.round(fraction * 100)}%` } as CSSProperties}
                      {...tooltip.itemProps(index, { title, rows: [ratioRow(column.key, counts, describe)] })}
                    >
                      <Figure ratio={counts} baseOnHover={false} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChartTooltip id={tooltip.id} placement={tooltip.placement} />
      <p className="chart-legend">
        <span className="chart-legend__item">
          0%
          <span className="heatmap__scale" aria-hidden="true" />
          100%
        </span>
      </p>
    </div>
  )
}

/* Dumbbell ------------------------------------------------------------------------------------- */

interface DumbbellProps {
  /** Names of the two compared groups, e.g. girls' and boys' schools. */
  labels: [string, string]
  /** What each share measures, ending the tooltip lines, e.g. "have an IT lab". */
  measure: string
  items: { key: string; label: string; first: Ratio; second: Ratio; emphasized?: boolean }[]
}

/** A round upper bound for a share axis, so small shares still spread across the track. */
function axisMax(largest: number) {
  return [0.05, 0.1, 0.2, 0.25, 0.5, 1].find((step) => largest <= step) ?? 1
}

/** Two shares per row on a shared track from 0; the first is a filled dot, the second a ring. */
export function Dumbbell({ labels, measure, items }: DumbbellProps) {
  const tooltip = useChartTooltip()
  const max = axisMax(
    Math.max(0, ...items.flatMap((item) => [share(item.first) ?? 0, share(item.second) ?? 0])),
  )
  const position = (value: number | null) => (value === null ? undefined : `${(value / max) * 100}%`)
  const tipFor = (item: DumbbellProps['items'][number]): Tip => ({
    title: item.label,
    rows: [
      { ...ratioRow('first', item.first, (total) => `of ${total} ${labels[0].toLowerCase()} ${measure}`), marker: 'dot' },
      { ...ratioRow('second', item.second, (total) => `of ${total} ${labels[1].toLowerCase()} ${measure}`), marker: 'ring' },
    ],
  })

  return (
    <div className="dumbbell">
      <p className="chart-legend">
        <span className="chart-legend__item">
          <span className="dumbbell__key dumbbell__key--first" aria-hidden="true" />
          {labels[0]}
        </span>
        <span className="chart-legend__item">
          <span className="dumbbell__key dumbbell__key--second" aria-hidden="true" />
          {labels[1]}
        </span>
        <span className="chart-legend__item">Track runs from 0% to {max * 100}%</span>
      </p>
      <ol onKeyDown={tooltip.onKeyDown}>
        {items.map((item, index) => {
          const first = share(item.first)
          const second = share(item.second)
          return (
            <li
              key={item.key}
              className={[
                'dumbbell__row',
                item.emphasized ? 'is-emphasized' : '',
                tooltip.activeIndex === index ? 'is-hovered' : '',
              ].join(' ')}
              {...tooltip.itemProps(index, tipFor(item))}
            >
              <span className="dumbbell__label">{item.label}</span>
              <span className="dumbbell__track" aria-hidden="true">
                {first !== null && second !== null && (
                  <span
                    className="dumbbell__gap"
                    style={{ left: position(Math.min(first, second)), width: position(Math.abs(first - second)) }}
                  />
                )}
                {second !== null && <span className="dumbbell__dot dumbbell__dot--second" style={{ left: position(second) }} />}
                {first !== null && <span className="dumbbell__dot dumbbell__dot--first" style={{ left: position(first) }} />}
              </span>
              <span className="dumbbell__values">
                <span className="dumbbell__key dumbbell__key--first" aria-hidden="true" />
                <span className="visually-hidden">{labels[0]} </span>
                <Figure ratio={item.first} baseOnHover={false} />
                <span className="dumbbell__key dumbbell__key--second" aria-hidden="true" />
                <span className="visually-hidden">, {labels[1]} </span>
                <Figure ratio={item.second} baseOnHover={false} />
              </span>
            </li>
          )
        })}
      </ol>
      <ChartTooltip id={tooltip.id} placement={tooltip.placement} />
    </div>
  )
}

/* Stacked bars --------------------------------------------------------------------------------- */

interface StackedBarsProps {
  series: { key: string; label: string; color: string }[]
  items: { key: string; label: string; values: number[]; emphasized?: boolean }[]
  /** What the bars count, e.g. "IT teachers". */
  unit: string
}

const sumOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0)

/**
 * Each row split into its parts; each row's total also shows as a share of all rows. Hovering a row
 * lists every part with its count, marking the segment under the pointer.
 */
export function StackedBars({ series, items, unit }: StackedBarsProps) {
  const tooltip = useChartTooltip()
  const grandTotal = sumOf(items.map((item) => sumOf(item.values)))
  const activeSeries = tooltip.placement?.tip.rows.find((row) => row.active)?.key

  const tipFor =
    (item: StackedBarsProps['items'][number], total: number) =>
    (target: Element): Tip => {
      const hovered = target.closest<HTMLElement>('[data-series]')?.dataset.series
      return {
        title: item.label,
        rows: series.map((entry, index) => ({
          key: entry.key,
          color: entry.color,
          value: formatNumber(item.values[index]),
          share: total ? `(${formatPercent(ratio(item.values[index], total))})` : undefined,
          label: entry.label,
          active: entry.key === hovered,
        })),
        note: `${formatNumber(total)} ${unit}, ${formatPercent(ratio(total, grandTotal))} of all ${unit}`,
      }
    }

  return (
    <div className="stacked">
      <p className="chart-legend">
        {series.map((entry) => (
          <span key={entry.key} className="chart-legend__item">
            <span className="chart-legend__swatch" style={{ background: entry.color }} aria-hidden="true" />
            {entry.label}
          </span>
        ))}
      </p>
      <ol onKeyDown={tooltip.onKeyDown}>
        {items.map((item, rowIndex) => {
          const total = sumOf(item.values)
          const hovered = tooltip.activeIndex === rowIndex
          return (
            <li
              key={item.key}
              className={['stacked__row', item.emphasized ? 'is-emphasized' : '', hovered ? 'is-hovered' : ''].join(' ')}
              {...tooltip.itemProps(rowIndex, tipFor(item, total))}
            >
              <span className="stacked__label">{item.label}</span>
              <span className="stacked__bar" aria-hidden="true">
                {item.values.map((value, index) =>
                  value > 0 ? (
                    <span
                      key={series[index].key}
                      data-series={series[index].key}
                      className={hovered && activeSeries === series[index].key ? 'stacked__segment is-active' : 'stacked__segment'}
                      style={{ flexGrow: value, background: series[index].color }}
                    />
                  ) : null,
                )}
              </span>
              <span className="stacked__total">
                <Figure ratio={ratio(total, grandTotal)} baseOnHover={false} />
              </span>
              <span className="visually-hidden">
                {series.map((entry, index) => `${entry.label} ${formatNumber(item.values[index])}`).join(', ')}
              </span>
            </li>
          )
        })}
      </ol>
      <ChartTooltip id={tooltip.id} placement={tooltip.placement} />
    </div>
  )
}

/* Columns -------------------------------------------------------------------------------------- */

/** Round axis ticks from 0 past `max`, about four steps. */
function ticks(max: number) {
  const rough = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? rough
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => index * step)
}

interface ColumnChartProps {
  unit: string
  items: { key: string; label: string; shortLabel: string; value: number }[]
}

/** Columns on a shared axis; hover, tap or focus a column for its count and share of the total. */
export function ColumnChart({ unit, items }: ColumnChartProps) {
  const tooltip = useChartTooltip()
  const axis = ticks(Math.max(1, ...items.map((item) => item.value)))
  const top = axis[axis.length - 1]
  const total = sumOf(items.map((item) => item.value))

  return (
    <div className="columns">
      <div className="columns__plot">
        <div className="columns__grid" aria-hidden="true">
          {axis.map((tick) => (
            <span key={tick} className="columns__tick" style={{ bottom: `${(tick / top) * 100}%` }}>
              <span>{formatCompact(tick)}</span>
            </span>
          ))}
        </div>
        <ol className="columns__bars" onKeyDown={tooltip.onKeyDown}>
          {items.map((item, index) => (
            <li
              key={item.key}
              className={tooltip.activeIndex === index ? 'columns__item is-hovered' : 'columns__item'}
              aria-label={`${item.label}: ${formatNumber(item.value)} ${unit}`}
              {...tooltip.itemProps(index, {
                title: item.label,
                rows: [ratioRow(item.key, ratio(item.value, total), (all) => `of ${all} ${unit}`)],
              })}
            >
              <span className="columns__bar" style={{ height: `${(item.value / top) * 100}%` }} />
              <span className="columns__label" aria-hidden="true">
                {item.shortLabel}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <ChartTooltip id={tooltip.id} placement={tooltip.placement} />
    </div>
  )
}

/* Sortable table ------------------------------------------------------------------------------- */

export interface Column<Row> {
  key: string
  label: string
  /** What the column sorts by; null sorts last. */
  sortValue: (row: Row) => number | string | null
  render: (row: Row) => ReactNode
  numeric?: boolean
}

interface DataTableProps<Row> {
  caption: string
  rows: Row[]
  columns: Column<Row>[]
  rowKey: (row: Row) => string
  initialSort: { key: string; descending: boolean }
  /** A totals row shown under the sorted rows, rendered with the same columns. */
  footerRow?: Row
  emphasizedKey?: string | null
}

export function DataTable<Row>({
  caption,
  rows,
  columns,
  rowKey,
  initialSort,
  footerRow,
  emphasizedKey,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState(initialSort)
  const column = columns.find((entry) => entry.key === sort.key) ?? columns[0]

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const left = column.sortValue(a)
      const right = column.sortValue(b)
      if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1
      const order = typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right)
      return sort.descending ? -order : order
    })
  }, [rows, column, sort.descending])

  function sortBy(key: string, numeric: boolean) {
    // Numbers start with the largest first, names alphabetically.
    setSort((current) => (current.key === key ? { key, descending: !current.descending } : { key, descending: numeric }))
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((entry) => {
              const active = entry.key === column.key
              return (
                <th
                  key={entry.key}
                  scope="col"
                  className={entry.numeric ? 'is-numeric' : undefined}
                  aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}
                >
                  <button type="button" onClick={() => sortBy(entry.key, Boolean(entry.numeric))}>
                    {entry.label}
                    {active &&
                      (sort.descending ? (
                        <ArrowDown size={13} strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <ArrowUp size={13} strokeWidth={2.2} aria-hidden="true" />
                      ))}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={rowKey(row) === emphasizedKey ? 'is-emphasized' : undefined}>
              {columns.map((entry) => (
                <td key={entry.key} className={entry.numeric ? 'is-numeric' : undefined}>
                  {entry.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerRow && (
          <tfoot>
            <tr>
              {columns.map((entry) => (
                <td key={entry.key} className={entry.numeric ? 'is-numeric' : undefined}>
                  {entry.render(footerRow)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
