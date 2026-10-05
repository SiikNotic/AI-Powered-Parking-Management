import { History } from 'lucide-react'
import { Avatar } from '@/components/layout/Avatar'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { ActivityItem, DashboardSnapshot } from '@/services'
import type { AlertStatus, OrderStatus } from '@/types'

export function ActivityCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  // Status values are stored as codes; show them translated.
  const value = (a: ActivityItem, v: string) =>
    a.entity === 'order' ? t(`orderStatus.${v as OrderStatus}`) : a.entity === 'alert' ? t(`alerts.status.${v as AlertStatus}`) : v
  return (
    <Card labelledBy="activity-title">
      <CardHeader id="activity-title" icon={<History aria-hidden className="size-4" />} title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <ol className="space-y-3">
        {snapshot.activity.map((a) => (
          <li key={a.id} className="flex items-start gap-2.5">
            <Avatar name={a.userName} className="size-7 text-[0.625rem] ring-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] leading-snug text-text-secondary">
                <span className="font-semibold text-text">{a.userName}</span> {t(`activity.actions.${a.action}`)} {t(`activity.entities.${a.entity}`)}{' '}
                <span className="font-medium text-text">{a.entityLabel}</span>
                {a.newValue && (
                  <span className="text-text-muted">
                    {' '}
                    · {a.oldValue ? `${value(a, a.oldValue)} → ` : ''}
                    {value(a, a.newValue)}
                  </span>
                )}
              </p>
              <time dateTime={a.date} className="text-[0.6875rem] text-text-muted">
                {fmt.relative(a.date)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
