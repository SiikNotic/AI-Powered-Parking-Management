import { useCallback, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ParkingLocation, ParkingSpace as ParkingSpaceModel } from '@/types'
import { ParkingSpace } from './ParkingSpace'

interface ParkingMapProps {
  spaces: ParkingSpaceModel[]
  locations: ParkingLocation[]
  /** Spaces that don't match are dimmed, so the layout of the lot stays readable. */
  isHighlighted?: (space: ParkingSpaceModel) => boolean
  onSelect?: (space: ParkingSpaceModel) => void
  className?: string
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
      const tops = candidates.map((c) => c.getBoundingClientRect().top)
      const rowTop = down ? Math.min(...tops) : Math.max(...tops)
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

/** Simplified lot map: one row per zone, grouped by location. */
export function ParkingMap({ spaces, locations, isHighlighted, onSelect, className }: ParkingMapProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const groups = useMemo(
    () =>
      locations
        .map((location) => {
          const own = spaces.filter((s) => s.locationId === location.id).sort((a, b) => a.number - b.number)
          const zones = new Map<string, ParkingSpaceModel[]>()
          for (const space of own) zones.set(space.zone, [...(zones.get(space.zone) ?? []), space])
          return { location, zones: Array.from(zones.entries()).sort(([a], [b]) => a.localeCompare(b)), total: own.length }
        })
        .filter((g) => g.total > 0),
    [spaces, locations],
  )

  const onFocusCapture = useCallback((e: FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-space-id]')?.dataset.spaceId
    if (id) setFocusedId(id)
  }, [])

  const firstId = groups[0]?.zones[0]?.[1][0]?.id
  const tabbableId = focusedId && spaces.some((s) => s.id === focusedId) ? focusedId : firstId

  return (
    <div
      role="grid"
      aria-label={t('dashboard.live.mapLabel', { location: groups.length > 1 ? t('location.all') : groups[0]?.location.name ?? '' })}
      onKeyDown={focusNeighbour}
      onFocusCapture={onFocusCapture}
      className={cn('scrollbar-thin space-y-5 overflow-y-auto rounded-2xl bg-surface-sunken p-3 sm:p-4', className)}
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
                        dimmed={isHighlighted ? !isHighlighted(space) : false}
                        tabbable={space.id === tabbableId}
                        onSelect={onSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
