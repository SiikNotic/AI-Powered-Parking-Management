import { BellRing, Check, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { alertIcons, severityIconClass, statusTone } from '@/config/alerts'
import { useSession } from '@/context/session'
import { useAlertText } from '@/hooks/useAlertText'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { alertService } from '@/services'
import type { FarmAlert } from '@/types'

type View = 'active' | 'resolved'

export function AlertsPanel({ alerts, loading }: { alerts: FarmAlert[] | undefined; loading: boolean }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const text = useAlertText()
  const { farm, can } = useSession()
  const [view, setView] = useState<View>('active')
  const ack = useMutation((id: string) => alertService.acknowledge(farm.id, id))
  const resolve = useMutation((id: string) => alertService.resolve(farm.id, id))
  const canManage = can('alerts.manage')

  const list = (alerts ?? []).filter((a) => (view === 'active' ? a.status !== 'RESOLVED' : a.status === 'RESOLVED'))
  const active = (alerts ?? []).filter((a) => a.status !== 'RESOLVED')
  const critical = active.filter((a) => a.severity === 'critical').length
  const fresh = active.filter((a) => a.status === 'NEW').length

  return (
    <Card labelledBy="alerts-title" className="flex flex-col scroll-mt-24">
      <span id="alerts" tabIndex={-1} className="sr-only" />
      <CardHeader
        id="alerts-title"
        icon={<BellRing aria-hidden className="size-4" />}
        title={t('alerts.title')}
        subtitle={active.length ? t('alerts.summary', { critical, fresh, total: active.length }) : t('alerts.none')}
        action={
          <SegmentedControl
            label={t('alerts.view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'active', label: t('alerts.active') },
              { value: 'resolved', label: t('alerts.resolved') },
            ]}
          />
        }
      />
      {loading && !alerts ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={CheckCheck} title={view === 'active' ? t('alerts.emptyActive') : t('alerts.emptyResolved')} />
      ) : (
        <ul className="scrollbar-thin -mx-1 max-h-[34rem] flex-1 space-y-1 overflow-y-auto px-1">
          {list.map((alert) => {
            const Icon = alertIcons[alert.type]
            const { title, description } = text(alert)
            return (
              <li key={alert.id} className={cn('rounded-xl border px-3 py-2.5', alert.status === 'NEW' ? 'tile' : 'border-transparent bg-surface-2')}>
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', severityIconClass[alert.severity])}>
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="min-w-0 text-[0.8125rem] font-semibold leading-snug text-text">{title}</p>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-text-muted">
                      <span className="sr-only">{t('alerts.severityLabel')}:</span>
                      <span className="font-semibold uppercase tracking-wide">{t(`alerts.severity.${alert.severity}`)}</span>
                      <span aria-hidden>·</span>
                      <span>{alert.location}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={alert.createdAt} title={fmt.dayMonthTime(alert.createdAt)}>
                        {fmt.relative(alert.createdAt)}
                      </time>
                      <Badge tone={statusTone[alert.status]} className="ml-auto">
                        {t(`alerts.status.${alert.status}`)}
                      </Badge>
                    </div>
                    {canManage && alert.status !== 'RESOLVED' && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alert.status === 'NEW' && (
                          <Button size="sm" variant="secondary" disabled={ack.pending} onClick={() => void ack.run([alert.id], t('alerts.acknowledged'))}>
                            <Check aria-hidden className="size-3.5" />
                            {t('alerts.acknowledge')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={resolve.pending} onClick={() => void resolve.run([alert.id], t('alerts.resolvedToast'))}>
                          <CheckCheck aria-hidden className="size-3.5" />
                          {t('alerts.resolve')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
