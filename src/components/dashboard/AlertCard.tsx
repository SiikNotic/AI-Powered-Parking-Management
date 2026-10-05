import { ChevronRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { alertIcons, severityIconClass, severityOrder, severityTone } from '@/config/alerts'
import { ROUTES } from '@/config/navigation'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Alert, AlertType, ParkingLocation } from '@/types'

/** Where each alert type will be resolved once those pages exist. */
const alertTarget: Record<AlertType, string> = {
  camera_offline: ROUTES.cameras,
  space_maintenance: ROUTES.parkingSpaces,
  high_occupancy: ROUTES.parkingLocations,
  payment_issue: ROUTES.reservations,
  reservation_conflict: ROUTES.reservations,
}

interface AlertCardProps {
  alerts: AsyncResult<Alert[]>
  locations: ParkingLocation[]
  className?: string
}

export function AlertCard({ alerts, locations, className }: AlertCardProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name ?? ''
  const sorted = alerts.data ? [...alerts.data].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) : undefined

  return (
    <Card className={cn('flex flex-col', className)} labelledBy="attention-title">
      <div id="attention" tabIndex={-1} className="scroll-mt-28 focus:outline-none" />
      <CardHeader
        id="attention-title"
        title={t('dashboard.alerts.title')}
        subtitle={
          sorted
            ? sorted.length === 1
              ? t('dashboard.alerts.subtitleOne')
              : t('dashboard.alerts.subtitle', { count: sorted.length })
            : undefined
        }
        action={
          sorted && sorted.length > 0 ? (
            <span className="tabular flex size-7 items-center justify-center rounded-full bg-occupied text-xs font-bold text-white" aria-hidden>
              {sorted.length}
            </span>
          ) : undefined
        }
      />
      {alerts.status === 'error' ? (
        <ErrorState onRetry={alerts.retry} />
      ) : !sorted ? (
        <LoadingState className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </LoadingState>
      ) : sorted.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('dashboard.alerts.empty')} description={t('dashboard.alerts.emptyDescription')} />
      ) : (
        <ul className="-mx-2 flex-1 space-y-1">
          {sorted.map((alert) => {
            const Icon = alertIcons[alert.type]
            const params = {
              ...alert.params,
              amount: alert.params.amount !== undefined ? fmt.currency(alert.params.amount) : undefined,
            }
            const title = t(`dashboard.alerts.types.${alert.type}.title`, params)
            return (
              <li key={alert.id}>
                <Link
                  to={alertTarget[alert.type]}
                  aria-label={`${t(`dashboard.alerts.severity.${alert.severity}`)}: ${title}. ${t('dashboard.alerts.review')}`}
                  className="group flex items-start gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-hover"
                >
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', severityIconClass[alert.severity])}>
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[0.8125rem] font-semibold text-text">{title}</span>
                      <Badge tone={severityTone[alert.severity]}>{t(`dashboard.alerts.severity.${alert.severity}`)}</Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {t(`dashboard.alerts.types.${alert.type}.description`, params)}
                    </span>
                    <span className="mt-1 block truncate text-[0.6875rem] text-text-muted">
                      {nameOf(alert.locationId)} · {fmt.relative(alert.createdAt)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
