import type { ReactNode } from 'react'

interface ChartTooltipProps {
  x: number
  width: number
  title: string
  rows: { label: string; value: string; color?: string }[]
  footer?: ReactNode
}

/** Hover readout positioned over a chart, kept inside the chart's bounds. */
export function ChartTooltip({ x, width, title, rows, footer }: ChartTooltipProps) {
  const boxWidth = 176
  const left = Math.min(Math.max(0, x - boxWidth / 2), Math.max(0, width - boxWidth))
  return (
    <div
      className="panel-pop pointer-events-none absolute top-0 z-10 rounded-xl px-3 py-2 text-xs animate-fade-in"
      style={{ left, width: boxWidth }}
      aria-hidden
    >
      <p className="mb-1 font-semibold text-text">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-text-secondary">
            <span className="flex min-w-0 items-center gap-1.5">
              {r.color && <span className="size-2 shrink-0 rounded-sm" style={{ background: r.color }} />}
              <span className="truncate">{r.label}</span>
            </span>
            <span className="tabular font-semibold text-text">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  )
}
