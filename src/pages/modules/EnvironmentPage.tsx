import { Plus, Radio, Wifi, WifiOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatMetric, METRIC_UNIT, metricTextClass } from '@/components/dashboard/format'
import { RoomStatusBadge } from '@/components/dashboard/shared'
import { ENVIRONMENT_MANAGERS } from '@/components/modules/environment/access'
import { RegisterSensorForm } from '@/components/modules/environment/RegisterSensorForm'
import { RoomHistory } from '@/components/modules/environment/RoomHistory'
import { TargetsForm } from '@/components/modules/environment/TargetsForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { METRICS, OFFLINE_AFTER_MS } from '@/domain/environment'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useLiveEnvironment } from '@/hooks/useLiveEnvironment'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Sensor } from '@/types'

interface SensorRow {
  sensor: Sensor
  roomName: string
  lastSeen: string | null
  online: boolean
}

export function EnvironmentPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user, farm, can } = useSession()
  const { data, status, retry } = useFarmData()
  const live = useLiveEnvironment(farm.id, data?.rooms)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingTargets, setEditingTargets] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [mountedAt] = useState(() => Date.now())
  const canManage = can('farms.manage') || ENVIRONMENT_MANAGERS.includes(user.role)

  const selectedRoom = data?.rooms.find((r) => r.id === selectedId) ?? data?.rooms[0]

  const sensorRows = useMemo<SensorRow[]>(() => {
    if (!data) return []
    const now = live.updatedAt ? new Date(live.updatedAt).getTime() : mountedAt
    const rooms = new Map(data.rooms.map((r) => [r.id, r.name]))
    return data.sensors.map((s) => {
      // Prefer the live feed (latest reading from this device); fall back to the stored "last seen".
      const liveTs = (live.history[s.roomId] ?? []).filter((r) => r.sensorId === s.externalId).at(-1)?.timestamp
      const lastSeen = liveTs ?? s.lastSeenAt
      return { sensor: s, roomName: rooms.get(s.roomId) ?? '—', lastSeen, online: !!lastSeen && now - new Date(lastSeen).getTime() <= OFFLINE_AFTER_MS }
    })
  }, [data, live.history, live.updatedAt, mountedAt])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const sensorColumns: Column<SensorRow>[] = [
    { key: 'externalId', header: t('pages.environment.sensors.columns.externalId'), cell: (r) => <span className="font-mono text-xs text-text">{r.sensor.externalId || '—'}</span>, sort: (r) => r.sensor.externalId },
    { key: 'room', header: t('pages.environment.sensors.columns.room'), cell: (r) => r.roomName, sort: (r) => r.roomName },
    { key: 'provider', header: t('pages.environment.sensors.columns.provider'), cell: (r) => r.sensor.provider, sort: (r) => r.sensor.provider },
    {
      key: 'lastSeen',
      header: t('pages.environment.sensors.columns.lastSeen'),
      cell: (r) => (r.lastSeen ? <span title={fmt.dayMonthTime(r.lastSeen)}>{fmt.relative(r.lastSeen)}</span> : t('pages.environment.sensors.never')),
      sort: (r) => r.lastSeen ?? '',
    },
    {
      key: 'status',
      header: t('pages.environment.sensors.columns.status'),
      cell: (r) =>
        r.online ? (
          <Badge tone="success" icon={<Wifi aria-hidden className="size-3" />}>
            {t('pages.environment.sensors.online')}
          </Badge>
        ) : (
          <Badge tone="offline" icon={<WifiOff aria-hidden className="size-3" />}>
            {t('pages.environment.sensors.offline')}
          </Badge>
        ),
      sort: (r) => (r.online ? 1 : 0),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.environment.title')}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {t('pages.environment.subtitle')}
            {live.status === 'ready' && live.updatedAt && (
              <span className="inline-flex items-center gap-1 text-xs text-ok-ink">
                <Radio aria-hidden className="size-3.5" />
                {t('pages.environment.updated', { time: fmt.time(live.updatedAt) })}
              </span>
            )}
          </span>
        }
        actions={
          canManage && data ? (
            <Button variant="primary" onClick={() => setRegistering(true)}>
              <Plus aria-hidden className="size-4" />
              {t('pages.environment.sensors.register')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <>
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </>
      ) : !data.rooms.length ? (
        <Card>
          <EmptyState title={t('environment.noData')} />
        </Card>
      ) : (
        <>
          <section aria-labelledby="rooms-title" className="space-y-3">
            <h2 id="rooms-title" className="font-display text-base font-semibold text-text">
              {t('pages.environment.rooms')}
            </h2>
            {live.status === 'error' && <ErrorState onRetry={retry} />}
            {live.status === 'loading' && <p className="text-sm text-text-muted">{t('pages.environment.connecting')}</p>}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.rooms.map((room) => {
                const env = live.rooms.find((r) => r.room.id === room.id)
                const reading = env?.reading ?? null
                const selected = selectedRoom?.id === room.id
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(room.id)}
                      aria-pressed={selected}
                      aria-label={t('pages.environment.selectRoom', { room: room.name })}
                      className={cn(
                        'panel w-full rounded-card p-4 text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                        selected ? 'ring-2 ring-brand' : 'hover:ring-1 hover:ring-border-strong',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-text">{room.name}</p>
                          <p className="truncate text-xs text-text-muted">{t(`rooms.${room.type}`)}</p>
                        </div>
                        {env ? <RoomStatusBadge status={env.status} /> : <Skeleton className="h-5 w-14 rounded-full" />}
                      </div>
                      <dl className="mt-3 space-y-2">
                        {METRICS.map((m) => {
                          const st = env?.metrics[m] ?? 'ok'
                          const target = room.targets[m]
                          return (
                            <div key={m} className="flex items-baseline justify-between gap-2 text-sm">
                              <dt className="text-text-secondary">{t(`environment.metrics.${m}`)}</dt>
                              <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 text-right">
                                <span className={cn('tabular font-semibold', reading ? metricTextClass[st] : 'text-text-muted')}>{reading ? formatMetric(m, reading[m]) : '—'}</span>
                                {reading && st !== 'ok' && (
                                  <Badge tone={st === 'critical' ? 'danger' : 'warning'} className="self-center">
                                    {t(`environment.status.${st}`)}
                                  </Badge>
                                )}
                                <span className="tabular w-full text-[0.6875rem] text-text-muted">
                                  {m === 'co2'
                                    ? t('pages.environment.targetMax', { max: `${fmt.number(target.max)} ${METRIC_UNIT[m]}` })
                                    : t('pages.environment.target', { min: fmt.decimal(target.min), max: `${fmt.decimal(target.max)}${METRIC_UNIT[m]}` })}
                                </span>
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                      <p className="mt-3 text-[0.6875rem] text-text-muted">{reading ? t('environment.lastReading', { time: fmt.relative(reading.timestamp, new Date(live.updatedAt ?? mountedAt)) }) : t('environment.noData')}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {selectedRoom && (
            <RoomHistory key={selectedRoom.id} farmId={farm.id} room={selectedRoom} live={live.history[selectedRoom.id] ?? []} canEdit={canManage} onEditTargets={() => setEditingTargets(true)} />
          )}

          <Card labelledBy="sensors-title">
            <CardHeader
              id="sensors-title"
              title={t('pages.environment.sensors.title')}
              subtitle={t('pages.environment.sensors.subtitle', { count: data.sensors.length })}
              action={
                canManage ? (
                  <Button variant="secondary" size="sm" onClick={() => setRegistering(true)}>
                    <Plus aria-hidden className="size-3.5" />
                    {t('pages.environment.sensors.register')}
                  </Button>
                ) : undefined
              }
            />
            <DataTable
              rows={sensorRows}
              columns={sensorColumns}
              rowKey={(r) => r.sensor.id}
              label={t('pages.environment.sensors.title')}
              emptyTitle={t('pages.environment.sensors.empty')}
              initialSort={{ key: 'room', dir: 'asc' }}
            />
          </Card>
        </>
      )}
      {editingTargets && selectedRoom && <TargetsForm room={selectedRoom} onClose={() => setEditingTargets(false)} />}
      {registering && data && <RegisterSensorForm data={data} roomId={selectedRoom?.id} onClose={() => setRegistering(false)} />}
    </PageShell>
  )
}
