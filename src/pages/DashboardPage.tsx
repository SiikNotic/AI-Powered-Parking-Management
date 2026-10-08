import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ActivityCard } from '@/components/dashboard/ActivityCard'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { CustomizeDialog } from '@/components/dashboard/CustomizeDialog'
import { FarmGlance } from '@/components/dashboard/FarmGlance'
import { FarmOverview } from '@/components/dashboard/FarmOverview'
import { FinanceCard } from '@/components/dashboard/FinanceCard'
import { ForecastCard } from '@/components/dashboard/ForecastCard'
import { HarvestCard } from '@/components/dashboard/HarvestCard'
import { InventoryCard } from '@/components/dashboard/InventoryCard'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PipelineCard } from '@/components/dashboard/PipelineCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { SalesCard } from '@/components/dashboard/SalesCard'
import { TasksCard } from '@/components/dashboard/TasksCard'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import type { Permission } from '@/domain/permissions'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useLiveEnvironment } from '@/hooks/useLiveEnvironment'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { alertService, DEFAULT_LAYOUT, dashboardService, preferencesService, type WidgetId, type WidgetPreference } from '@/services'
import type { Period } from '@/types'

const PERIOD_KEY = 'mushroom-farm.period'

/** Grid span per widget: 2 columns on tablet, 12 on desktop. */
const SPAN: Record<WidgetId, string> = {
  glance: 'md:col-span-2 xl:col-span-12',
  overview: 'md:col-span-2 xl:col-span-8',
  alerts: 'md:col-span-2 xl:col-span-4',
  harvest: 'md:col-span-2 xl:col-span-8',
  forecast: 'md:col-span-2 lg:col-span-1 xl:col-span-4',
  pipeline: 'md:col-span-2 lg:col-span-1 xl:col-span-6',
  inventory: 'md:col-span-2 xl:col-span-6',
  finance: 'md:col-span-2 xl:col-span-8',
  sales: 'md:col-span-2 lg:col-span-1 xl:col-span-4',
  tasks: 'md:col-span-2 lg:col-span-1 xl:col-span-6',
  activity: 'md:col-span-2 xl:col-span-6',
}

const WIDGET_PERMISSION: Partial<Record<WidgetId, Permission>> = {
  overview: 'environment.view',
  harvest: 'production.view',
  forecast: 'production.view',
  pipeline: 'production.view',
  inventory: 'inventory.view',
  finance: 'finance.view',
  sales: 'sales.view',
  tasks: 'tasks.view',
  activity: 'audit.view',
}

function readPeriod(): Period {
  try {
    const p = localStorage.getItem(PERIOD_KEY)
    if (p === 'today' || p === '7d' || p === '30d') return p
  } catch {
    /* ignore */
  }
  return '7d'
}

function greetingKey(iso: string | undefined): TranslationKey {
  const hour = iso ? new Date(iso).getHours() : 9
  if (hour < 12) return 'dashboard.greeting.morning'
  if (hour < 18) return 'dashboard.greeting.afternoon'
  return 'dashboard.greeting.evening'
}

export function DashboardPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { farm, user, can } = useSession()
  const [period, setPeriodState] = useState<Period>(readPeriod)
  const [layout, setLayoutState] = useState<WidgetPreference[]>(() => preferencesService.getDashboardLayout(user.id))
  const [customizing, setCustomizing] = useState(false)

  const snapshot = useAsync(() => dashboardService.getSnapshot(farm.id, period), [farm.id, period], ['dashboard'])
  const alerts = useAsync(() => alertService.list(farm.id), [farm.id], ['alerts'])
  const data = snapshot.data && snapshot.data.farm.id === farm.id ? snapshot.data : undefined
  const live = useLiveEnvironment(farm.id, data?.rooms)

  const setPeriod = (p: Period) => {
    setPeriodState(p)
    try {
      localStorage.setItem(PERIOD_KEY, p)
    } catch {
      /* ignore */
    }
  }

  const setLayout = useCallback(
    (next: WidgetPreference[]) => {
      setLayoutState(next)
      preferencesService.saveDashboardLayout(user.id, next)
    },
    [user.id],
  )

  const allowed = useCallback((id: WidgetId) => {
    const p = WIDGET_PERMISSION[id]
    return !p || can(p)
  }, [can])

  const widgets = useMemo(() => {
    if (!data) return []
    const render: Record<WidgetId, () => ReactNode> = {
      glance: () => <FarmGlance snapshot={data} environment={can('environment.view') ? live.rooms : []} alerts={alerts.data ?? []} />,
      overview: () => <FarmOverview live={live} />,
      alerts: () => <AlertsPanel alerts={alerts.data} loading={alerts.status === 'loading'} />,
      harvest: () => <HarvestCard snapshot={data} />,
      forecast: () => <ForecastCard snapshot={data} />,
      pipeline: () => <PipelineCard snapshot={data} />,
      inventory: () => <InventoryCard snapshot={data} />,
      finance: () => <FinanceCard snapshot={data} />,
      sales: () => <SalesCard snapshot={data} />,
      tasks: () => <TasksCard snapshot={data} />,
      activity: () => <ActivityCard snapshot={data} />,
    }
    return layout.filter((w) => w.visible && allowed(w.id)).map((w) => ({ id: w.id, node: render[w.id]() }))
  }, [data, layout, allowed, live, alerts.data, alerts.status, can])

  return (
    <div className="mx-auto max-w-[1680px] px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-text-muted">
            {data ? `${fmt.longDate(data.generatedAt)} · ` : ''}
            {farm.name}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-text sm:text-[1.75rem]">{t(greetingKey(data?.generatedAt), { name: user.name.split(' ')[0] })}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label={t('period.label')}
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'today', label: t('period.today') },
              { value: '7d', label: t('period.7d') },
              { value: '30d', label: t('period.30d') },
            ]}
          />
          <Button size="sm" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal aria-hidden className="size-3.5" />
            {t('customize.button')}
          </Button>
        </div>
      </div>

      {snapshot.status === 'error' && !data ? (
        <ErrorState onRetry={snapshot.retry} className="panel rounded-card" />
      ) : (
        <div className={cn('space-y-4 transition-opacity', snapshot.status === 'loading' && data && 'opacity-70')} aria-busy={snapshot.status === 'loading'}>
          <QuickActions />
          <KpiGrid snapshot={data} />
          {!data ? (
            <div className="grid gap-4 xl:grid-cols-12">
              <Skeleton className="h-72 rounded-card xl:col-span-12" />
              <Skeleton className="h-96 rounded-card xl:col-span-8" />
              <Skeleton className="h-96 rounded-card xl:col-span-4" />
            </div>
          ) : (
            <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              {widgets.map((w) => (
                <div key={w.id} className={cn('min-w-0', SPAN[w.id])}>
                  {w.node}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CustomizeDialog
        open={customizing}
        onClose={() => setCustomizing(false)}
        layout={layout}
        allowed={allowed}
        onChange={setLayout}
        onReset={() => setLayout(DEFAULT_LAYOUT.map((id) => ({ id, visible: true })))}
      />
    </div>
  )
}
