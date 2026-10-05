import { useState } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { linearScale, niceMax } from '@/lib/chart'
import { ChartTooltip } from './ChartTooltip'

export interface StackedSeries {
  key: string
  label: string
  color: string
}

export interface StackedDatum {
  key: string
  label: string
  /** Long label for the tooltip. */
  title: string
  values: Record<string, number>
}

interface StackedBarChartProps {
  data: StackedDatum[]
  series: StackedSeries[]
  format: (value: number) => string
  height?: number
  label: string
}

/** Stacked daily bars (e.g. harvest by species) with an accessible table fallback. */
export function StackedBarChart({ data, series, format, height = 200, label }: StackedBarChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const totals = data.map((d) => series.reduce((s, ser) => s + (d.values[ser.key] ?? 0), 0))
  const max = niceMax(Math.max(1, ...totals))
  const left = 36
  const bottom = 22
  const plotW = Math.max(0, width - left)
  const plotH = height - bottom - 8
  const y = linearScale([0, max], [plotH + 8, 8])
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(3, Math.min(26, slot * 0.62))
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 44)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f)

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
              <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[10px] tabular">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = left + slot * i + slot / 2
            let acc = 0
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)}>
                <rect x={left + slot * i} y={0} width={slot} height={plotH + 8} fill={hover === i ? 'var(--surface-2)' : 'transparent'} />
                {series.map((s) => {
                  const v = d.values[s.key] ?? 0
                  if (!v) return null
                  const y0 = y(acc)
                  acc += v
                  const y1 = y(acc)
                  return <rect key={s.key} x={cx - barW / 2} y={y1} width={barW} height={Math.max(0.5, y0 - y1)} fill={s.color} rx={1.5} />
                })}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-text-muted text-[10px]">
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip
          x={left + slot * hover + slot / 2}
          width={width}
          title={`${data[hover].title} · ${format(totals[hover])}`}
          rows={series.filter((s) => data[hover].values[s.key]).map((s) => ({ label: s.label, value: format(data[hover].values[s.key]), color: s.color }))}
        />
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{format(totals[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
