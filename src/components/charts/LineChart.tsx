import { useState } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { linearScale, monotonePath } from '@/lib/chart'
import { ChartTooltip } from './ChartTooltip'

interface LinePoint {
  t: string
  value: number
}

interface LineChartProps {
  points: LinePoint[]
  band: { min: number; max: number }
  format: (value: number) => string
  formatTime: (iso: string) => string
  bandLabel: string
  height?: number
  label: string
}

/** Time series with the target band shaded (environmental readings). */
export function LineChart({ points, band, format, formatTime, bandLabel, height = 200, label }: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map((p) => p.value)
  const lo0 = Math.min(band.min, ...values)
  const hi0 = Math.max(band.max, ...values)
  const pad = (hi0 - lo0) * 0.12 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad
  const left = 40
  const bottom = 22
  const plotW = Math.max(0, width - left - 4)
  const x = linearScale([0, Math.max(1, points.length - 1)], [left, left + plotW])
  const y = linearScale([lo, hi], [height - bottom, 8])
  const d = monotonePath(points.map((p, i) => [x(i), y(p.value)]))
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad]
  const labelCount = Math.max(2, Math.floor(plotW / 70))
  const step = Math.max(1, Math.floor(points.length / labelCount))

  const onMove = (clientX: number, rect: DOMRect) => {
    if (!points.length) return
    const i = Math.round(((clientX - rect.left - left) / Math.max(1, plotW)) * (points.length - 1))
    setHover(Math.min(points.length - 1, Math.max(0, i)))
  }

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block" onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}>
          <rect x={left} width={plotW} y={y(band.max)} height={Math.max(0, y(band.min) - y(band.max))} fill="var(--ok-soft)" />
          <text x={left + 6} y={y(band.max) + 12} className="fill-ok-ink text-[10px] font-medium">
            {bandLabel}
          </text>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeDasharray="2 3" />
              <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[10px] tabular">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % step === 0 ? (
              <text key={p.t} x={x(i)} y={height - 6} textAnchor="middle" className="fill-text-muted text-[10px]">
                {formatTime(p.t)}
              </text>
            ) : null,
          )}
          <path d={d} fill="none" stroke="var(--brand)" strokeWidth={1.8} strokeLinejoin="round" />
          {hover !== null && points[hover] && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={8} y2={height - bottom} stroke="var(--border-strong)" />
              <circle cx={x(hover)} cy={y(points[hover].value)} r={3.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hover !== null && points[hover] && (
        <ChartTooltip x={x(hover)} width={width} title={formatTime(points[hover].t)} rows={[{ label, value: format(points[hover].value) }]} />
      )}
    </div>
  )
}
