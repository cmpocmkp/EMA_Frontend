import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { Ratio } from '../../api'
import { formatNumber, formatPercent } from '../../format'

/** One line of a chart tooltip: the figure first, then what it counts. */
export interface TipRow {
  key: string
  /** Keys the line to its mark: a short stroke in the series colour, or a filled or hollow dot. */
  color?: string
  marker?: 'dot' | 'ring'
  value: string
  /** Shown in small type after the value, e.g. "(9.9%)". */
  share?: string
  label: string
  /** The part of the mark under the pointer. */
  active?: boolean
}

export interface Tip {
  title: string
  rows: TipRow[]
  note?: string
}

export interface TipPlacement {
  tip: Tip
  x: number
  y: number
  /** Beside a mouse pointer, or centred above a tap or a focused mark. */
  mode: 'pointer' | 'above'
  /** Where an 'above' tooltip goes instead when there is no room above. */
  below: number
}

/** A count with its share of the base, e.g. "134 (9.9%)" and "of 1,355 schools have an IT lab". */
export function ratioRow(key: string, ratio: Ratio, describe: (total: string) => string): TipRow {
  return {
    key,
    value: formatNumber(ratio.value),
    share: ratio.total ? `(${formatPercent(ratio)})` : undefined,
    label: describe(formatNumber(ratio.total)),
  }
}

/** A tooltip, or one built from the element under the pointer, such as a single segment of a bar. */
type TipSource = Tip | ((target: Element) => Tip)

const resolve = (source: TipSource, target: EventTarget) =>
  typeof source === 'function' ? source(target as Element) : source

/**
 * Tooltips for a chart's marks on hover, tap and keyboard focus. The chart is a single Tab stop;
 * arrow keys move between its marks, up and down by `columns` at a time.
 */
export function useChartTooltip(columns = 1) {
  const id = useId()
  const [placement, setPlacement] = useState<TipPlacement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const lastPointer = useRef('mouse')
  const open = placement !== null

  function show(index: number, next: TipPlacement) {
    setActiveIndex(index)
    setPlacement(next)
  }

  function hide() {
    setActiveIndex(null)
    setPlacement(null)
  }

  useEffect(() => {
    if (!open) return
    const close = () => {
      setActiveIndex(null)
      setPlacement(null)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    // A tap has no pointer leave, so the next tap anywhere closes it.
    const closeOnTap = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'mouse') close()
    }
    // The tooltip is fixed to the window, so it would drift away from its mark on scroll.
    window.addEventListener('scroll', close, { capture: true, passive: true })
    window.addEventListener('resize', close)
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnTap, { capture: true })
    return () => {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnTap, { capture: true })
    }
  }, [open])

  /** Props for the mark at `index`, counted along rows. */
  function itemProps(index: number, source: TipSource) {
    return {
      'data-chart-item': index,
      tabIndex: index === focusIndex ? 0 : -1,
      'aria-describedby': open && activeIndex === index ? id : undefined,
      onPointerDown: (event: PointerEvent) => {
        lastPointer.current = event.pointerType
      },
      onPointerMove: (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        show(index, { tip: resolve(source, event.target), x: event.clientX, y: event.clientY, mode: 'pointer', below: 0 })
      },
      onPointerLeave: (event: PointerEvent) => {
        if (event.pointerType === 'mouse') hide()
      },
      onClick: (event: MouseEvent) => {
        if (lastPointer.current === 'mouse') return
        // Above the finger, so it isn't covered.
        show(index, {
          tip: resolve(source, event.target),
          x: event.clientX,
          y: event.clientY - 16,
          mode: 'above',
          below: event.clientY + 32,
        })
      },
      onFocus: (event: FocusEvent<HTMLElement>) => {
        setFocusIndex(index)
        // Keyboard focus only; clicks and taps are handled above.
        if (!event.currentTarget.matches(':focus-visible')) return
        const rect = event.currentTarget.getBoundingClientRect()
        show(index, {
          tip: resolve(source, event.currentTarget),
          x: rect.left + rect.width / 2,
          y: rect.top,
          mode: 'above',
          below: rect.bottom,
        })
      },
      onBlur: hide,
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }
    const step = steps[event.key]
    const current = (event.target as HTMLElement).dataset.chartItem
    if (step === undefined || current === undefined) return
    const next = event.currentTarget.querySelector<HTMLElement>(`[data-chart-item="${Number(current) + step}"]`)
    if (!next) return
    event.preventDefault()
    next.focus()
  }

  return { id, placement, activeIndex, itemProps, onKeyDown }
}
