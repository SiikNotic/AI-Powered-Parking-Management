import { ArrowRight, CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { ROUTES } from '@/config/navigation'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat, type Formatters } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { Reservation, ReservationStatus } from '@/types'

const statusTone: Record<ReservationStatus, BadgeTone> = {
  confirmed: 'success',
  pending: 'warning',
  checked_in: 'info',
  cancelled: 'neutral',
}

interface ReservationTableProps {
  reservations: AsyncResult<Reservation[]>
  className?: string
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function DateCell({ iso, fmt, now }: { iso: string; fmt: Formatters; now: Date }) {
  const today = isSameDay(new Date(iso), now)
  return (
    <time dateTime={iso} className="tabular block">
      <span className="block text-text">{fmt.time(iso)}</span>
      {!today && <span className="block text-xs text-text-muted">{fmt.dayMonth(iso)}</span>}
    </time>
  )
}

export function ReservationTable({ reservations, className }: ReservationTableProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [now] = useState(() => new Date())

  return (
    <Card className={className} labelledBy="reservations-title">
      <CardHeader
        id="reservations-title"
        title={t('dashboard.reservations.title')}
        subtitle={t('dashboard.reservations.subtitle')}
        action={
          <LinkButton to={ROUTES.reservations} variant="ghost" size="sm">
            {t('dashboard.reservations.viewAll')}
            <ArrowRight aria-hidden className="size-3.5" />
          </LinkButton>
        }
      />
      {reservations.status === 'error' ? (
        <ErrorState onRetry={reservations.retry} />
      ) : !reservations.data ? (
        <LoadingState className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </LoadingState>
      ) : reservations.data.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('dashboard.reservations.empty')} description={t('dashboard.reservations.emptyDescription')} />
      ) : (
        <>
          {/* Tablet & desktop: table */}
          <div className="-mx-2 hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left text-[0.8125rem]">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[21%]" />
                <col className="w-[17%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  {(['reservation', 'customer', 'vehicle', 'space', 'checkIn', 'checkOut', 'status'] as const).map((key) => (
                    <th key={key} scope="col" className="eyebrow truncate border-b border-border px-2 pb-3 font-semibold">
                      {t(`dashboard.reservations.columns.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.data.map((r) => (
                  <tr key={r.id} className="group">
                    <td className="tabular border-b border-border px-2 py-3 font-semibold text-text group-last:border-0">#{r.code}</td>
                    <td className="border-b border-border px-2 py-3 group-last:border-0">
                      <span className="block truncate font-medium text-text">{r.customer.name}</span>
                      {r.customer.company && <span className="block truncate text-xs text-text-muted">{r.customer.company}</span>}
                    </td>
                    <td className="truncate border-b border-border px-2 py-3 text-text-secondary group-last:border-0">{t(`vehicle.${r.vehicleType}`)}</td>
                    <td className="tabular border-b border-border px-2 py-3 text-text-secondary group-last:border-0">
                      {t('dashboard.reservations.spaceNumber', { number: r.spaceNumber })}
                    </td>
                    <td className="border-b border-border px-2 py-3 group-last:border-0"><DateCell iso={r.checkIn} fmt={fmt} now={now} /></td>
                    <td className="border-b border-border px-2 py-3 group-last:border-0"><DateCell iso={r.checkOut} fmt={fmt} now={now} /></td>
                    <td className="border-b border-border px-2 py-3 group-last:border-0">
                      <Badge tone={statusTone[r.status]}>{t(`reservationStatus.${r.status}`)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards (no horizontal scroll) */}
          <ul className="space-y-2.5 md:hidden">
            {reservations.data.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface-raised p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="tabular text-xs font-semibold text-text-muted">#{r.code}</p>
                    <p className="truncate text-sm font-semibold text-text">{r.customer.name}</p>
                  </div>
                  <Badge tone={statusTone[r.status]}>{t(`reservationStatus.${r.status}`)}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-text-muted">{t('dashboard.reservations.columns.vehicle')}</dt>
                    <dd className="font-medium text-text">{t(`vehicle.${r.vehicleType}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">{t('dashboard.reservations.columns.space')}</dt>
                    <dd className="font-medium text-text">{t('dashboard.reservations.spaceNumber', { number: r.spaceNumber })}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">{t('dashboard.reservations.columns.checkIn')}</dt>
                    <dd className="font-medium"><DateCell iso={r.checkIn} fmt={fmt} now={now} /></dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">{t('dashboard.reservations.columns.checkOut')}</dt>
                    <dd className="font-medium"><DateCell iso={r.checkOut} fmt={fmt} now={now} /></dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
