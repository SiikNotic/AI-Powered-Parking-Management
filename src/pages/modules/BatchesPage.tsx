import { AlertTriangle, Layers, MapPin, Plus, Scissors } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { speciesColor } from '@/components/dashboard/format'
import { BATCH_WRITERS, HARVEST_WRITERS } from '@/components/modules/batches/access'
import { BatchDrawer } from '@/components/modules/batches/BatchDrawer'
import { BatchForm } from '@/components/modules/batches/BatchForm'
import { BatchStatusBadge } from '@/components/modules/batches/BatchStatusBadge'
import { ScanButton } from '@/components/modules/batches/QrScanner'
import { HarvestForm } from '@/components/modules/harvest/HarvestForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { expectedYield, isActive, isOverdue, yieldStats } from '@/domain/production'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { commands } from '@/services'
import type { BatchEvent, BatchStatus, ProductionBatch } from '@/types'

const STATUSES: BatchStatus[] = ['PLANNED', 'INOCULATED', 'COLONIZING', 'FRUITING', 'READY_TO_HARVEST', 'HARVESTED', 'COMPLETED', 'FAILED', 'DISCARDED']

interface Row {
  batch: ProductionBatch
  speciesName: string
  colorIndex: number
  roomName: string
  harvested: number
  expected: number
  overdue: boolean
}

