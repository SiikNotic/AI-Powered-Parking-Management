import { AlertTriangle, ArrowLeftRight, Clock, Download, Minus, Package, PackagePlus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MovementDialog, type MovementKind, type MovementPreset } from '@/components/modules/inventory/MovementDialog'
import { SignedQty, StockDrawer } from '@/components/modules/inventory/StockDrawer'
import { useNow } from '@/components/modules/inventory/useNow'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Checkbox } from '@/components/ui/Form'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { expiringLots, stockByProduct, stockLines, summarizeInventory, toPounds, type ExpiringLot, type StockLine } from '@/domain/inventory'
import { DAY_MS } from '@/domain/time'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { downloadCsv } from '@/lib/csv'
import type { InventoryMovement, MovementType, ProductCategory, Role } from '@/types'

type Tab = 'stock' | 'movements' | 'expiring'
type PeriodFilter = '7' | '30' | '90'

const CATEGORIES: ProductCategory[] = ['fresh', 'dried', 'powder', 'kit', 'spawn', 'substrate', 'packaging', 'supplies']
const MOVEMENT_TYPES: MovementType[] = ['RECEIVED', 'PRODUCED', 'HARVESTED', 'PACKED', 'SOLD', 'DAMAGED', 'WASTED', 'ADJUSTMENT', 'TRANSFERRED']
/** Roles allowed to write inventory movements (same as the RLS policy). */
const WRITERS: Role[] = ['OWNER', 'FARM_MANAGER', 'GROWER', 'PACKING', 'SALES']

