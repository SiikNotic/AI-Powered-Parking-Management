import { memo, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import type { Formatters } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { linearScale, monotonePath, niceMax, type Point } from '@/lib/chart'
import type { OccupancySeries } from '@/types'

const HEIGHT = 248
const TOOLTIP_WIDTH = 176

/** Places the tooltip right of the crosshair, flipping left near the edge. */
function tooltipLeft(x: number, width: number): number {
  const right = x + 12
  if (right + TOOLTIP_WIDTH <= width) return right
  return Math.max(0, x - 12 - TOOLTIP_WIDTH)
}
const MARGIN = { top: 16, right: 12, bottom: 28, left: 36 }

interface OccupancyChartProps {
  series: OccupancySeries
  fmt: Formatters
}

export const OccupancyChart = memo(function OccupancyChart({ series, fmt }: OccupancyChartProps) {
  const { t } = useI18n()
  const gradientId = useId()
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const { points, period, capacity } = series

  const geometry = useMemo(() => {
    if (!width || points.length === 0) return null
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
    const times = points.map((p) => new Date(p.timestamp).getTime())

    let domain: [number, number] = [times[0], times[times.length - 1]]
    if (period === 'today') {
      const start = new Date(points[0].timestamp)
      start.setHours(0, 0, 0, 0)
      domain = [start.getTime(), start.getTime() + 24 * 3_600_000]
    }
    const x = linearScale(domain, [MARGIN.left, MARGIN.left + innerW])
    const yMax = niceMax(capacity)
    const y = linearScale([0, yMax], [MARGIN.top + innerH, MARGIN.top])

    const occupied: Point[] = points.map((p, i) => [x(times[i]), y(p.occupied)])
    const available: Point[] = points.map((p, i) => [x(times[i]), y(p.available)])
    const baseline = y(0)
    const occupiedLine = monotonePath(occupied)
    const occupiedArea = `${occupiedLine}L${occupied[occupied.length - 1][0]},${baseline}L${occupied[0][0]},${baseline}Z`

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f))

    let xTicks: { x: number; label: string }[]
    if (period === 'today') {
      xTicks = [0, 4, 8, 12, 16, 20, 24].map((h) => {
        const ts = domain[0] + h * 3_600_000
        return { x: x(ts), label: fmt.hour(new Date(ts).toISOString()) }
      })
    } else if (period === '7d') {
      xTicks = points.map((p, i) => ({ x: x(times[i]), label: fmt.weekday(p.timestamp) }))
    } else {
      xTicks = points
        .map((p, i) => ({ i, x: x(times[i]), label: fmt.dayMonth(p.timestamp) }))
        .filter(({ i }) => (points.length - 1 - i) % 7 === 0)
    }

    return { innerW, x, y, occupied, available, occupiedLine, occupiedArea, yTicks, xTicks, baseline, times }
  }, [width, points, period, capacity, fmt])

  const labelFor = (iso: string) =>
    period === 'today' ? fmt.time(iso) : `${fmt.weekday(iso)} ${fmt.dayMonth(iso)}`

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    if (!geometry) return
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const px = e.clientX - rect.left
    let nearest = 0
    let best = Infinity
    geometry.occupied.forEach(([x], i) => {
      const d = Math.abs(x - px)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    setActive(nearest)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const last = points.length - 1
    setActive((current) => {
      if (e.key === 'Home') return 0
      if (e.key === 'End') return last
      const base = current ?? last
      return Math.min(last, Math.max(0, base + (e.key === 'ArrowRight' ? 1 : -1)))
    })
  }

  const peak = Math.max(...points.map((p) => p.occupied))
  const average = Math.round(points.reduce((s, p) => s + p.occupied, 0) / (points.length || 1))
  const activePoint = active !== null ? points[active] : null
  const lastIndex = points.length - 1

  return (
    <div>
      <div
        ref={containerRef}
        className="relative rounded-xl"
        tabIndex={0}
        role="group"
        aria-roledescription="chart"
        aria-label={t('dashboard.occupancy.chartLabel', {
          period: t(`dashboard.occupancy.periods.${period}`),
          peak,
          average,
        })}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width="100%" height={HEIGHT} aria-hidden className="block overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--status-occupied)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--status-occupied)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {geometry && (
            <>
              {/* Grid + y-axis labels */}
              {geometry.yTicks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    x2={MARGIN.left + geometry.innerW}
                    y1={geometry.y(tick)}
                    y2={geometry.y(tick)}
                    stroke="var(--border)"
                    strokeDasharray={tick === 0 ? undefined : '2 4'}
                  />
                  <text x={MARGIN.left - 10} y={geometry.y(tick)} dy="0.32em" textAnchor="end" className="tabular fill-text-muted text-[10px]">
                    {tick}
                  </text>
                </g>
              ))}

              {/* Capacity reference */}
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + geometry.innerW}
                y1={geometry.y(capacity)}
                y2={geometry.y(capacity)}
                stroke="var(--text-muted)"
                strokeOpacity="0.5"
                strokeDasharray="1 3"
              />

              {/* X-axis labels */}
              {geometry.xTicks.map((tick, i) => (
                <text
                  key={`${tick.label}-${i}`}
                  x={tick.x}
                  y={HEIGHT - 8}
                  textAnchor={i === 0 && period === 'today' ? 'start' : i === geometry.xTicks.length - 1 && period === 'today' ? 'end' : 'middle'}
                  className="fill-text-muted text-[10px]"
                >
                  {tick.label}
                </text>
              ))}

              {/* Series */}
              <path d={geometry.occupiedArea} fill={`url(#${gradientId})`} />
              <path d={geometry.occupiedLine} fill="none" stroke="var(--status-occupied)" strokeWidth={2} strokeLinecap="round" />
              <path
                d={monotonePath(geometry.available)}
                fill="none"
                stroke="var(--status-available)"
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
              />

              {/* "Now" marker + direct labels on the latest point */}
              {active === null && (
                <g>
                  {period === 'today' && (
                    <line
                      x1={geometry.occupied[lastIndex][0]}
                      x2={geometry.occupied[lastIndex][0]}
                      y1={MARGIN.top}
                      y2={geometry.baseline}
                      stroke="var(--text-muted)"
                      strokeOpacity="0.4"
                      strokeDasharray="2 3"
                    />
                  )}
                  {(['occupied', 'available'] as const).map((key) => {
                    const [px, py] = geometry[key][lastIndex]
                    const value = points[lastIndex][key]
                    const other = geometry[key === 'occupied' ? 'available' : 'occupied'][lastIndex][1]
                    const above = py <= other
                    return (
                      <g key={key}>
                        <circle cx={px} cy={py} r={4.5} fill={`var(--status-${key})`} stroke="var(--surface)" strokeWidth={2} />
                        <text
                          x={px - 8}
                          y={py + (above ? -10 : 18)}
                          textAnchor="end"
                          className="tabular fill-text text-[11px] font-semibold"
                        >
                          {value}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )}

              {/* Hover crosshair */}
              {active !== null && (
                <g>
                  <line
                    x1={geometry.occupied[active][0]}
                    x2={geometry.occupied[active][0]}
                    y1={MARGIN.top}
                    y2={geometry.baseline}
                    stroke="var(--text-muted)"
                    strokeOpacity="0.6"
                  />
                  {(['available', 'occupied'] as const).map((key) => (
                    <circle
                      key={key}
                      cx={geometry[key][active][0]}
                      cy={geometry[key][active][1]}
                      r={4.5}
                      fill={`var(--status-${key})`}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}

              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={geometry.innerW}
                height={HEIGHT - MARGIN.top - MARGIN.bottom}
                fill="transparent"
                onPointerMove={onPointerMove}
                onPointerLeave={() => setActive(null)}
              />
            </>
          )}
        </svg>

        {geometry && activePoint && active !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-44 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs shadow-pop"
            style={{ left: tooltipLeft(geometry.occupied[active][0], width) }}
          >
            <p className="mb-1.5 font-semibold text-text">{labelFor(activePoint.timestamp)}</p>
            <p className="flex items-center justify-between gap-3 text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-3 rounded-full bg-occupied" />
                {t('status.occupied')}
              </span>
              <span className="tabular font-semibold text-text">{activePoint.occupied}</span>
            </p>
            <p className="mt-1 flex items-center justify-between gap-3 text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-3 rounded-full border-t-2 border-dashed border-available" />
                {t('status.available')}
              </span>
              <span className="tabular font-semibold text-text">{activePoint.available}</span>
            </p>
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {activePoint
            ? `${labelFor(activePoint.timestamp)}: ${t('status.occupied')} ${activePoint.occupied}, ${t('status.available')} ${activePoint.available}`
            : ''}
        </p>
      </div>

      <table className="sr-only">
        <caption>{t('dashboard.occupancy.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('dashboard.occupancy.time')}</th>
            <th scope="col">{t('status.occupied')}</th>
            <th scope="col">{t('status.available')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.timestamp}>
              <th scope="row">{labelFor(p.timestamp)}</th>
              <td>{p.occupied}</td>
              <td>{p.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
