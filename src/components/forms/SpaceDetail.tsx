import { Pencil, Trash2 } from 'lucide-react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { reservationTone } from '@/config/reservations'
import { SPACE_STATUSES, statusVisuals } from '@/config/status'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { reservationService } from '@/services'
import type { ParkingLocation, ParkingSpace, SpaceStatus } from '@/types'

interface SpaceDetailProps {
  space: ParkingSpace
  location?: ParkingLocation
  pending: boolean
  onClose: () => void
  onStatus: (status: SpaceStatus) => void
  onEdit: () => void
  onDelete: () => void
}

/** Quick view of one space: details, current reservation and status shortcuts. */
export function SpaceDetail({ space, location, pending, onClose, onStatus, onEdit, onDelete }: SpaceDetailProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const reservations = useAsync(() => reservationService.list({ location: space.locationId }), [space.locationId], ['reservations'])
  const current = reservations.data?.find((r) => r.spaceId === space.id && ['checked_in', 'confirmed', 'pending'].includes(r.status))

  const rows: [string, string][] = [
    [t('common.location'), location?.name ?? '—'],
    [t('spacesPage.form.zone'), space.zone],
    [t('spacesPage.form.type'), t(`spaceType.${space.type}`)],
    [t('spacesPage.columns.size'), `${space.length} × ${space.width} ft`],
    [t('spacesPage.columns.price'), `${fmt.currency(space.price)}${t(`priceUnit.${space.priceUnit}`)}`],
    [t('spacesPage.columns.vehicles'), space.vehicleTypes.map((v) => t(`vehicle.${v}`)).join(', ')],
    [t('spacesPage.columns.updated'), fmt.relative(space.updatedAt)],
  ]

  return (
    <Modal
      open
      side
      onClose={onClose}
      title={t('spacesPage.detailTitle', { number: space.number })}
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-occupied-ink" onClick={onDelete}>
            <Trash2 aria-hidden className="size-4" />
            {t('common.delete')}
          </Button>
          <Button variant="secondary" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
            {t('common.edit')}
          </Button>
        </>
      }
    >
      <StatusBadge status={space.status} className="px-2.5 py-1 text-xs" />

      <dl className="mt-5 divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-right font-medium text-text">{value}</dd>
          </div>
        ))}
      </dl>

      {current && (
        <section className="mt-5 rounded-2xl bg-surface-sunken p-4" aria-label={t('spacesPage.currentReservation')}>
          <p className="eyebrow">{t('spacesPage.currentReservation')}</p>
          <div className="mt-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">{current.customer.name}</p>
              <p className="text-xs text-text-muted">
                #{current.code} · {fmt.dayMonthTime(current.checkIn)} → {fmt.dayMonthTime(current.checkOut)}
              </p>
            </div>
            <Badge tone={reservationTone[current.status]}>{t(`reservationStatus.${current.status}`)}</Badge>
          </div>
        </section>
      )}

      <fieldset className="mt-6">
        <legend className="eyebrow mb-2">{t('spacesPage.setStatus')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {SPACE_STATUSES.map((status) => {
            const visual = statusVisuals[status]
            const Icon = visual.icon
            const active = space.status === status
            return (
              <button
                key={status}
                type="button"
                disabled={pending || active}
                aria-pressed={active}
                onClick={() => onStatus(status)}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors disabled:cursor-default',
                  active ? cn(visual.badge, 'border-current') : 'border-glass-border bg-surface-hover text-text hover:bg-surface-raised',
                )}
              >
                <Icon aria-hidden className="size-4" />
                {t(`status.${status}`)}
              </button>
            )
          })}
        </div>
      </fieldset>
    </Modal>
  )
}
