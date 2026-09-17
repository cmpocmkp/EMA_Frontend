import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TipPlacement } from './chart-tooltip'

const GAP = 14
const EDGE = 8

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)))

/** A chart's hover card. It is fixed to the window, so panels and scrolling tables never clip it. */
export function ChartTooltip({ id, placement }: { id: string; placement: TipPlacement | null }) {
  const ref = useRef<HTMLDivElement>(null)

  // Placed before paint, once its size is known: beside the pointer, or above the mark, flipping to stay on screen.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !placement) return
    const { width, height } = element.getBoundingClientRect()
    const { innerWidth, innerHeight } = window
    const { x, y, mode, below } = placement
    let left: number
    let top: number
    if (mode === 'pointer') {
      left = x + GAP + width > innerWidth - EDGE ? x - GAP - width : x + GAP
      top = y + GAP + height > innerHeight - EDGE ? y - GAP - height : y + GAP
    } else {
      left = x - width / 2
      top = y - GAP - height < EDGE ? below + GAP : y - GAP - height
    }
    element.style.transform = `translate(${clamp(left, EDGE, innerWidth - width - EDGE)}px, ${clamp(top, EDGE, innerHeight - height - EDGE)}px)`
  }, [placement])

  if (!placement) return null
  const { tip } = placement
  const keyed = tip.rows.some((row) => row.color || row.marker)

  return createPortal(
    <div ref={ref} id={id} role="tooltip" className="chart-tooltip">
      <p className="chart-tooltip__title">{tip.title}</p>
      {tip.rows.length > 0 && (
        <ul className={keyed ? 'chart-tooltip__rows chart-tooltip__rows--keyed' : 'chart-tooltip__rows'}>
          {tip.rows.map((row) => (
            <li key={row.key} className={row.active ? 'chart-tooltip__row is-active' : 'chart-tooltip__row'}>
              {keyed && (
                <span
                  className={row.marker ? `chart-tooltip__key chart-tooltip__key--${row.marker}` : 'chart-tooltip__key'}
                  style={row.color ? { background: row.color } : undefined}
                  aria-hidden="true"
                />
              )}
              <span className="chart-tooltip__value">
                {row.value}
                {row.share && <small className="chart-tooltip__share"> {row.share}</small>}
              </span>
              <span className="chart-tooltip__label">{row.label}</span>
            </li>
          ))}
        </ul>
      )}
      {tip.note && <p className="chart-tooltip__note">{tip.note}</p>}
    </div>,
    document.body,
  )
}
