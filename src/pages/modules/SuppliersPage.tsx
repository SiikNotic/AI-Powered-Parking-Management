import { Mail, Pencil, Phone, Plus, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNow } from '@/components/modules/inventory/useNow'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { DAY_MS } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { Expense, Role, Supplier } from '@/types'

/** Roles allowed to edit suppliers (same as the RLS policy). */
const WRITERS: Role[] = ['OWNER', 'FARM_MANAGER', 'ACCOUNTING']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SupplierRow {
  supplier: Supplier
  expenses: Expense[]
  spent30: number
  spent365: number
  purchases: number
  lastPurchase: string | null
}

type Draft = { id?: string; name: string; email: string; phone: string }

/** Expenses belong to a supplier by id, or by vendor name for older unlinked records. */
function belongsTo(e: Expense, s: Supplier) {
  return e.supplierId ? e.supplierId === s.id : e.vendor.trim().toLowerCase() === s.name.trim().toLowerCase()
}

export function SuppliersPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user, can } = useSession()
  const { data, status, retry } = useFarmData()
  const now = useNow()
  const canEdit = WRITERS.includes(user.role)
  const showMoney = can('finance.view')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const allRows = useMemo<SupplierRow[]>(() => {
    if (!data) return []
    const since30 = now.getTime() - 30 * DAY_MS
    const since365 = now.getTime() - 365 * DAY_MS
    return data.suppliers.map((supplier) => {
      const expenses = data.expenses.filter((e) => belongsTo(e, supplier)).sort((a, b) => b.date.localeCompare(a.date))
      const sumSince = (since: number) => expenses.reduce((s, e) => (new Date(e.date).getTime() >= since ? s + e.amount : s), 0)
      const purchases = expenses.filter((e) => e.amount > 0 && !e.correctsId)
      return { supplier, expenses, spent30: sumSince(since30), spent365: sumSince(since365), purchases: purchases.length, lastPurchase: purchases[0]?.date ?? null }
    })
  }, [data, now])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((r) => !q || [r.supplier.name, r.supplier.email, r.supplier.phone].some((v) => v.toLowerCase().includes(q)))
  }, [allRows, query])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const selected = selectedId ? allRows.find((r) => r.supplier.id === selectedId) : undefined
  const total30 = allRows.reduce((s, r) => s + r.spent30, 0)
  const total365 = allRows.reduce((s, r) => s + r.spent365, 0)
  const top = allRows.reduce<SupplierRow | null>((best, r) => (r.spent365 > (best?.spent365 ?? 0) ? r : best), null)

  const columns: Column<SupplierRow>[] = [
    { key: 'name', header: t('pages.suppliers.columns.name'), cell: (r) => <span className="font-medium text-text">{r.supplier.name}</span>, sort: (r) => r.supplier.name },
    {
      key: 'contact',
      header: t('pages.suppliers.columns.contact'),
      cell: (r) => (
        <span className="block min-w-0 text-xs">
          <span className="block truncate">{r.supplier.email || '—'}</span>
          {r.supplier.phone && <span className="block truncate text-text-muted">{r.supplier.phone}</span>}
        </span>
      ),
      hideOnMobile: true,
    },
    ...(showMoney
      ? [
          { key: 'spent30', header: t('pages.suppliers.columns.spent30'), align: 'right' as const, cell: (r: SupplierRow) => fmt.currency(r.spent30), sort: (r: SupplierRow) => r.spent30 },
          { key: 'spent365', header: t('pages.suppliers.columns.spent365'), align: 'right' as const, cell: (r: SupplierRow) => fmt.currency(r.spent365), sort: (r: SupplierRow) => r.spent365 },
          { key: 'purchases', header: t('pages.suppliers.columns.purchases'), align: 'right' as const, cell: (r: SupplierRow) => fmt.number(r.purchases), sort: (r: SupplierRow) => r.purchases, hideOnMobile: true },
          {
            key: 'last',
            header: t('pages.suppliers.columns.last'),
            cell: (r: SupplierRow) => (r.lastPurchase ? fmt.dayMonth(r.lastPurchase) : <span className="text-text-muted">{t('pages.suppliers.never')}</span>),
            sort: (r: SupplierRow) => r.lastPurchase ?? '',
          },
        ]
      : []),
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.suppliers.title')}
        description={t('pages.suppliers.subtitle')}
        actions={
          canEdit && data ? (
            <Button variant="primary" onClick={() => setDraft({ name: '', email: '', phone: '' })}>
              <Plus aria-hidden className="size-4" />
              {t('pages.suppliers.new')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <>
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <StatGrid>
            <StatCard label={t('pages.suppliers.stats.suppliers')} value={fmt.number(data.suppliers.length)} icon={<Truck aria-hidden className="size-3.5" />} />
            {showMoney && (
              <>
                <StatCard label={t('pages.suppliers.stats.spent30')} value={fmt.currency(total30)} />
                <StatCard label={t('pages.suppliers.stats.spent365')} value={fmt.currency(total365)} />
                <StatCard label={t('pages.suppliers.stats.top')} value={top ? <span className="text-lg">{top.supplier.name}</span> : '—'} hint={top ? fmt.currency(top.spent365) : t('pages.suppliers.stats.none')} />
              </>
            )}
          </StatGrid>
          <Card>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.suppliers.searchPlaceholder')} />
            </Toolbar>
            {!showMoney && <p className="mb-3 text-xs text-text-muted">{t('pages.suppliers.financeHidden')}</p>}
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.supplier.id}
              label={t('pages.suppliers.title')}
              onRowClick={(r) => setSelectedId(r.supplier.id)}
              emptyTitle={data.suppliers.length ? t('table.noMatches') : t('table.empty')}
              initialSort={showMoney ? { key: 'spent365', dir: 'desc' } : { key: 'name', dir: 'asc' }}
            />
          </Card>
        </>
      )}
      {selected && (
        <SupplierDrawer
          row={selected}
          showMoney={showMoney}
          onClose={() => setSelectedId(null)}
          onEdit={
            canEdit
              ? () => {
                  setSelectedId(null)
                  setDraft({ id: selected.supplier.id, name: selected.supplier.name, email: selected.supplier.email, phone: selected.supplier.phone })
                }
              : undefined
          }
        />
      )}
      {draft && data && <SupplierForm draft={draft} existing={data.suppliers} onClose={() => setDraft(null)} />}
    </PageShell>
  )
}

