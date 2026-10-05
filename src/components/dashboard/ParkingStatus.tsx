import { useCallback, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { SPACE_STATUSES, statusVisuals } from '@/config/status'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ParkingLocation, ParkingSpace as ParkingSpaceModel, SpaceStatus } from '@/types'
import { OccupancyDial, type StatusCounts } from './OccupancyDial'
import { ParkingSpace } from './ParkingSpace'

interface ParkingStatusProps {
  spaces: AsyncResult<ParkingSpaceModel[]>
  locations: ParkingLocation[]
  className?: string
}

function countByStatus(spaces: ParkingSpaceModel[]): StatusCounts {
  const counts: StatusCounts = { total: spaces.length, available: 0, occupied: 0, reserved: 0, maintenance: 0, disabled: 0 }
  for (const space of spaces) counts[space.status] += 1
  return counts
}

/** Moves focus between map cells with the arrow keys (single tab stop for the whole map). */
function focusNeighbour(e: KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const cells = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-space]'))
  const index = cells.indexOf(document.activeElement as HTMLElement)
  if (index < 0) return
  e.preventDefault()

  let target: HTMLElement | undefined
  if (e.key === 'ArrowRight') target = cells[index + 1]
  else if (e.key === 'ArrowLeft') target = cells[index - 1]
  else if (e.key === 'Home') target = cells[0]
  else if (e.key === 'End') target = cells[cells.length - 1]
  else {
    const current = cells[index].getBoundingClientRect()
    const down = e.key === 'ArrowDown'
    const candidates = cells.filter((cell) => {
      const r = cell.getBoundingClientRect()
      return down ? r.top > current.top + 4 : r.top < current.top - 4
    })
    if (candidates.length) {
      const rowTop = down
        ? Math.min(...candidates.map((c) => c.getBoundingClientRect().top))
        : Math.max(...candidates.map((c) => c.getBoundingClientRect().top))
      target = candidates
        .filter((c) => Math.abs(c.getBoundingClientRect().top - rowTop) < 4)
        .sort((a, b) => Math.abs(a.getBoundingClientRect().left - current.left) - Math.abs(b.getBoundingClientRect().left - current.left))[0]
    }
  }
  if (target) {
    target.focus()
    target.scrollIntoView({ block: 'nearest' })
  }
}

export function ParkingStatus({ spaces, locations, className }: ParkingStatusProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [filter, setFilter] = useState<SpaceStatus | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const data = spaces.data
  const counts = useMemo(() => countByStatus(data ?? []), [data])

  const groups = useMemo(() => {
    if (!data) return []
    return locations
      .map((location) => {
        const own = data.filter((s) => s.locationId === location.id)
        const zones = new Map<string, ParkingSpaceModel[]>()
        for (const space of own) zones.set(space.zone, [...(zones.get(space.zone) ?? []), space])
        return { location, zones: Array.from(zones.entries()), total: own.length }
      })
      .filter((g) => g.total > 0)
  }, [data, locations])

  const onFocusCapture = useCallback((e: FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-space-id]')?.dataset.spaceId
    if (id) setFocusedId(id)
  }, [])

  const inService = counts.total - counts.maintenance - counts.disabled
  const rate = inService ? (counts.occupied + counts.reserved) / inService : 0
  const tabbableId = focusedId ?? data?.[0]?.id
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

          <div
            role="grid"
            aria-label={t('dashboard.live.mapLabel', { location: groups.length > 1 ? t('location.all') : groups[0]?.location.name ?? '' })}
            onKeyDown={focusNeighbour}
            onFocusCapture={onFocusCapture}
            className="scrollbar-thin mt-4 max-h-[30rem] space-y-5 overflow-y-auto rounded-2xl bg-surface-sunken/50 p-3 sm:p-4"
          >
            {groups.map(({ location, zones }) => (
              <div key={location.id} role="rowgroup">
                {groups.length > 1 && (
                  <p className="mb-2 flex items-baseline justify-between gap-2 text-xs font-semibold text-text">
                    <span className="truncate">{location.name}</span>
                    <span className="eyebrow shrink-0">{location.code}</span>
                  </p>
                )}
                <div className="space-y-1.5">
                  {zones.map(([zone, zoneSpaces]) => (
                    <div key={zone} role="row" className="flex items-start gap-2">
                      <span
                        role="rowheader"
                        aria-label={t('dashboard.live.zone', { zone })}
                        className="mt-3 w-4 shrink-0 text-center font-display text-[0.6875rem] font-semibold text-text-muted"
                      >
                        {zone}
                      </span>
                      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                        {zoneSpaces.map((space) => (
                          <div key={space.id} data-space-id={space.id} className="contents">
                            <ParkingSpace
                              space={space}
                              fmt={fmt}
                              dimmed={filter !== null && space.status !== filter}
                              tabbable={space.id === tabbableId}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filter && counts[filter] === 0 && (
              <p className="py-2 text-center text-xs text-text-muted">{t('dashboard.live.emptyFilter')}</p>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
