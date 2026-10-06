import { useState } from 'react'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useElementWidth } from '@/hooks/useElementWidth'
import { linearScale, niceMax } from '@/lib/chart'

export interface PlanActualDatum {
  key: string
  label: string
  title: string
  planned: number
  /** null for weeks that haven't happened yet. */
  actual: number | null
  current: boolean
}

interface PlanActualChartProps {
  data: PlanActualDatum[]
  labels: { planned: string; actual: string }
  format: (value: number) => string
  height?: number
  label: string
}

/** Planned (outlined) vs actual (filled) bars per week, with an accessible table fallback. */
export function PlanActualChart({ data, labels, format, height = 220, label }: PlanActualChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.planned, d.actual ?? 0))))
  const left = 40
  const bottom = 22
  const plotW = Math.max(0, width - left)
  const y = linearScale([0, max], [height - bottom, 8])
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(3, Math.min(16, slot * 0.32))
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 52)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f)
  const cx = (i: number) => left + slot * i + slot / 2

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
          {data.map((d, i) => (
            <g key={d.key} onMouseEnter={() => setHover(i)}>
              {d.current && <rect x={left + slot * i} y={8} width={slot} height={height - bottom - 8} fill="var(--surface-2)" />}
              <rect x={left + slot * i} y={0} width={slot} height={height} fill="transparent" />
              <rect
                x={cx(i) - barW - 1}
                y={y(d.planned)}
                width={barW}
                height={Math.max(0, y(0) - y(d.planned))}
                rx={2}
                fill="var(--info-soft)"
                stroke="var(--info)"
                strokeWidth={1}
              />
              {d.actual !== null && <rect x={cx(i) + 1} y={y(d.actual)} width={barW} height={Math.max(0, y(0) - y(d.actual))} rx={2} fill="var(--brand)" />}
              {i % labelEvery === 0 && (
                <text x={cx(i)} y={height - 6} textAnchor="middle" className={d.current ? 'fill-text text-[10px] font-semibold' : 'fill-text-muted text-[10px]'}>
                  {d.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip
          x={cx(hover)}
          width={width}
          title={data[hover].title}
          rows={[
            { label: labels.planned, value: format(data[hover].planned), color: 'var(--info)' },
            ...(data[hover].actual !== null ? [{ label: labels.actual, value: format(data[hover].actual ?? 0), color: 'var(--brand)' }] : []),
          ]}
        />
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{labels.planned}</th>
            <th scope="col">{labels.actual}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{format(d.planned)}</td>
              <td>{d.actual === null ? '—' : format(d.actual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
