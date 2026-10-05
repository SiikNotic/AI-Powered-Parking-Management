import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { DashboardSnapshot } from '@/services'
import { speciesColor } from './format'

type Horizon = 'thisWeek' | 'nextWeek' | 'thisMonth'

export function ForecastCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [horizon, setHorizon] = useState<Horizon>('thisWeek')
  const { forecast, ready } = snapshot.production
  const bucket = forecast[horizon]
  const rows = snapshot.species
    .map((s) => ({ s, lb: bucket.bySpecies[s.id] ?? 0 }))
    .filter((r) => r.lb > 0.5)
    .sort((a, b) => b.lb - a.lb)
  const max = Math.max(1, ...rows.map((r) => r.lb))

  return (
    <Card labelledBy="forecast-title" className="flex flex-col">
      <CardHeader id="forecast-title" icon={<CalendarRange aria-hidden className="size-4" />} title={t('forecast.title')} subtitle={t('forecast.subtitle')} />
      <SegmentedControl
        label={t('forecast.horizon')}
        value={horizon}
        onChange={setHorizon}
        className="self-start"
        options={[
          { value: 'thisWeek', label: t('forecast.thisWeek') },
          { value: 'nextWeek', label: t('forecast.nextWeek') },
          { value: 'thisMonth', label: t('forecast.thisMonth') },
        ]}
      />
      <p className="mt-4 text-[0.75rem] text-text-muted">{t('forecast.expected')}</p>
      <p className="tabular font-display text-3xl font-semibold tracking-[-0.02em] text-text">{fmt.pounds(bucket.total)}</p>
      <ul className="mt-3 space-y-2.5" aria-label={t('forecast.bySpecies')}>
        {rows.length === 0 && <li className="text-sm text-text-muted">{t('forecast.empty')}</li>}
        {rows.map(({ s, lb }) => (
          <li key={s.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="truncate text-text-secondary">{s.name}</span>
              <span className="tabular shrink-0 font-semibold text-text">{fmt.pounds(lb)}</span>
            </div>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (lb / max) * 100)}%`, background: speciesColor(s.colorIndex) }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-border pt-3">
        <p className="mb-2 text-[0.8125rem] font-semibold text-text">{t('forecast.readySoon', { count: ready.length })}</p>
        {ready.length === 0 ? (
          <p className="text-xs text-text-muted">{t('forecast.noneReady')}</p>
        ) : (
          <ul className="space-y-1.5">
            {ready.slice(0, 4).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-text">#{b.code}</span> <span className="text-text-muted">· {b.speciesName} · {b.roomName}</span>
                </span>
                <span className="tabular shrink-0 text-text-secondary">~{fmt.pounds(Math.max(0, b.expectedLb - b.harvestedLb) * (b.harvestedLb ? 1 : 0.6))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