export function BatchesPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user, farm } = useSession()
  const { data, status, retry } = useFarmData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [harvestFor, setHarvestFor] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ batch: ProductionBatch; status: BatchStatus } | null>(null)
  const [events, setEvents] = useState<BatchEvent[]>([])
  const [now] = useState(() => new Date())
  const setStatus = useCommand('setBatchStatus')
  const setLocation = useCommand('setBatchLocation')
  const canWrite = BATCH_WRITERS.includes(user.role)
  const canHarvest = HARVEST_WRITERS.includes(user.role)
  // /batches?new=1 (from the Production page) opens the form directly.
  const [creating, setCreating] = useState(() => canWrite && params.get('new') === '1')

  // Drop the one-shot ?new=1 flag so a reload or back navigation doesn't reopen the form.
  useEffect(() => {
    if (params.get('new') !== '1') return
    setParams((p) => {
      p.delete('new')
      return p
    }, { replace: true })
  }, [params, setParams])

  // Deep link from a scanned QR: /batches?code=B-00042 opens that batch.
  useEffect(() => {
    const code = params.get('code')
    if (!code || !data) return
    const match = data.batches.find((b) => b.code.toLowerCase() === code.toLowerCase())
    if (match) setSelectedId(match.id)
    setParams((p) => {
      p.delete('code')
      return p
    }, { replace: true })
  }, [params, data, setParams])

  // Load the traceability history whenever a batch is opened.
  useEffect(() => {
    if (!selectedId) {
      setEvents([])
      return
    }
    let cancelled = false
    commands.listBatchEvents(farm.id, selectedId).then((list) => {
      if (!cancelled) setEvents(list)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [selectedId, farm.id])

  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const species = new Map(data.species.map((s) => [s.id, s]))
    const rooms = new Map(data.rooms.map((r) => [r.id, r.name]))
    const harvested = new Map<string, number>()
    for (const h of data.harvests) harvested.set(h.batchId, (harvested.get(h.batchId) ?? 0) + h.wetWeight)
    return data.batches.map((b) => {
      const sp = species.get(b.speciesId)
      return {
        batch: b,
        speciesName: sp?.name ?? '—',
        colorIndex: sp?.colorIndex ?? 0,
        roomName: rooms.get(b.roomId) ?? '—',
        harvested: harvested.get(b.id) ?? 0,
        expected: sp ? expectedYield(b, sp) : 0,
        overdue: isOverdue(b, data.harvests, now),
      }
    })
  }, [data, now])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '')
    return rows.filter(
      (r) =>
        (!statusFilter || r.batch.status === statusFilter) &&
        (!speciesFilter || r.batch.speciesId === speciesFilter) &&
        (!roomFilter || r.batch.roomId === roomFilter) &&
        (!q || r.batch.code.toLowerCase().includes(q)),
    )
  }, [rows, query, statusFilter, speciesFilter, roomFilter])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const selected = data?.batches.find((b) => b.id === selectedId)
  const stats = data ? yieldStats(data.batches, data.harvests, data.species) : null
  const activeCount = data?.batches.filter(isActive).length ?? 0
  const plannedCount = data?.batches.filter((b) => b.status === 'PLANNED').length ?? 0
  const readyCount = data?.batches.filter((b) => b.status === 'READY_TO_HARVEST').length ?? 0
  const overdueCount = rows.filter((r) => r.overdue).length

  const changeStatus = async (batch: ProductionBatch, next: BatchStatus) => {
    await setStatus.run([batch.id, next], t('pages.batches.drawer.statusChanged', { status: t(`batch.status.${next}`) }))
    setConfirm(null)
  }

  const changeLocation = async (batch: ProductionBatch, locationCode: string | null) => {
    await setLocation.run([batch.id, locationCode], t('pages.batches.drawer.locationChanged', { code: locationCode ?? '—' }))
  }

  const openScannedBatch = (code: string) => {
    const match = data?.batches.find((b) => b.code.toLowerCase() === code.toLowerCase())
    if (match) setSelectedId(match.id)
    else setQuery(code)
  }

  const columns: Column<Row>[] = [
    { key: 'code', header: t('pages.batches.columns.code'), cell: (r) => <span className="font-mono text-xs font-semibold text-text">#{r.batch.code}</span>, sort: (r) => r.batch.code },
    {
      key: 'species',
      header: t('pages.batches.columns.species'),
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: speciesColor(r.colorIndex) }} />
          {r.speciesName}
        </span>
      ),
      sort: (r) => r.speciesName,
    },
    { key: 'room', header: t('pages.batches.columns.room'), cell: (r) => r.roomName, sort: (r) => r.roomName, hideOnMobile: true },
    {
      key: 'location',
      header: t('pages.batches.columns.location'),
      cell: (r) =>
        r.batch.locationCode ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-text">
            <MapPin aria-hidden className="size-3.5 text-text-muted" />
            {r.batch.locationCode}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
      sort: (r) => r.batch.locationCode ?? '',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: t('pages.batches.columns.status'),
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          <BatchStatusBadge status={r.batch.status} />
          {r.overdue && (
            <Badge tone="danger" icon={<AlertTriangle aria-hidden className="size-3" />}>
              {t('pages.batches.overdue')}
            </Badge>
          )}
        </span>
      ),
      sort: (r) => STATUSES.indexOf(r.batch.status),
    },
    { key: 'spawn', header: t('pages.batches.columns.spawn'), cell: (r) => fmt.dayMonth(r.batch.spawnDate), sort: (r) => r.batch.spawnDate, hideOnMobile: true },
    { key: 'expected', header: t('pages.batches.columns.expected'), cell: (r) => fmt.dayMonth(r.batch.expectedHarvestDate), sort: (r) => r.batch.expectedHarvestDate },
    { key: 'substrate', header: t('pages.batches.columns.substrate'), align: 'right', cell: (r) => fmt.pounds(r.batch.substrateWeight), sort: (r) => r.batch.substrateWeight, hideOnMobile: true },
    {
      key: 'yield',
      header: t('pages.batches.columns.yield'),
      align: 'right',
      cell: (r) => (
        <span className="tabular">
          <span className="font-semibold text-text">{fmt.decimal(r.harvested)}</span>
          <span className="text-text-muted"> / {fmt.pounds(r.expected)}</span>
        </span>
      ),
      sort: (r) => (r.expected ? r.harvested / r.expected : 0),
    },
    { key: 'cost', header: t('pages.batches.columns.cost'), align: 'right', cell: (r) => fmt.currency(r.batch.cost), sort: (r) => r.batch.cost, hideOnMobile: true },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.batches.title')}
        description={t('pages.batches.subtitle')}
        actions={
          data ? (
            <div className="flex flex-wrap items-center gap-2">
              <ScanButton onScan={openScannedBatch} />
              {canWrite && (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <Plus aria-hidden className="size-4" />
                  {t('pages.batches.new')}
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
      {!data || !stats ? (
        <>
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <StatGrid>
            <StatCard label={t('pages.batches.stats.active')} value={fmt.number(activeCount)} hint={t('pages.batches.stats.activeHint', { count: plannedCount })} icon={<Layers aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.batches.stats.ready')} value={fmt.number(readyCount)} hint={t('pages.batches.stats.readyHint')} icon={<Scissors aria-hidden className="size-3.5" />} />
            <StatCard
              label={t('pages.batches.stats.overdue')}
              value={fmt.number(overdueCount)}
              hint={t('pages.batches.stats.overdueHint')}
              tone={overdueCount ? 'danger' : 'default'}
              icon={<AlertTriangle aria-hidden className="size-3.5" />}
            />
            <StatCard label={t('pages.batches.stats.lossRate')} value={fmt.percent(stats.lossRate)} hint={t('pages.batches.stats.lossHint')} tone={stats.lossRate > 0.1 ? 'warning' : 'default'} />
          </StatGrid>
          <Card>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.batches.searchPlaceholder')} />
              <FilterSelect label={t('pages.batches.filters.status')} value={statusFilter} onChange={setStatusFilter} options={STATUSES.map((s) => ({ value: s, label: t(`batch.status.${s}`) }))} />
              <FilterSelect label={t('pages.batches.filters.species')} value={speciesFilter} onChange={setSpeciesFilter} options={data.species.map((s) => ({ value: s.id, label: s.name }))} />
              <FilterSelect label={t('pages.batches.filters.room')} value={roomFilter} onChange={setRoomFilter} options={data.rooms.map((r) => ({ value: r.id, label: r.name }))} />
            </Toolbar>
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(r) => r.batch.id}
              label={t('pages.batches.title')}
              onRowClick={(r) => setSelectedId(r.batch.id)}
              mobileTitle={(r) => <span className="font-mono">#{r.batch.code}</span>}
              emptyTitle={data.batches.length ? t('table.noMatches') : t('table.empty')}
              initialSort={{ key: 'spawn', dir: 'desc' }}
            />
          </Card>
        </>
      )}
      {creating && data && <BatchForm data={data} onClose={() => setCreating(false)} />}
      {selected && data && (
        <BatchDrawer
          open={!harvestFor && !confirm}
          batch={selected}
          species={data.species.find((s) => s.id === selected.speciesId)}
          room={data.rooms.find((r) => r.id === selected.roomId)}
          harvests={data.harvests.filter((h) => h.batchId === selected.id)}
          events={events}
          employees={data.employees}
          canWrite={canWrite}
          canHarvest={canHarvest}
          pending={setStatus.pending || setLocation.pending}
          onClose={() => setSelectedId(null)}
          onHarvest={() => setHarvestFor(selected.id)}
          onStatus={(next) => (next === 'FAILED' || next === 'DISCARDED' ? setConfirm({ batch: selected, status: next }) : void changeStatus(selected, next))}
          onLocation={(code) => void changeLocation(selected, code)}
        />
      )}
      {harvestFor && data && <HarvestForm data={data} batchId={harvestFor} onClose={() => setHarvestFor(null)} />}
      <ConfirmDialog
        open={!!confirm}
        tone="danger"
        title={confirm ? t('pages.batches.drawer.confirmTitle', { code: confirm.batch.code, status: t(`batch.status.${confirm.status}`) }) : ''}
        description={t('pages.batches.drawer.confirmDescription')}
        confirmLabel={confirm ? t(`batch.status.${confirm.status}`) : undefined}
        pending={setStatus.pending}
        onConfirm={() => confirm && void changeStatus(confirm.batch, confirm.status)}
        onClose={() => setConfirm(null)}
      />
    </PageShell>
  )
}
