import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { activityToneBadge, activityToneIcon, activityVisuals } from '@/config/activity'
import type { AsyncResult } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ActivityEvent, ParkingLocation } from '@/types'

interface RecentActivityProps {
  activity: AsyncResult<ActivityEvent[]>
  locations: ParkingLocation[]
  showLocation: boolean
  className?: string
}

export function RecentActivity({ activity, locations, showLocation, className }: RecentActivityProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const nameOf = (id: string) => locations.find((l) => l.id === id)?.name ?? ''

  return (
    <Card className={cn('flex flex-col', className)} labelledBy="activity-title">
      <CardHeader id="activity-title" title={t('dashboard.activity.title')} subtitle={t('dashboard.activity.subtitle')} />

      {activity.status === 'error' ? (
        <ErrorState onRetry={activity.retry} />
      ) : !activity.data ? (
        <LoadingState className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </LoadingState>
      ) : activity.data.length === 0 ? (
        <EmptyState icon={Activity} title={t('dashboard.activity.empty')} description={t('dashboard.activity.emptyDescription')} />
      ) : (
        <ol className="relative -mx-1 flex-1">
          {activity.data.map((event, index) => {
            const visual = activityVisuals[event.type]
            const Icon = visual.icon
            const params = {
              ...event.params,
              amount: event.params.amount !== undefined ? fmt.currency(event.params.amount) : undefined,
            }
            const last = index === activity.data!.length - 1
            return (
              <li key={event.id} className="relative flex gap-3 rounded-xl px-1 py-2.5">
                {!last && <span aria-hidden className="absolute left-[1.25rem] top-11 bottom-0 w-px bg-border" />}
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', activityToneIcon[visual.tone])}>
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium leading-snug text-text">
                    {t(`dashboard.activity.events.${event.type}`, params)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
                    <time dateTime={event.occurredAt} title={fmt.dayMonthTime(event.occurredAt)} className="tabular">
                      {fmt.time(event.occurredAt)}
                    </time>
                    <span aria-hidden>·</span>
                    <span>{fmt.relative(event.occurredAt)}</span>
                  </p>
                  {showLocation && <p className="truncate text-xs text-text-muted">{nameOf(event.locationId)}</p>}
                </div>
                <Badge tone={activityToneBadge[visual.tone]} className="mt-0.5 self-start">
                  {t(`dashboard.activity.tones.${visual.tone}`)}
                </Badge>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
