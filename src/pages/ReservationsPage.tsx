import { CalendarClock, Plus } from 'lucide-react'
import { useState } from 'react'
import { ReservationActions } from '@/components/forms/ReservationActions'
import { ReservationForm } from '@/components/forms/ReservationForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { reservationTone } from '@/config/reservations'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useInitialQueryParam } from '@/hooks/useQueryFlag'
import { useReservationActions } from '@/hooks/useReservationActions'
import { useI18n } from '@/i18n'
import { customerService, reservationService, type ReservationView } from '@/services'
import type { CustomerInput, ReservationInput } from '@/types'

const VIEWS: ReservationView[] = ['upcoming', 'active', 'past', 'all']

export function ReservationsPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { selectedLocation, locations, activeLocation } = useSession()
  const [view, setView] = useState<ReservationView>('upcoming')
  const [search, setSearch] = useState('')
  const openNew = useInitialQueryParam('new')
  const [creating, setCreating] = useState(Boolean(openNew))
  const reservations = useAsync(
    () => reservationService.list({ location: selectedLocation, view, search }),
    [selectedLocation, view, search],
    ['reservations', 'customers'],
  )
  const actions = useReservationActions()

  const create = useMutation(async (input: Omit<ReservationInput, 'customerId'> & { customerId?: string }, newCustomer?: CustomerInput) => {
    const customerId = newCustomer ? (await customerService.create(newCustomer)).id : input.customerId!
    return reservationService.create({ ...input, customerId })
  })

  const allLocations = locations.data ?? []
  const nameOf = (id: string) => allLocations.find((l) => l.id === id)?.name ?? ''
  const data = reservations.data

  return (
    <PageContainer>
      <PageHeader
        description={t('reservationsPage.description')}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)} disabled={!allLocations.length}>
            <Plus aria-hidden className="size-4" />
            {t('reservationsPage.new')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label={t('reservationsPage.viewLabel')}
            value={view}
            onChange={setView}
            options={VIEWS.map((v) => ({ value: v, label: t(`reservationsPage.views.${v}`) }))}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            label={t('common.search')}
            placeholder={t('reservationsPage.searchPlaceholder')}
            className="w-full sm:w-72"
          />
        </div>
      </PageHeader>

      <Card>
        {reservations.status === 'error' ? (
          <ErrorState onRetry={reservations.retry} />
        ) : !data ? (
          <LoadingState className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </LoadingState>
        ) : data.length === 0 ? (
          <EmptyState icon={CalendarClock} title={search ? t('common.noResults') : t(`reservationsPage.empty.${view}`)} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table label={t('nav.reservations')}>
                <thead>
                  <tr>
                    <Th>{t('dashboard.reservations.columns.reservation')}</Th>
                    <Th>{t('dashboard.reservations.columns.customer')}</Th>
                    <Th>{t('dashboard.reservations.columns.vehicle')}</Th>
                    <Th>{t('dashboard.reservations.columns.space')}</Th>
                    <Th>{t('dashboard.reservations.columns.checkIn')}</Th>
                    <Th>{t('dashboard.reservations.columns.checkOut')}</Th>
                    <Th>{t('reservationsPage.columns.total')}</Th>
                    <Th>{t('dashboard.reservations.columns.status')}</Th>
                    <Th>
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="group">
                      <Td className="tabular font-semibold text-text">#{r.code}</Td>
                      <Td>
                        <span className="block max-w-44 truncate font-medium text-text">{r.customer.name}</span>
                        {r.customer.company && <span className="block max-w-44 truncate text-xs text-text-muted">{r.customer.company}</span>}
                      </Td>
                      <Td className="whitespace-nowrap">{t(`vehicle.${r.vehicleType}`)}</Td>
                      <Td>
                        <span className="tabular block whitespace-nowrap">{t('dashboard.reservations.spaceNumber', { number: r.spaceNumber })}</span>
                        {!activeLocation && <span className="block max-w-40 truncate text-xs text-text-muted">{nameOf(r.locationId)}</span>}
                      </Td>
                      <Td className="tabular whitespace-nowrap">{fmt.dayMonthTime(r.checkIn)}</Td>
                      <Td className="tabular whitespace-nowrap">{fmt.dayMonthTime(r.checkOut)}</Td>
                      <Td className="tabular font-medium text-text">{fmt.currency(r.total)}</Td>
                      <Td>
                        <Badge tone={reservationTone[r.status]}>{t(`reservationStatus.${r.status}`)}</Badge>
                      </Td>
                      <Td>
                        <ReservationActions reservation={r} busy={actions.busyId === r.id} onAction={actions.onAction} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="space-y-2.5 md:hidden">
              {data.map((r) => (
                <li key={r.id} className="rounded-2xl border border-glass-border bg-surface-hover p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="tabular text-xs font-semibold text-text-muted">#{r.code}</p>
                      <p className="truncate text-sm font-semibold text-text">{r.customer.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {t('dashboard.reservations.spaceNumber', { number: r.spaceNumber })} · {t(`vehicle.${r.vehicleType}`)}
                        {!activeLocation && ` · ${nameOf(r.locationId)}`}
                      </p>
                    </div>
                    <Badge tone={reservationTone[r.status]}>{t(`reservationStatus.${r.status}`)}</Badge>
                  </div>
                  <p className="tabular mt-2 text-xs text-text-secondary">
                    {fmt.dayMonthTime(r.checkIn)} → {fmt.dayMonthTime(r.checkOut)} · <span className="font-semibold text-text">{fmt.currency(r.total)}</span>
                  </p>
                  <div className="mt-3">
                    <ReservationActions reservation={r} busy={actions.busyId === r.id} onAction={actions.onAction} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {creating && (
        <ReservationForm
          locations={allLocations}
          defaultLocationId={activeLocation?.id}
          pending={create.pending}
          onClose={() => setCreating(false)}
          onSubmit={async (input, newCustomer) => {
            const result = await create.run([input, newCustomer], t('toasts.created', { item: t('entities.reservation') }))
            if (result) {
              setCreating(false)
              setView('upcoming')
            }
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(actions.toCancel)}
        title={actions.toCancel ? t('reservationsPage.cancelTitle', { code: actions.toCancel.code }) : ''}
        message={t('reservationsPage.cancelMessage')}
        confirmLabel={t('reservationsPage.actions.cancel')}
        cancelLabel={t('reservationsPage.keep')}
        pending={actions.cancelPending}
        onClose={actions.dismissCancel}
        onConfirm={actions.confirmCancel}
      />
    </PageContainer>
  )
}