function SupplierDrawer({ row, showMoney, onClose, onEdit }: { row: SupplierRow; showMoney: boolean; onClose: () => void; onEdit?: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { supplier, expenses } = row
  return (
    <Modal open side onClose={onClose} title={supplier.name}>
      <div className="space-y-6">
        <section aria-labelledby="supplier-contact">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="supplier-contact" className="eyebrow">
              {t('pages.suppliers.drawer.contact')}
            </h3>
            {onEdit && (
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil aria-hidden className="size-3.5" />
                {t('form.edit')}
              </Button>
            )}
          </div>
          {supplier.email || supplier.phone ? (
            <ul className="space-y-1.5 text-sm">
              {supplier.email && (
                <li className="flex items-center gap-2">
                  <Mail aria-hidden className="size-4 text-text-muted" />
                  <a className="break-all text-text underline-offset-2 hover:underline" href={`mailto:${supplier.email}`}>
                    {supplier.email}
                  </a>
                </li>
              )}
              {supplier.phone && (
                <li className="flex items-center gap-2">
                  <Phone aria-hidden className="size-4 text-text-muted" />
                  <a className="text-text underline-offset-2 hover:underline" href={`tel:${supplier.phone}`}>
                    {supplier.phone}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{t('pages.suppliers.drawer.noContact')}</p>
          )}
        </section>

        {showMoney && (
          <>
            <dl className="grid grid-cols-2 gap-2">
              <Fact label={t('pages.suppliers.columns.spent30')} value={fmt.currency(row.spent30)} />
              <Fact label={t('pages.suppliers.columns.spent365')} value={fmt.currency(row.spent365)} />
              <Fact label={t('pages.suppliers.columns.purchases')} value={fmt.number(row.purchases)} />
              <Fact label={t('pages.suppliers.columns.last')} value={row.lastPurchase ? fmt.dayMonth(row.lastPurchase) : t('pages.suppliers.never')} />
            </dl>
            <section aria-labelledby="supplier-history">
              <h3 id="supplier-history" className="eyebrow mb-1">
                {t('pages.suppliers.drawer.history')}
              </h3>
              <p className="mb-2 text-xs text-text-muted">{t('pages.suppliers.drawer.matchHint')}</p>
              {expenses.length ? (
                <ol className="divide-y divide-border">
                  {expenses.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="break-words text-text">{e.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span>{fmt.dayMonth(e.date)}</span>
                          <Badge>{t(`labels.expenseCategory.${e.category}`)}</Badge>
                          {e.correctsId && <Badge tone="warning">{t('pages.suppliers.drawer.correction')}</Badge>}
                        </div>
                      </div>
                      <span className={`tabular shrink-0 font-medium ${e.amount < 0 ? 'text-crit-ink' : 'text-text'}`}>{fmt.exactCurrency(e.amount)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-text-muted">{t('pages.suppliers.drawer.noHistory')}</p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile rounded-xl p-3">
      <dt className="text-[0.6875rem] text-text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-display text-base font-semibold text-text">{value}</dd>
    </div>
  )
}

function SupplierForm({ draft, existing, onClose }: { draft: Draft; existing: Supplier[]; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveSupplier')
  const [form, setForm] = useState(draft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (key: keyof Draft, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const next: Record<string, string> = {}
    if (!name) next.name = t('pages.suppliers.errors.name')
    else if (existing.some((s) => s.id !== draft.id && s.name.trim().toLowerCase() === name.toLowerCase())) next.name = t('pages.suppliers.errors.duplicate')
    if (email && !EMAIL.test(email)) next.email = t('pages.suppliers.errors.email')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await save.run([{ id: draft.id, name, email, phone: form.phone.trim() }], t('pages.suppliers.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.suppliers.editTitle') : t('pages.suppliers.newTitle')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="supplier-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('pages.suppliers.fields.name')} error={errors.name}>
          {(p) => <TextInput {...p} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoComplete="organization" />}
        </Field>
        <FormGrid>
          <Field label={t('pages.suppliers.fields.email')} error={errors.email} optional>
            {(p) => <TextInput {...p} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />}
          </Field>
          <Field label={t('pages.suppliers.fields.phone')} optional>
            {(p) => <TextInput {...p} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />}
          </Field>
        </FormGrid>
      </form>
    </Modal>
  )
}
