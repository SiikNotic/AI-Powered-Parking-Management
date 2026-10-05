import { memo } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { spaceTypeIcons, statusVisuals } from '@/config/status'
import type { Formatters } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ParkingSpace as ParkingSpaceModel } from '@/types'

interface ParkingSpaceProps {
  space: ParkingSpaceModel
  dimmed: boolean
  fmt: Formatters
  tabbable: boolean
}

/** A single space on the parking map: colour + icon + number, with a descriptive tooltip. */
export const ParkingSpace = memo(function ParkingSpace({ space, dimmed, fmt, tabbable }: ParkingSpaceProps) {
  const { t } = useI18n()
  const visual = statusVisuals[space.status]
  // Occupied spaces show the kind of vehicle the space is built for.
  const Icon = space.status === 'occupied' ? spaceTypeIcons[space.type] : visual.icon
  const statusLabel = t(`status.${space.status}`)
  const details = t('dashboard.live.spaceDetails', {
    type: t(`spaceType.${space.type}`),
    length: space.length,
    width: space.width,
    price: fmt.currency(space.price),
    unit: t(`priceUnit.${space.priceUnit}`),
  })
  const label = `${t('dashboard.live.space', { number: space.number })} · ${statusLabel}`

  return (
    <Tooltip
      className="flex"
      content={
        <>
          <span className="block font-semibold">{label}</span>
          <span className="block opacity-80">{t(`status.description.${space.status}`)}</span>
          <span className="mt-1 block opacity-70">{details}</span>
        </>
      }
    >
      <div
        role="gridcell"
        data-space
        tabIndex={tabbable ? 0 : -1}
        aria-label={`${label}. ${details}`}
        className={cn(
          'flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border text-[0.6875rem] font-semibold transition-[opacity,border-color,filter] duration-150',
          visual.cell,
          dimmed && 'opacity-20',
        )}
      >
        <Icon aria-hidden className="size-3" strokeWidth={2.25} />
        <span className="tabular leading-none">{String(space.number).padStart(2, '0')}</span>
      </div>
    </Tooltip>
  )
})
