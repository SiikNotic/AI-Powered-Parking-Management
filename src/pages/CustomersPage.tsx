import { CalendarPlus, Mail, Pencil, Phone, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/layout/Avatar'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { ReservationForm } from '@/components/forms/ReservationForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { RowMenu } from '@/components/ui/RowMenu'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { reservationTone } from '@/config/reservations'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useI18n } from '@/i18n'
import { customerService, reservationService } from '@/services'
import type { CustomerInput, CustomerSummary, ReservationInput } from '@/types'

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; customer: CustomerSummary }
  | { kind: 'detail'; customerId: string }
  | { kind: 'delete'; customer: CustomerSummary }
  | { kind: 'reserve'; customerId: string }
  | null

export function CustomersPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { locations, activeLocation } = useSession()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const customers = useAsync(() => customerService.list(search), [search], ['customers', 'reservations'])
  const detailId = dialog?.kind === 'detail' ? dialog.customerId : null
  const history = useAsync(() => (detailId ? customerService.getReservations(detailId) : Promise.resolve([])), [detailId], ['reservations'])

  const create = useMutation((input: CustomerInput) => customerService.create(input))
  const update = useMutation((id: string, input: CustomerInput) => customerService.update(id, input))
  const remove = useMutation((id: string) => customerService.delete(id))
  const reserve = useMutation(async (input: Omit<ReservationInput, 'customerId'> & { customerId?: string }, fallbackId: string, newCustomer?: CustomerInput) => {
    const customerId = newCustomer ? (await customerService.create(newCustomer)).id : (input.customerId ?? fallbackId)
    return reservationService.create({ ...input, customerId })
  })

  const data = customers.data
  const detail = detailId ? data?.find((c) => c.id === detailId) : undefined

  return (
    <PageContainer>
      <PageHeader
        description={t('customersPage.description')}
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
            <Plus aria-hidden className="size-4" />
            {t('customersPage.add')}
          </Button>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          label={t('common.search')}
          placeholder={t('customersPage.searchPlaceholder')}
          className="w-full sm:w-80"
        />
      </PageHeader>

      <Card>
        {customers.status === 'error' ? (
          <ErrorState onRetry={customers.retry} />
        ) : !data ? (
          <LoadingState className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </LoadingState>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? t('common.noResults') : t('customersPage.empty')}
            description={search ? undefined : t('customersPage.emptyDescription')}
          />
        ) : (
          <Table label={t('nav.customers')}>
            <thead>
              <tr>
                <Th>{t('customersPage.columns.customer')}</Th>
                <Th>{t('customersPage.columns.contact')}</Th>
                <Th>{t('customersPage.columns.reservations')}</Th>
                <Th>{t('customersPage.columns.spent')}</Th>
                <Th>{t('customersPage.columns.lastVisit')}</Th>
                <Th>
                  <span className="sr-only">{t('common.actions')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="group">
                  <Td>
                    <button type="button" onClick={() => setDialog({ kind: 'detail', customerId: c.id })} className="flex items-center gap-3 text-left">
                      <Avatar name={c.name} className="size-8" />
                      <span className="min-w-0">
                        <span className="block max-w-48 truncate font-semibold text-text hover:underline">{c.name}</span>
                        {c.company && <span className="block max-w-48 truncate text-xs text-text-muted">{c.company}</span>}
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <span className="block max-w-56 truncate">{c.email || '—'}</span>
                    <span className="tabular block text-xs text-text-muted">{c.phone}</span>
                  </Td>
                  <Td>
                    <span className="tabular font-medium text-text">{c.reservationCount}</span>
                    {c.activeReservations > 0 && (
                      <Badge tone="info" className="ml-2">
                        {t('customersPage.active', { count: c.activeReservations })}
                      </Badge>
                    )}
                  </Td>
                  <Td className="tabular font-medium text-text">{fmt.currency(c.totalSpent)}</Td>
                  <Td className="whitespace-nowrap">{c.lastVisit ? fmt.dayMonth(c.lastVisit) : t('customersPage.never')}</Td>
                  <Td className="text-right">
                    <RowMenu
                      name={c.name}
                      actions={[
                        { label: t('common.view'), icon: UserRound, onSelect: () => setDialog({ kind: 'detail', customerId: c.id }) },
                        { label: t('reservationsPage.new'), icon: CalendarPlus, onSelect: () => setDialog({ kind: 'reserve', customerId: c.id }) },
                        { label: t('common.edit'), icon: Pencil, onSelect: () => setDialog({ kind: 'edit', customer: c }) },
                        { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', customer: c }) },
                      ]}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {detail && (
        <Modal
          open
          side
          onClose={() => setDialog(null)}
          title={detail.name}
          description={detail.company}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'edit', customer: detail })}>
                <Pencil aria-hidden className="size-4" />
                {t('common.edit')}
              </Button>
              <Button variant="primary" onClick={() => setDialog({ kind: 'reserve', customerId: detail.id })}>
                <CalendarPlus aria-hidden className="size-4" />
                {t('reservationsPage.new')}
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-sm text-text-secondary">
            {detail.email && (
              <p className="flex items-center gap-2">
                <Mail aria-hidden className="size-4 text-text-muted" />
                <span className="select-all">{detail.email}</span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Phone aria-hidden className="size-4 text-text-muted" />
              <span className="tabular select-all">{detail.phone}</span>
            </p>
            {detail.createdAt && <p className="text-xs text-text-muted">{t('customersPage.memberSince', { date: fmt.dayMonth(detail.createdAt) })}</p>}
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              [t('customersPage.columns.reservations'), String(detail.reservationCount)],
              [t('customersPage.columns.spent'), fmt.currency(detail.totalSpent)],
              [t('customersPage.columns.lastVisit'), detail.lastVisit ? fmt.dayMonth(detail.lastVisit) : t('customersPage.never')],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface-sunken p-3">
                <dt className="eyebrow truncate">{label}</dt>
                <dd className="tabular mt-1 truncate font-display text-sm font-semibold text-text">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="eyebrow mt-6">{t('customersPage.history')}</h3>
          {!history.data ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : history.data.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">{t('customersPage.noHistory')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.data.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">
                      #{r.code} · {t('dashboard.reservations.spaceNumber', { number: r.spaceNumber })}
                    </p>
                    <p className="tabular text-xs text-text-muted">
                      {fmt.dayMonthTime(r.checkIn)} · {fmt.currency(r.total)}
                    </p>
                  </div>
                  <Badge tone={reservationTone[r.status]}>{t(`reservationStatus.${r.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <CustomerForm
          customer={dialog.kind === 'edit' ? dialog.customer : undefined}
          pending={create.pending || update.pending}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            const result =
              dialog.kind === 'edit'
                ? await update.run([dialog.customer.id, input], t('toasts.updated', { item: t('entities.customer') }))
                : await create.run([input], t('toasts.created', { item: t('entities.customer') }))
            if (result) setDialog(dialog.kind === 'edit' ? { kind: 'detail', customerId: dialog.customer.id } : null)
          }}
        />
      )}

      {dialog?.kind === 'reserve' && (
        <ReservationForm
          locations={locations.data ?? []}
          defaultLocationId={activeLocation?.id}
          defaultCustomerId={dialog.customerId}
          pending={reserve.pending}
          onClose={() => setDialog(null)}
          onSubmit={async (input, newCustomer) => {
            const result = await reserve.run([input, dialog.customerId, newCustomer], t('toasts.created', { item: t('entities.reservation') }))
            if (result) setDialog({ kind: 'detail', customerId: dialog.customerId })
          }}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? t('customersPage.deleteTitle', { name: dialog.customer.name }) : ''}
        message={t('customersPage.deleteMessage')}
        confirmLabel={t('common.delete')}
        pending={remove.pending}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return
          await remove.run([dialog.customer.id], t('toasts.deleted', { item: t('entities.customer') }))
          setDialog(null)
        }}
      />
    </PageContainer>
  )
}