export function InventoryPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const canWrite = WRITERS.includes(user.role)

  const [tab, setTab] = useState<Tab>('stock')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [location, setLocation] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('')
  const [productFilter, setProductFilter] = useState('')
  const [period, setPeriod] = useState<PeriodFilter | ''>('30')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ kind: MovementKind; preset?: MovementPreset } | null>(null)

  const now = useNow()
  const stock = useMemo(() => (data ? stockByProduct(data.movements) : new Map<string, number>()), [data])
  const lines = useMemo(() => (data ? stockLines(data.products, stock) : []), [data, stock])
  const summary = useMemo(() => (data ? summarizeInventory(data.products, stock) : null), [data, stock])
  const expiring = useMemo(() => (data ? expiringLots(data.products, data.movements, now, 2) : []), [data, now])
  const locationName = useMemo(() => new Map((data?.locations ?? []).map((l) => [l.id, l.name])), [data])
  const productById = useMemo(() => new Map((data?.products ?? []).map((p) => [p.id, p])), [data])
  const batchCode = useMemo(() => new Map((data?.batches ?? []).map((b) => [b.id, b.code])), [data])

  const stockRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lines.filter(
      (l) =>
        (!category || l.product.category === category) &&
        (!location || l.product.locationId === location) &&
        (!lowOnly || l.low) &&
        (!q || l.product.name.toLowerCase().includes(q) || l.product.sku.toLowerCase().includes(q)),
    )
  }, [lines, query, category, location, lowOnly])

  const movementRows = useMemo(() => {
    const since = period ? now.getTime() - Number(period) * DAY_MS : -Infinity
    return (data?.movements ?? []).filter((m) => (!typeFilter || m.type === typeFilter) && (!productFilter || m.productId === productFilter) && new Date(m.date).getTime() >= since)
  }, [data, typeFilter, productFilter, period, now])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const selected = selectedId ? lines.find((l) => l.product.id === selectedId) : undefined
  const unitOf = (productId: string) => {
    const p = productById.get(productId)
    return p ? t(`labels.unit.${p.unit}`) : ''
  }

  const statusBadge = (l: StockLine) =>
    l.out ? (
      <Badge tone="danger" icon={<Minus aria-hidden className="size-3" />}>
        {t('pages.inventory.status.out')}
      </Badge>
    ) : l.low ? (
      <Badge tone="warning" icon={<AlertTriangle aria-hidden className="size-3" />}>
        {t('pages.inventory.status.low')}
      </Badge>
    ) : (
      <Badge>{t('pages.inventory.status.ok')}</Badge>
    )

  const stockColumns: Column<StockLine>[] = [
    {
      key: 'product',
      header: t('pages.inventory.columns.product'),
      cell: (l) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-text">{l.product.name}</span>
          <span className="font-mono text-[0.6875rem] text-text-muted">{l.product.sku}</span>
        </span>
      ),
      sort: (l) => l.product.name,
    },
    { key: 'category', header: t('pages.inventory.columns.category'), cell: (l) => t(`labels.productCategory.${l.product.category}`), sort: (l) => l.product.category, hideOnMobile: true },
    { key: 'location', header: t('pages.inventory.columns.location'), cell: (l) => locationName.get(l.product.locationId) ?? '—', sort: (l) => locationName.get(l.product.locationId) ?? '', hideOnMobile: true },
    {
      key: 'onHand',
      header: t('pages.inventory.columns.onHand'),
      align: 'right',
      cell: (l) => {
        const lb = toPounds(l.product, l.quantity)
        return (
          <span>
            <span className="text-text">
              {fmt.decimal(l.quantity)} {t(`labels.unit.${l.product.unit}`)}
            </span>
            {lb !== null && l.product.unit !== 'lb' && <span className="block text-[0.6875rem] text-text-muted">{t('pages.inventory.lbEquivalent', { lb: fmt.pounds(lb) })}</span>}
          </span>
        )
      },
      sort: (l) => l.quantity,
    },
    { key: 'reorder', header: t('pages.inventory.columns.reorder'), align: 'right', cell: (l) => fmt.decimal(l.product.reorderPoint), sort: (l) => l.product.reorderPoint, hideOnMobile: true },
    { key: 'status', header: t('pages.inventory.columns.status'), cell: statusBadge, sort: (l) => (l.out ? 0 : l.low ? 1 : 2) },
    { key: 'value', header: t('pages.inventory.columns.value'), align: 'right', cell: (l) => fmt.currency(l.value), sort: (l) => l.value },
  ]

  const movementColumns: Column<InventoryMovement>[] = [
    { key: 'date', header: t('pages.inventory.columns.date'), cell: (m) => <span className="whitespace-nowrap">{fmt.dayMonthTime(m.date)}</span>, sort: (m) => m.date },
    { key: 'product', header: t('pages.inventory.columns.product'), cell: (m) => <span className="font-medium text-text">{productById.get(m.productId)?.name ?? '—'}</span>, sort: (m) => productById.get(m.productId)?.name ?? '' },
    { key: 'type', header: t('pages.inventory.columns.type'), cell: (m) => <Badge>{t(`labels.movementType.${m.type}`)}</Badge>, sort: (m) => m.type },
    { key: 'quantity', header: t('pages.inventory.columns.quantity'), align: 'right', cell: (m) => <SignedQty value={m.quantity} unit={unitOf(m.productId)} />, sort: (m) => m.quantity },
    { key: 'reference', header: t('pages.inventory.columns.reference'), cell: (m) => <span className="line-clamp-1 max-w-64">{m.reference || '—'}</span>, hideOnMobile: true },
    { key: 'batch', header: t('pages.inventory.columns.batch'), cell: (m) => (m.batchId ? <span className="font-mono text-xs">{batchCode.get(m.batchId) ?? '—'}</span> : '—'), hideOnMobile: true },
  ]

  const expiryLabel = (lot: ExpiringLot) => {
    const hours = lot.daysLeft * 24
    if (hours >= 0) return t('pages.inventory.expiresIn', { hours: Math.max(1, Math.round(hours)) })
    return -hours < 24 ? t('pages.inventory.expiredHoursAgo', { hours: Math.max(1, Math.round(-hours)) }) : t('pages.inventory.expiredAgo', { days: Math.floor(-lot.daysLeft) })
  }

  const writeOff = (lot: ExpiringLot) =>
    setDialog({ kind: 'waste', preset: { productId: lot.product.id, quantity: lot.quantity, reference: t('pages.inventory.writeOffReference', { date: fmt.dayMonth(lot.expiresAt) }) } })

  const expiringColumns: Column<ExpiringLot>[] = [
    { key: 'product', header: t('pages.inventory.columns.product'), cell: (l) => <span className="font-medium text-text">{l.product.name}</span>, sort: (l) => l.product.name },
    { key: 'quantity', header: t('pages.inventory.columns.quantity'), align: 'right', cell: (l) => `${fmt.decimal(l.quantity)} ${t(`labels.unit.${l.product.unit}`)}`, sort: (l) => l.quantity },
    {
      key: 'expires',
      header: t('pages.inventory.columns.expires'),
      cell: (l) => (
        <span className="whitespace-nowrap">
          {fmt.dayMonthTime(l.expiresAt)} <span className="text-text-muted">· {expiryLabel(l)}</span>
        </span>
      ),
      sort: (l) => l.expiresAt,
    },
    {
      key: 'status',
      header: t('pages.inventory.columns.status'),
      cell: (l) =>
        l.daysLeft < 0 ? (
          <Badge tone="danger" icon={<AlertTriangle aria-hidden className="size-3" />}>
            {t('pages.inventory.status.expired')}
          </Badge>
        ) : (
          <Badge tone="warning" icon={<Clock aria-hidden className="size-3" />}>
            {t('pages.inventory.status.expiresSoon')}
          </Badge>
        ),
      sort: (l) => l.daysLeft,
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: t('pages.inventory.columns.actions'),
            align: 'right' as const,
            cell: (l: ExpiringLot) => (
              <Button size="sm" variant="secondary" onClick={() => writeOff(l)}>
                <Trash2 aria-hidden className="size-3.5" />
                {t('pages.inventory.actions.writeOff')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  const exportMovements = () => {
    const rows = [...movementRows].sort((a, b) => b.date.localeCompare(a.date))
    downloadCsv(
      `${t('pages.inventory.csvName')}.csv`,
      [t('pages.inventory.columns.date'), t('pages.inventory.columns.product'), 'SKU', t('pages.inventory.columns.type'), t('pages.inventory.columns.quantity'), t('labels.unit.unit'), t('pages.inventory.columns.reference'), t('pages.inventory.columns.batch')],
      rows.map((m) => {
        const p = productById.get(m.productId)
        return [m.date, p?.name ?? '', p?.sku ?? '', t(`labels.movementType.${m.type}`), m.quantity, p ? t(`labels.unit.${p.unit}`) : '', m.reference ?? '', m.batchId ? (batchCode.get(m.batchId) ?? '') : '']
      }),
    )
  }

  const productOptions = (data?.products ?? []).map((p) => ({ value: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label))
  const expiringLb = expiring.reduce((s, l) => s + (toPounds(l.product, l.quantity) ?? 0), 0)

  return (
    <PageShell>
      <PageHeader
        title={t('pages.inventory.title')}
        description={t('pages.inventory.subtitle')}
        actions={
          canWrite && data ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setDialog({ kind: 'receive' })}>
                <PackagePlus aria-hidden className="size-4" />
                {t('pages.inventory.actions.receive')}
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'adjust' })}>
                <SlidersHorizontal aria-hidden className="size-4" />
                {t('pages.inventory.actions.adjust')}
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'waste' })}>
                <Trash2 aria-hidden className="size-4" />
                {t('pages.inventory.actions.waste')}
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'transfer' })}>
                <ArrowLeftRight aria-hidden className="size-4" />
                {t('pages.inventory.actions.transfer')}
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'pack' })}>
                <Package aria-hidden className="size-4" />
                {t('pages.inventory.actions.pack')}
              </Button>
            </div>
          ) : undefined
        }
      />
      {!data || !summary ? (
        <>
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t('pages.inventory.stats.available')}
              value={fmt.pounds(summary.availableLb)}
              hint={t('pages.inventory.stats.availableHint', { fresh: fmt.pounds(summary.freshLb), dried: fmt.pounds(summary.driedLb) })}
              icon={<Package aria-hidden className="size-3.5" />}
            />
            <StatCard label={t('pages.inventory.stats.value')} value={fmt.currency(summary.value)} hint={t('pages.inventory.stats.valueHint', { count: lines.filter((l) => !l.out).length })} />
            <StatCard
              label={t('pages.inventory.stats.low')}
              value={fmt.number(summary.lowStock.length)}
              hint={t('pages.inventory.stats.lowHint', { count: lines.filter((l) => l.out).length })}
              tone={summary.lowStock.length ? 'warning' : 'default'}
              icon={<AlertTriangle aria-hidden className="size-3.5" />}
            />
            <StatCard
              label={t('pages.inventory.stats.expiring')}
              value={fmt.pounds(expiringLb)}
              hint={t('pages.inventory.stats.expiringHint', { count: expiring.length })}
              tone={expiring.length ? 'danger' : 'default'}
              icon={<Clock aria-hidden className="size-3.5" />}
            />
          </StatGrid>

          <SegmentedControl
            label={t('pages.inventory.tabs.label')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'stock', label: t('pages.inventory.tabs.stock') },
              { value: 'movements', label: t('pages.inventory.tabs.movements') },
              { value: 'expiring', label: `${t('pages.inventory.tabs.expiring')} (${expiring.length})` },
            ]}
            className="self-start"
          />

          {tab === 'stock' && (
            <Card>
              <Toolbar className="mb-4">
                <SearchInput value={query} onChange={setQuery} placeholder={t('pages.inventory.filters.search')} />
                <FilterSelect label={t('pages.inventory.filters.category')} value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: t(`labels.productCategory.${c}`) }))} />
                <FilterSelect label={t('pages.inventory.filters.location')} value={location} onChange={setLocation} options={data.locations.map((l) => ({ value: l.id, label: l.name }))} />
                <Checkbox label={t('pages.inventory.filters.lowOnly')} checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              </Toolbar>
              <DataTable
                rows={stockRows}
                columns={stockColumns}
                rowKey={(l) => l.product.id}
                label={t('pages.inventory.tabs.stock')}
                onRowClick={(l) => setSelectedId(l.product.id)}
                emptyTitle={lines.length ? t('table.noMatches') : t('table.empty')}
                initialSort={{ key: 'status', dir: 'asc' }}
              />
            </Card>
          )}

          {tab === 'movements' && (
            <Card>
              <Toolbar className="mb-3">
                <FilterSelect label={t('pages.inventory.filters.type')} value={typeFilter} onChange={setTypeFilter} options={MOVEMENT_TYPES.map((m) => ({ value: m, label: t(`labels.movementType.${m}`) }))} />
                <FilterSelect label={t('pages.inventory.filters.product')} value={productFilter} onChange={setProductFilter} options={productOptions} />
                <FilterSelect
                  label={t('pages.inventory.filters.period')}
                  value={period}
                  onChange={setPeriod}
                  options={(['7', '30', '90'] as const).map((p) => ({ value: p, label: t(`pages.inventory.filters.periods.${p}`) }))}
                />
                <Button variant="secondary" onClick={exportMovements} disabled={!movementRows.length} className="sm:ml-auto">
                  <Download aria-hidden className="size-4" />
                  {t('table.exportCsv')}
                </Button>
              </Toolbar>
              <p className="mb-4 text-xs text-text-muted">{t('pages.inventory.ledgerNote')}</p>
              <DataTable
                rows={movementRows}
                columns={movementColumns}
                rowKey={(m) => m.id}
                label={t('pages.inventory.tabs.movements')}
                emptyTitle={data.movements.length ? t('table.noMatches') : t('table.empty')}
                initialSort={{ key: 'date', dir: 'desc' }}
                pageSize={25}
              />
            </Card>
          )}

          {tab === 'expiring' && (
            <Card>
              <p className="mb-4 text-xs text-text-muted">{t('pages.inventory.expiringNote')}</p>
              {expiring.length ? (
                <DataTable rows={expiring} columns={expiringColumns} rowKey={(l) => `${l.product.id}-${l.expiresAt}`} label={t('pages.inventory.tabs.expiring')} initialSort={{ key: 'expires', dir: 'asc' }} />
              ) : (
                <EmptyState title={t('pages.inventory.noExpiring')} description={t('pages.inventory.noExpiringHint')} icon={Clock} />
              )}
            </Card>
          )}
        </>
      )}
      {selected && data && (
        <StockDrawer
          line={selected}
          data={data}
          now={now}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onAction={(kind) => {
            setSelectedId(null)
            setDialog({ kind, preset: { productId: selected.product.id } })
          }}
        />
      )}
      {dialog && data && <MovementDialog kind={dialog.kind} preset={dialog.preset} data={data} onClose={() => setDialog(null)} />}
    </PageShell>
  )
}
