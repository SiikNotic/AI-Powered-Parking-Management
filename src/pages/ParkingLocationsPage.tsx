import { Cctv, MapPin, MapPinPlus, Pencil, Plus, SquareParking, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocationForm } from '@/components/forms/LocationForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { ROUTES } from '@/config/navigation'
import { categoryIcons, statusVisuals } from '@/config/status'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useInitialQueryParam } from '@/hooks/useQueryFlag'
import { useI18n } from '@/i18n'
import { cameraService, parkingService } from '@/services'
import type { LocationInput, LocationSetup, ParkingLocation } from '@/types'

type Dialog = { kind: 'create' } | { kind: 'edit'; location: ParkingLocation } | { kind: 'delete'; location: ParkingLocation } | null

export function ParkingLocationsPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const navigate = useNavigate()
  const { locations, setSelectedLocation } = useSession()
  const spaces = useAsync(() => parkingService.getSpaces('all'), [], ['spaces'])
  const cameras = useAsync(() => cameraService.list('all'), [], ['cameras'])
  const openNew = useInitialQueryParam('new')
  const [dialog, setDialog] = useState<Dialog>(openNew ? { kind: 'create' } : null)

  const create = useMutation((input: LocationInput, setup?: LocationSetup) => parkingService.createLocation(input, setup))
  const update = useMutation((id: string, input: LocationInput) => parkingService.updateLocation(id, input))
  const remove = useMutation((id: string) => parkingService.deleteLocation(id))

  const openSpaces = (location: ParkingLocation) => {
    setSelectedLocation(location.id)
    navigate(ROUTES.parkingSpaces)
  }

  const list = locations.data
  return (
    <PageContainer>
      <PageHeader
        description={t('locationsPage.description')}
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
            <Plus aria-hidden className="size-4" />
            {t('locationsPage.add')}
          </Button>
        }
      />

      {locations.status === 'error' ? (
        <ErrorState onRetry={locations.retry} className="glass rounded-card" />
      ) : !list ? (
        <LoadingState className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-60 rounded-card" />)}
        </LoadingState>
      ) : list.length === 0 ? (
        <EmptyState
          icon={MapPinPlus}
          title={t('states.noLocationsTitle')}
          description={t('states.noLocationsDescription')}
          className="glass rounded-card py-20"
          action={
            <Button variant="signature" onClick={() => setDialog({ kind: 'create' })}>
              {t('locationsPage.add')}
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((location) => {
            const own = spaces.data?.filter((s) => s.locationId === location.id) ?? []
            const count = (status: string) => own.filter((s) => s.status === status).length
            const inService = own.length - count('maintenance') - count('disabled')
            const rate = inService ? (count('occupied') + count('reserved')) / inService : 0
            const cameraCount = cameras.data?.filter((c) => c.locationId === location.id).length ?? 0
            const Icon = categoryIcons[location.category]
            return (
              <li key={location.id} className="glass flex flex-col rounded-card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-text">{location.name}</h2>
                      <Badge tone="neutral">{location.code}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{t(`category.${location.category}`)}</p>
                  </div>
                  <RowMenu
                    name={location.name}
                    actions={[
                      { label: t('common.edit'), icon: Pencil, onSelect: () => setDialog({ kind: 'edit', location }) },
                      { label: t('locationsPage.viewSpaces'), icon: SquareParking, onSelect: () => openSpaces(location) },
                      { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', location }) },
                    ]}
                  />
                </div>

                <p className="mt-4 flex items-start gap-1.5 text-sm text-text-secondary">
                  <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-text-muted" />
                  <span>
                    {location.address}
                    <span className="block text-xs text-text-muted">
                      {location.city}, {location.state}
                    </span>
                  </span>
                </p>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="eyebrow">{t('locationsPage.occupancy')}</span>
                    <span className="tabular font-display text-lg font-semibold text-text">{fmt.percent(rate)}</span>
                  </div>
                  <div aria-hidden className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                    {(['occupied', 'reserved', 'available', 'maintenance'] as const).map((status) =>
                      own.length ? (
                        <div key={status} className={statusVisuals[status].dot} style={{ width: `${(count(status) / own.length) * 100}%` }} />
                      ) : null,
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    {(['available', 'occupied', 'reserved'] as const).map((status) => (
                      <div key={status}>
                        <dt className="text-text-muted">{t(`status.${status}`)}</dt>
                        <dd className="tabular font-semibold text-text">{count(status)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <SquareParking aria-hidden className="size-3.5" />
                    {t('location.spaces', { count: location.totalSpaces })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Cctv aria-hidden className="size-3.5" />
                    {cameraCount} {t('locationsPage.cameras').toLowerCase()}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => openSpaces(location)}>
                    {t('locationsPage.viewSpaces')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <LocationForm
          open
          location={dialog.kind === 'edit' ? dialog.location : undefined}
          pending={create.pending || update.pending}
          onClose={() => setDialog(null)}
          onSubmit={async (input, setup) => {
            const result =
              dialog.kind === 'edit'
                ? await update.run([dialog.location.id, input], t('toasts.updated', { item: t('entities.location') }))
                : await create.run([input, setup], t('toasts.created', { item: t('entities.location') }))
            if (result) setDialog(null)
          }}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? t('locationsPage.deleteTitle', { name: dialog.location.name }) : ''}
        message={dialog?.kind === 'delete' ? t('locationsPage.deleteMessage', { spaces: dialog.location.totalSpaces }) : ''}
        confirmLabel={t('common.delete')}
        pending={remove.pending}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return
          await remove.run([dialog.location.id], t('toasts.deleted', { item: t('entities.location') }))
          setDialog(null)
        }}
      />
    </PageContainer>
  )
}
