import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { SPACE_STATUSES, statusVisuals } from '@/config/status'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ParkingLocation, ParkingSpace as ParkingSpaceModel, SpaceStatus } from '@/types'
import { OccupancyDial, type StatusCounts } from './OccupancyDial'
import { ParkingMap } from './ParkingMap'

interface ParkingStatusProps {
  spaces: AsyncResult<ParkingSpaceModel[]>
  locations: ParkingLocation[]
  onSelectSpace?: (space: ParkingSpaceModel) => void
  className?: string
}

function countByStatus(spaces: ParkingSpaceModel[]): StatusCounts {
  const counts: StatusCounts = { total: spaces.length, available: 0, occupied: 0, reserved: 0, maintenance: 0, disabled: 0 }
  for (const space of spaces) counts[space.status] += 1
  return counts
}

export function ParkingStatus({ spaces, locations, onSelectSpace, className }: ParkingStatusProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [filter, setFilter] = useState<SpaceStatus | null>(null)
  const data = spaces.data
  const counts = useMemo(() => countByStatus(data ?? []), [data])

  const inService = counts.total - counts.maintenance - counts.disabled
  const rate = inService ? (counts.occupied + counts.reserved) / inService : 0
  const toggle = (status: SpaceStatus) => setFilter((f) => (f === status ? null : status))

  return (
    <Card className={className} labelledBy="live-title">
      <CardHeader
        id="live-title"
        title={t('dashboard.live.title')}
        subtitle={t('dashboard.live.subtitle')}
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-available-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-available-ink">
            <span aria-hidden className="size-1.5 rounded-full bg-available [animation:live-pulse_2s_ease-out_infinite]" />
            {t('dashboard.live.liveIndicator')}
          </span>
        }
      />

      {spaces.status === 'error' ? (
        <ErrorState onRetry={spaces.retry} />
      ) : !data ? (
        <LoadingState>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Skeleton className="mx-auto size-[168px] rounded-full sm:mx-0" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          </div>
          <Skeleton className="mt-6 h-48 w-full" />
        </LoadingState>
      ) : data.length === 0 ? (
        <EmptyState title={t('states.noLocationsTitle')} description={t('states.noLocationsDescription')} />
      ) : (
        <>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <OccupancyDial counts={counts} formattedRate={fmt.percent(rate)} />
            <div className="grid flex-1 grid-cols-2 gap-2.5" role="group" aria-label={t('dashboard.live.filterBy')}>
              <button
                type="button"
                aria-pressed={filter === null}
                onClick={() => setFilter(null)}
                className={cn(
                  'rounded-2xl border p-3 text-left transition-colors',
                  filter === null ? 'border-border-strong bg-surface-raised' : 'border-transparent bg-surface-sunken/60 hover:bg-surface-hover',
                )}
              >
                <span className="eyebrow">{t('dashboard.live.total')}</span>
                <span className="tabular mt-1 block font-display text-2xl font-semibold text-text">{fmt.number(counts.total)}</span>
              </button>
              {(['available', 'occupied', 'reserved'] as const).map((status) => {
                const Icon = statusVisuals[status].icon
                const active = filter === status
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(status)}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-colors',
                      active ? 'border-border-strong bg-surface-raised' : 'border-transparent bg-surface-sunken/60 hover:bg-surface-hover',
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={cn('flex size-4 items-center justify-center rounded-full', statusVisuals[status].dot)}>
                        <Icon aria-hidden className="size-2.5 text-white" strokeWidth={3} />
                      </span>
                      <span className="eyebrow">{t(`status.${status}`)}</span>
                    </span>
                    <span className="tabular mt-1 block font-display text-2xl font-semibold text-text">{fmt.number(counts[status])}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend — doubles as a filter, every status has icon + label */}
          <div className="mt-6 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('dashboard.live.legend')}>
            {SPACE_STATUSES.map((status) => {
              const visual = statusVisuals[status]
              const Icon = visual.icon
              const active = filter === status
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(status)}
                  title={t(`status.description.${status}`)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
                    active ? cn(visual.badge, 'border-current') : 'border-border text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {t(`status.${status}`)}
                  <span className="tabular text-text-muted">{counts[status]}</span>
                </button>
              )
            })}
            {filter && (
              <button type="button" onClick={() => setFilter(null)} className="ml-1 h-7 rounded-full px-2 text-xs font-medium text-brand-ink hover:underline">
                {t('dashboard.live.showAll')}
              </button>
            )}
          </div>

          <ParkingMap
            spaces={data}
            locations={locations}
            isHighlighted={filter ? (space) => space.status === filter : undefined}
            onSelect={onSelectSpace}
            className="mt-4 max-h-[30rem]"
          />
          {filter && counts[filter] === 0 && (
            <p className="mt-2 text-center text-xs text-text-muted">{t('dashboard.live.emptyFilter')}</p>
          )}
        </>
      )}
    </Card>
  )
}
