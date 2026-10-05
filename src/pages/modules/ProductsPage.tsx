import { Package, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Checkbox, Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { stockByProduct } from '@/domain/inventory'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { InventoryProduct, ProductCategory } from '@/types'

const CATEGORIES: ProductCategory[] = ['fresh', 'dried', 'powder', 'kit', 'spawn', 'substrate', 'packaging', 'supplies']

type Draft = Omit<InventoryProduct, 'id' | 'farmId'> & { id?: string }

const emptyDraft = (locationId: string): Draft => ({
  sku: '',
  name: '',
  speciesId: null,
  category: 'fresh',
  unit: 'lb',
  unitWeight: null,
  cost: 0,
  price: 0,
  reorderPoint: 0,
  locationId,
  perishable: true,
})

export function ProductsPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { can } = useSession()
  const { data, status, retry } = useFarmData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [draft, setDraft] = useState<Draft | null>(null)
  // Managers, owners and sales can edit the catalog (same as the RLS policy).
  const canEdit = can('inventory.view') && can('sales.view')

  const stock = useMemo(() => (data ? stockByProduct(data.movements) : new Map<string, number>()), [data])
  const speciesName = useMemo(() => new Map((data?.species ?? []).map((s) => [s.id, s.name])), [data])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.products ?? []).filter((p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
  }, [data, query, category])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const sold = (data?.products ?? []).filter((p) => p.price > 0)
  const avgMargin = sold.length ? sold.reduce((s, p) => s + (p.price - p.cost) / p.price, 0) / sold.length : null
  const unitLabel = (p: InventoryProduct) => t(`labels.unit.${p.unit}`)

  const columns: Column<InventoryProduct>[] = [
    { key: 'name', header: t('pages.products.columns.name'), cell: (p) => <span className="font-medium text-text">{p.name}</span>, sort: (p) => p.name },
    { key: 'sku', header: t('pages.products.columns.sku'), cell: (p) => <span className="font-mono text-xs">{p.sku}</span>, sort: (p) => p.sku },
    { key: 'category', header: t('pages.products.columns.category'), cell: (p) => <Badge>{t(`labels.productCategory.${p.category}`)}</Badge>, sort: (p) => p.category },
    { key: 'species', header: t('pages.products.columns.species'), cell: (p) => (p.speciesId ? speciesName.get(p.speciesId) : '—'), hideOnMobile: true },
    { key: 'stock', header: t('pages.products.columns.stock'), align: 'right', cell: (p) => `${fmt.decimal(Math.max(0, stock.get(p.id) ?? 0))} ${unitLabel(p)}`, sort: (p) => stock.get(p.id) ?? 0 },
    { key: 'cost', header: t('pages.products.columns.cost'), align: 'right', cell: (p) => fmt.exactCurrency(p.cost), sort: (p) => p.cost },
    { key: 'price', header: t('pages.products.columns.price'), align: 'right', cell: (p) => (p.price ? fmt.exactCurrency(p.price) : '—'), sort: (p) => p.price },
    { key: 'margin', header: t('pages.products.columns.margin'), align: 'right', cell: (p) => (p.price ? fmt.percent((p.price - p.cost) / p.price) : '—'), sort: (p) => (p.price ? (p.price - p.cost) / p.price : -1), hideOnMobile: true },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.products.title')}
        description={t('pages.products.subtitle')}
        actions={
          canEdit && data ? (
            <Button variant="primary" onClick={() => setDraft(emptyDraft(data.locations[0]?.id ?? ''))}>
              <Plus aria-hidden className="size-4" />
              {t('pages.products.new')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <Skeleton className="h-96 rounded-card" />
      ) : (
        <>
          <StatGrid>
            <StatCard label={t('pages.products.stats.products')} value={fmt.number(data.products.length)} icon={<Package aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.products.stats.mushroom')} value={fmt.number(data.products.filter((p) => p.speciesId).length)} />
            <StatCard label={t('pages.products.stats.supplies')} value={fmt.number(data.products.filter((p) => !p.speciesId).length)} />
            <StatCard label={t('pages.products.stats.avgMargin')} value={avgMargin !== null ? fmt.percent(avgMargin) : '—'} />
          </StatGrid>
          <Card>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.products.searchPlaceholder')} />
              <FilterSelect label={t('pages.products.category')} value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: t(`labels.productCategory.${c}`) }))} />
            </Toolbar>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(p) => p.id}
              label={t('pages.products.title')}
              onRowClick={canEdit ? (p) => setDraft({ ...p }) : undefined}
              emptyTitle={data.products.length ? t('table.noMatches') : t('table.empty')}
              initialSort={{ key: 'name', dir: 'asc' }}
            />
          </Card>
        </>
      )}
      {draft && data && <ProductForm draft={draft} onClose={() => setDraft(null)} />}
    </PageShell>
  )
}

function ProductForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useI18n()
  const { data } = useFarmData()
  const save = useCommand('saveProduct')
  const [form, setForm] = useState({ ...draft, cost: String(draft.cost), price: String(draft.price), reorderPoint: String(draft.reorderPoint), unitWeight: draft.unitWeight === null ? '' : String(draft.unitWeight) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cost = toNumber(form.cost)
    const price = toNumber(form.price)
    const reorderPoint = toNumber(form.reorderPoint)
    const unitWeight = form.unitWeight.trim() ? toNumber(form.unitWeight) : null
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = t('pages.products.errors.name')
    if (!form.sku.trim()) next.sku = t('pages.products.errors.sku')
    if (![cost, price, reorderPoint].every((n) => n >= 0) || (unitWeight !== null && !(unitWeight > 0))) next.numbers = t('pages.products.errors.numbers')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await save.run(
      [{ ...form, name: form.name.trim(), sku: form.sku.trim().toUpperCase(), cost, price, reorderPoint, unitWeight }],
      t('pages.products.saved'),
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.products.editTitle') : t('pages.products.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="product-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.products.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={form.name} onChange={(e) => set('name', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.sku')} error={errors.sku}>
            {(p) => <TextInput {...p} value={form.sku} onChange={(e) => set('sku', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.category')}>
            {(p) => (
              <Select {...p} value={form.category} onChange={(e) => set('category', e.target.value as ProductCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`labels.productCategory.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.products.fields.species')}>
            {(p) => (
              <Select {...p} value={form.speciesId ?? ''} onChange={(e) => set('speciesId', e.target.value || null)}>
                <option value="">{t('pages.products.fields.noSpecies')}</option>
                {(data?.species ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.products.fields.unit')}>
            {(p) => (
              <Select {...p} value={form.unit} onChange={(e) => set('unit', e.target.value as InventoryProduct['unit'])}>
                {(['lb', 'oz', 'unit'] as const).map((u) => (
                  <option key={u} value={u}>
                    {t(`labels.unit.${u}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.products.fields.unitWeight')} hint={t('pages.products.fields.unitWeightHint')} optional>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.unitWeight} onChange={(e) => set('unitWeight', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.cost')} error={errors.numbers}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.cost} onChange={(e) => set('cost', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.price')} hint={t('pages.products.fields.priceHint')}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.reorderPoint')}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.reorderPoint} onChange={(e) => set('reorderPoint', e.target.value)} />}
          </Field>
          <Field label={t('pages.products.fields.location')}>
            {(p) => (
              <Select {...p} value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
                {(data?.locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FormGrid>
        <Checkbox label={t('pages.products.fields.perishable')} checked={form.perishable} onChange={(e) => set('perishable', e.target.checked)} />
      </form>
    </Modal>
  )
}
