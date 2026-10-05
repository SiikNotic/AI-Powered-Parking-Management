import { Droplets, LayoutGrid, Thermometer, Wind, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { LineChart } from '@/components/charts/LineChart'
import { Sparkline } from '@/components/charts/Sparkline'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/States'
import { METRICS, type RoomEnvironment, type RoomStatus } from '@/domain/environment'
import { useFormat } from '@/hooks/useFormat'
import type { LiveEnvironment } from '@/hooks/useLiveEnvironment'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Metric } from '@/types'
import { formatMetric, metricTextClass } from './format'
import { CardLink, RoomStatusBadge } from './shared'

const metricIcons: Record<Metric, LucideIcon> = { temperature: Thermometer, humidity: Droplets, co2: Wind }
const STATUS_ORDER: RoomStatus[] = ['critical', 'offline', 'warning', 'ok']

function RoomTile({ env, history, selected, onSelect }: { env: RoomEnvironment; history: number[]; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { room, reading } = env
  const focus = METRICS.find((m) => env.metrics[m] !== 'ok') ?? 'temperature'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border p-3 text-left transition-colors',
        selected ? 'border-brand bg-brand-soft/60 ring-1 ring-brand' : 'tile hover:border-border-strong',
        env.status === 'offline' && 'bg-surface-2',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-semibold text-text">{room.name}</span>
          <span className="block truncate text-[0.6875rem] text-text-muted">{t(`rooms.${room.type}`)}</span>
        </span>
        <RoomStatusBadge status={env.status} />
      </span>
      <span className="mt-2.5 grid grid-cols-3 gap-1.5">
        {METRICS.map((m) => {
          const Icon = metricIcons[m]
          return (
            <span key={m} className="min-w-0">
              <span className="flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-wide text-text-muted">
                <Icon aria-hidden className="size-3" />
                {t(`environment.short.${m}`)}
              </span>
              <span className={cn('tabular block truncate text-[0.8125rem] font-semibold', reading && env.status !== 'offline' ? metricTextClass[env.metrics[m]] : 'text-text-muted')}>
                {reading ? formatMetric(m, reading[m]).replace(' ppm', '') : '—'}
              </span>
            </span>
          )
        })}
      </span>
      <Sparkline values={history} band={room.targets[focus]} className="mt-2 h-6 w-full" color={env.status === 'ok' ? 'var(--text-muted)' : env.status === 'warning' ? 'var(--warn)' : env.status === 'critical' ? 'var(--crit)' : 'var(--offline)'} />
      <span className="mt-1 truncate text-[0.6875rem] text-text-muted">
        {reading ? t('environment.lastReading', { time: fmt.relative(reading.timestamp) }) : t('environment.noData')}
      </span>
    </button>
  )
}

export function FarmOverview({ live }: { live: LiveEnvironment }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('humidity')

  const rooms = live.rooms
  const worstFirst = [...rooms].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  const selected = rooms.find((r) => r.room.id === selectedId) ?? worstFirst.find((r) => r.status !== 'offline') ?? rooms[0]
  const counts = STATUS_ORDER.map((s) => [s, rooms.filter((r) => r.status === s).length] as const).filter(([, n]) => n > 0)

  const sparkFor = (env: RoomEnvironment) => {
    const focus = METRICS.find((m) => env.metrics[m] !== 'ok') ?? 'temperature'
    const list = live.history[env.room.id] ?? []
    return list.slice(-72).filter((_, i) => i % 3 === 0).map((r) => r[focus])
  }

  const series = selected ? (live.history[selected.room.id] ?? []).filter((_, i, arr) => i % 3 === 0 || i === arr.length - 1).map((r) => ({ t: r.timestamp, value: r[metric] })) : []

  return (
    <Card labelledBy="overview-title">
      <CardHeader
        id="overview-title"
        icon={<LayoutGrid aria-hidden className="size-4" />}
        title={t('overview.title')}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn('size-1.5 rounded-full', live.status === 'ready' ? 'live-dot bg-ok' : 'bg-offline')} />
              {live.updatedAt ? t('overview.live', { time: fmt.time(live.updatedAt) }) : t('states.loading')}
            </span>
            {counts.map(([status, n]) => (
              <span key={status} className="text-text-muted">
                · {n} {t(`environment.status.${status}`).toLowerCase()}
              </span>
            ))}
          </span>
        }
        action={<CardLink to="/environment">{t('common.viewAll')}</CardLink>}
      />
      {live.status === 'loading' ? (
        <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2 lg:grid-cols-4">
            {rooms.map((env) => (
              <RoomTile key={env.room.id} env={env} history={sparkFor(env)} selected={selected?.room.id === env.room.id} onSelect={() => setSelectedId(env.room.id)} />
            ))}
          </div>
          {selected && (
            <div className="mt-4 rounded-xl border border-border p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{t('overview.trendTitle', { room: selected.room.name })}</p>
                  <p className="text-xs text-text-muted">
                    {t('overview.target', {
                      range: `${formatMetric(metric, selected.room.targets[metric].min)} – ${formatMetric(metric, selected.room.targets[metric].max)}`,
                    })}
                    {selected.reading && <> · {t('overview.now', { value: formatMetric(metric, selected.reading[metric]) })}</>}
                  </p>
                </div>
                <SegmentedControl
                  label={t('overview.metric')}
                  value={metric}
                  onChange={setMetric}
                  options={METRICS.map((m) => ({ value: m, label: t(`environment.metrics.${m}`) }))}
                />
              </div>
              {series.length > 1 ? (
                <LineChart
                  points={series}
                  band={selected.room.targets[metric]}
                  format={(v) => formatMetric(metric, v)}
                  formatTime={fmt.time}
                  bandLabel={t('overview.targetBand')}
                  label={`${t(`environment.metrics.${metric}`)} · ${selected.room.name}`}
                  height={190}
                />
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">{t('environment.noData')}</p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
