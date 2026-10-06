import { Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LineChart } from '@/components/charts/LineChart'
import { formatMetric } from '@/components/dashboard/format'
import { StatBlock } from '@/components/dashboard/shared'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { METRICS } from '@/domain/environment'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { sensorProvider } from '@/services'
import type { EnvironmentalReading, GrowRoom, Metric } from '@/types'

type RangeKey = '6h' | '24h' | '7d'
const HOURS: Record<RangeKey, number> = { '6h': 6, '24h': 24, '7d': 168 }
const MAX_POINTS = 240

/**
 * Averages readings into equal time buckets (at least 5 min, at most MAX_POINTS
 * per range) so the x-axis is uniform even when the source resolution varies.
 */
function downsample(readings: EnvironmentalReading[], metric: Metric, hours: number) {
  if (!readings.length) return []
  const bucketMs = Math.max(5 * 60_000, (hours * 3_600_000) / MAX_POINTS)
  const points: { t: string; value: number }[] = []
  let bucket = -1
  let sum = 0
  let count = 0
  let last = ''
  const flush = () => count && points.push({ t: last, value: sum / count })
  for (const r of readings) {
    const b = Math.floor(new Date(r.timestamp).getTime() / bucketMs)
    if (b !== bucket) {
      flush()
      bucket = b
      sum = 0
      count = 0
    }
    sum += r[metric]
    count++
    last = r.timestamp
  }
  flush()
  return points
}

interface RoomHistoryProps {
  farmId: string
  room: GrowRoom
  /** Live readings for the room (appended after the fetched history). */
  live: EnvironmentalReading[]
  canEdit: boolean
  onEditTargets: () => void
}

export function RoomHistory({ farmId, room, live, canEdit, onEditTargets }: RoomHistoryProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [metric, setMetric] = useState<Metric>('temperature')
  const [range, setRange] = useState<RangeKey>('24h')
  const [attempt, setAttempt] = useState(0)
  const key = `${farmId}:${room.id}:${range}:${attempt}`
  const [result, setResult] = useState<{ key: string; readings: EnvironmentalReading[] | null }>({ key: '', readings: null })

  useEffect(() => {
    let cancelled = false
    sensorProvider.getHistory(farmId, room.id, HOURS[range]).then(
      (readings) => !cancelled && setResult({ key, readings }),
      () => !cancelled && setResult({ key, readings: null }),
    )
    return () => {
      cancelled = true
    }
  }, [farmId, room.id, range, key])

  const loading = result.key !== key
  const failed = !loading && result.readings === null

  const readings = useMemo(() => {
    const fetched = result.key === key ? (result.readings ?? []) : []
    const last = fetched[fetched.length - 1]?.timestamp ?? ''
    return [...fetched, ...live.filter((r) => r.timestamp > last)]
  }, [result, key, live])

  const points = useMemo(() => downsample(readings, metric, HOURS[range]), [readings, metric, range])
  const values = readings.map((r) => r[metric])
  const metricName = t(`environment.metrics.${metric}`)

  return (
    <Card labelledBy="history-title">
      <CardHeader
        id="history-title"
        title={t('pages.environment.history.title', { room: room.name })}
        subtitle={t('pages.environment.history.subtitle')}
        action={
          canEdit ? (
            <Button variant="secondary" size="sm" onClick={onEditTargets}>
              <Pencil aria-hidden className="size-3.5" />
              {t('pages.environment.targets.edit')}
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedControl label={t('pages.environment.history.metric')} value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m, label: t(`environment.short.${m}`) }))} />
        <SegmentedControl
          label={t('pages.environment.history.range')}
          value={range}
          onChange={setRange}
          options={(['6h', '24h', '7d'] as const).map((r) => ({ value: r, label: t(`pages.environment.ranges.${r}`) }))}
        />
      </div>
      {loading ? (
        <Skeleton className="h-[220px] rounded-xl" />
      ) : failed ? (
        <ErrorState onRetry={() => setAttempt((a) => a + 1)} />
      ) : !points.length ? (
        <EmptyState title={t('pages.environment.history.empty')} />
      ) : (
        <>
          <LineChart
            points={points}
            band={room.targets[metric]}
            format={(v) => formatMetric(metric, v)}
            formatTime={range === '7d' ? fmt.dayMonth : fmt.time}
            bandLabel={`${t('pages.environment.history.targetBand')} ${room.targets[metric].min}–${room.targets[metric].max}`}
            height={220}
            label={t('pages.environment.history.chartLabel', { metric: metricName, room: room.name })}
          />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <StatBlock label={t('pages.environment.history.min')} value={formatMetric(metric, Math.min(...values))} />
            <StatBlock label={t('pages.environment.history.avg')} value={formatMetric(metric, values.reduce((s, v) => s + v, 0) / values.length)} />
            <StatBlock label={t('pages.environment.history.max')} value={formatMetric(metric, Math.max(...values))} />
          </div>
        </>
      )}
    </Card>
  )
}
