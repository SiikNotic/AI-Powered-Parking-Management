import { useState } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { linearScale, niceMax } from '@/lib/chart'
import { ChartTooltip } from './ChartTooltip'

export interface FinanceDatum {
  key: string
  label: string
  title: string
  revenue: number
  expenses: number
  profit: number
}

interface FinanceChartProps {
  data: FinanceDatum[]
  labels: { revenue: string; expenses: string; profit: string }
  format: (value: number) => string
  formatAxis: (value: number) => string
  height?: number
  label: string
}

/** Revenue and expense bars per day with the profit line on top. */
export function FinanceChart({ data, labels, format, formatAxis, height = 220, label }: FinanceChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const maxV = niceMax(Math.max(1, ...data.map((d) => Math.max(d.revenue, d.expenses))))
  const minV = Math.min(0, ...data.map((d) => d.profit))
  const lo = minV < 0 ? -niceMax(-minV, 2) : 0
  const left = 46
  const bottom = 22
  const plotW = Math.max(0, width - left)
  const y = linearScale([lo, maxV], [height - bottom, 8])
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(2, Math.min(12, slot * 0.3))
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 48)))
  const ticks = lo < 0 ? [lo, 0, maxV / 2, maxV] : [0, maxV / 4, maxV / 2, (maxV * 3) / 4, maxV]
  const cx = (i: number) => left + slot * i + slot / 2
  // Straight segments: daily profit is discrete, so no smoothing between days.
  const profitPath = data.map((d, i) => `${i ? 'L' : 'M'}${cx(i)},${y(d.profit)}`).join('')

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={width} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--border-strong)' : 'var(--grid)'} />
              <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[10px] tabular">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => (
            <g key={d.key} onMouseEnter={() => setHover(i)}>
              <rect x={left + slot * i} y={0} width={slot} height={height - bottom} fill={hover === i ? 'var(--surface-2)' : 'transparent'} />
              <rect x={cx(i) - barW - 1} y={y(d.revenue)} width={barW} height={Math.max(0, y(0) - y(d.revenue))} fill="var(--chart-revenue)" rx={1.5} />
              <rect x={cx(i) + 1} y={y(d.expenses)} width={barW} height={Math.max(0, y(0) - y(d.expenses))} fill="var(--chart-expense)" rx={1.5} />
              {i % labelEvery === 0 && (
                <text x={cx(i)} y={height - 6} textAnchor="middle" className="fill-text-muted text-[10px]">
                  {d.label}
                </text>
              )}
            </g>
          ))}
          <path d={profitPath} fill="none" stroke="var(--chart-profit)" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
          {hover !== null && data[hover] && <circle cx={cx(hover)} cy={y(data[hover].profit)} r={3.5} fill="var(--chart-profit)" stroke="var(--surface)" strokeWidth={2} />}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip
          x={cx(hover)}
          width={width}
          title={data[hover].title}
          rows={[
            { label: labels.revenue, value: format(data[hover].revenue), color: 'var(--chart-revenue)' },
            { label: labels.expenses, value: format(data[hover].expenses), color: 'var(--chart-expense)' },
            { label: labels.profit, value: format(data[hover].profit), color: 'var(--chart-profit)' },
          ]}
        />
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{`${labels.revenue}: ${format(d.revenue)}; ${labels.expenses}: ${format(d.expenses)}; ${labels.profit}: ${format(d.profit)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
