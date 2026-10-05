import { memo } from 'react'
import { useI18n } from '@/i18n'
import type { SpaceStatus } from '@/types'

const SIZE = 168
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

export type StatusCounts = Record<SpaceStatus, number> & { total: number }

interface OccupancyDialProps {
  counts: StatusCounts
  formattedRate: string
}

/** Ring showing how the lot is split by status, with occupancy % in the centre. */
export const OccupancyDial = memo(function OccupancyDial({ counts, formattedRate }: OccupancyDialProps) {
  const { t } = useI18n()
  const order: SpaceStatus[] = ['occupied', 'reserved', 'available', 'maintenance', 'disabled']
  const segments = order.map((key) => ({ key, value: counts[key] })).filter((s) => s.value > 0)

  let offset = 0
  return (
    <div className="relative mx-auto size-[168px] shrink-0">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--surface-sunken)" strokeWidth={STROKE} />
        {segments.map((segment) => {
          const length = (segment.value / (counts.total || 1)) * CIRCUMFERENCE
          const dash = Math.max(0, length - GAP)
          const el = (
            <circle
              key={segment.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={`var(--status-${segment.key})`}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += length
          return el
        })}
      </svg>
      <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-surface-raised shadow-[inset_0_1px_8px_rgba(0,0,0,0.06)]">
        <span className="eyebrow text-[0.625rem]">{t('dashboard.live.occupancyRate')}</span>
        <span className="tabular font-display text-[1.875rem] font-semibold leading-tight text-text">{formattedRate}</span>
        <span className="text-[0.6875rem] text-text-muted">{t('dashboard.live.inUse')}</span>
      </div>
    </div>
  )
})
