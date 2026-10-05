import { ChevronRight, FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { PIPELINE_STATUSES } from '@/domain/production'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import { CardLink, StatBlock } from './shared'

export function PipelineCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { pipeline, yield: stats, overdue, ready } = snapshot.production
  const active = PIPELINE_STATUSES.reduce((s, st) => s + pipeline[st], 0)
  const attention = [...overdue, ...ready.filter((r) => !overdue.some((o) => o.id === r.id))].slice(0, 4)

  return (
    <Card labelledBy="pipeline-title">
      <CardHeader
        id="pipeline-title"
        icon={<FlaskConical aria-hidden className="size-4" />}
        title={t('pipeline.title')}
        subtitle={t('pipeline.subtitle', { count: active })}
        action={<CardLink to="/batches">{t('common.viewAll')}</CardLink>}
      />
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={t('pipeline.stages')}>
        {PIPELINE_STATUSES.map((status, i) => (
          <li key={status} className="relative min-w-0">
            <div className={cn('rounded-xl border px-2.5 py-2', status === 'READY_TO_HARVEST' && pipeline[status] ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2/50')}>
              <p className="tabular font-display text-xl font-semibold text-text">{pipeline[status]}</p>
              <p className="truncate text-[0.6875rem] text-text-muted">{t(`batch.status.${status}`)}</p>
            </div>
            {i < PIPELINE_STATUSES.length - 1 && <ChevronRight aria-hidden className="absolute -right-2 top-1/2 z-10 hidden size-3.5 -translate-y-1/2 text-text-muted sm:block" />}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <StatBlock label={t('pipeline.completed')} value={fmt.number(pipeline.COMPLETED)} />
        <StatBlock label={t('pipeline.lost')} value={fmt.number(pipeline.FAILED + pipeline.DISCARDED)} hint={t('pipeline.lossRate', { value: fmt.percent(stats.lossRate) })} />
        <StatBlock label={t('pipeline.efficiency')} value={stats.efficiency !== null ? fmt.percent(stats.efficiency) : '—'} />
      </div>
      {attention.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {attention.map((b) => {
            const late = overdue.some((o) => o.id === b.id)
            return (
              <li key={b.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-text">#{b.code}</span>
                  <span className="text-text-muted">
                    {' '}
                    · {b.speciesName} · {b.roomName}
                  </span>
                </span>
                <Badge tone={late ? 'warning' : 'brand'}>{late ? t('pipeline.overdue', { date: fmt.dayMonth(b.expectedHarvestDate) }) : t('pipeline.readyNow')}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
