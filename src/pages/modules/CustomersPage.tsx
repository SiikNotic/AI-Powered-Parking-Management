import { ArrowRight, Mail, Pencil, Phone, Plus, Receipt, Trophy, UserCheck, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { OrderStatusBadge } from '@/components/modules/orders/OrderBadges'
import { CUSTOMER_TYPES, isReceivable, PAYMENT_TERMS, SALES_WRITERS } from '@/components/modules/orders/orderRules'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { isRecognized, orderTotals } from '@/domain/finance'
import { addDays } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { Customer, CustomerType, Order } from '@/types'

type Draft = Omit<Customer, 'id' | 'farmId'> & { id?: string }
type Row = Customer & { orders: Order[]; revenue: number; balance: number; unpaidCount: number; lastOrder: string | null }

const emptyDraft: Draft = { name: '', company: '', type: 'restaurant', email: '', phone: '', paymentTerms: 'due_on_receipt' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^[+()\d\s.-]{7,}$/

export function CustomersPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<CustomerType | ''>('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [now] = useState(() => Date.now())
  const canEdit = SALES_WRITERS.includes(user.role)

  const allRows = useMemo<Row[]>(() => {
    if (!data) return []
    const byCustomer = new Map<string, Order[]>()
    for (const o of data.orders) byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) ?? []), o])
    return data.customers.map((c) => {
      const orders = (byCustomer.get(c.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const receivable = orders.filter(isReceivable)
      return {
        ...c,
        orders,
        revenue: orders.filter(isRecognized).reduce((s, o) => s + orderTotals(o).netRevenue, 0),
        balance: receivable.reduce((s, o) => s + orderTotals(o).total, 0),
        unpaidCount: receivable.length,
        lastOrder: orders.find((o) => o.status !== 'CANCELLED')?.createdAt ?? null,
      }
    })
  }, [data])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((c) => (!type || c.type === type) && (!q || [c.name, c.company ?? '', c.email, c.phone].some((v) => v.toLowerCase().includes(q))))
  }, [allRows, query, type])

  const stats = useMemo(() => {
    const since = addDays(new Date(now), -30).toISOString()
    const top = allRows.reduce<Row | null>((best, c) => (c.revenue > (best?.revenue ?? 0) ? c : best), null)
    return {
      active: allRows.filter((c) => c.lastOrder && c.lastOrder >= since).length,
      top,
      receivables: allRows.reduce((s, c) => s + c.balance, 0),
      unpaid: allRows.reduce((s, c) => s + c.unpaidCount, 0),
    }
  }, [allRows, now])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const selected = allRows.find((c) => c.id === params.get('customer'))
  const setSelected = (id: string | null) =>
    setParams(
      (p) => {
        if (id) p.set('customer', id)
        else p.delete('customer')
        return p
      },
      { replace: true },
    )
  const toDraft = (c: Row): Draft => ({ id: c.id, name: c.name, company: c.company ?? '', type: c.type, email: c.email, phone: c.phone, paymentTerms: c.paymentTerms })

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: t('pages.customers.columns.name'),
      cell: (c) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-text">{c.name}</span>
          {c.company && <span className="block truncate text-xs font-normal text-text-muted">{c.company}</span>}
        </span>
      ),
      sort: (c) => c.name,
    },
    { key: 'type', header: t('pages.customers.columns.type'), cell: (c) => <Badge>{t(`labels.customerType.${c.type}`)}</Badge>, sort: (c) => c.type },
    { key: 'email', header: t('pages.customers.columns.email'), cell: (c) => c.email || '—', sort: (c) => c.email, hideOnMobile: true },
    { key: 'phone', header: t('pages.customers.columns.phone'), cell: (c) => <span className="whitespace-nowrap">{c.phone || '—'}</span>, hideOnMobile: true },
    { key: 'terms', header: t('pages.customers.columns.terms'), cell: (c) => <span className="whitespace-nowrap">{t(`labels.paymentTerms.${c.paymentTerms}`)}</span>, sort: (c) => c.paymentTerms, hideOnMobile: true },
    { key: 'orders', header: t('pages.customers.columns.orders'), align: 'right', cell: (c) => fmt.number(c.orders.length), sort: (c) => c.orders.length },
    { key: 'revenue', header: t('pages.customers.columns.revenue'), align: 'right', cell: (c) => <span className="font-medium text-text">{fmt.currency(c.revenue)}</span>, sort: (c) => c.revenue },
    { key: 'last', header: t('pages.customers.columns.lastOrder'), cell: (c) => (c.lastOrder ? fmt.dayMonth(c.lastOrder) : t('pages.customers.never')), sort: (c) => c.lastOrder ?? '' },
    {
      key: 'balance',
      header: t('pages.customers.columns.balance'),
      align: 'right',
      cell: (c) => (c.balance > 0 ? <span className="font-semibold text-warn-ink">{fmt.exactCurrency(c.balance)}</span> : '—'),
      sort: (c) => c.balance,
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.customers.title')}
        description={t('pages.customers.subtitle')}
        actions={
          canEdit && data ? (
            <Button variant="primary" onClick={() => setDraft({ ...emptyDraft })}>
              <Plus aria-hidden className="size-4" />
              {t('pages.customers.new')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <LoadingState className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-card" />
        </LoadingState>
      ) : (
        <>
          <StatGrid>
            <StatCard label={t('pages.customers.stats.customers')} value={fmt.number(allRows.length)} icon={<Users aria-hidden className="size-3.5" />} />
            <StatCard
              label={t('pages.customers.stats.active')}
              value={fmt.number(stats.active)}
              hint={allRows.length ? t('pages.customers.stats.activeHint', { pct: fmt.percent(stats.active / allRows.length) }) : undefined}
              icon={<UserCheck aria-hidden className="size-3.5" />}
            />
            <StatCard
              label={t('pages.customers.stats.top')}
              value={stats.top ? fmt.currency(stats.top.revenue) : '—'}
              hint={stats.top ? (stats.top.company ?? stats.top.name) : t('pages.customers.stats.none')}
              icon={<Trophy aria-hidden className="size-3.5" />}
            />
            <StatCard
              label={t('pages.customers.stats.receivables')}
              value={fmt.currency(stats.receivables)}
              tone={stats.receivables > 0 ? 'warning' : 'default'}
              hint={t('pages.customers.stats.receivablesHint', { count: stats.unpaid })}
              icon={<Receipt aria-hidden className="size-3.5" />}
            />
          </StatGrid>
          <Card>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.customers.searchPlaceholder')} />
              <FilterSelect label={t('pages.customers.type')} value={type} onChange={setType} options={CUSTOMER_TYPES.map((v) => ({ value: v, label: t(`labels.customerType.${v}`) }))} />
            </Toolbar>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(c) => c.id}
              label={t('pages.customers.title')}
              onRowClick={(c) => setSelected(c.id)}
              emptyTitle={data.customers.length ? t('table.noMatches') : t('table.empty')}
              initialSort={{ key: 'revenue', dir: 'desc' }}
            />
          </Card>
        </>
      )}
      {selected && !draft && (
        <CustomerDrawer
          customer={selected}
          canEdit={canEdit}
          onEdit={() => setDraft(toDraft(selected))}
          onClose={() => setSelected(null)}
        />
      )}
      {draft && <CustomerForm draft={draft} onClose={() => setDraft(null)} />}
    </PageShell>
  )
}

function CustomerDrawer({ customer, canEdit, onEdit, onClose }: { customer: Row; canEdit: boolean; onEdit: () => void; onClose: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const facts: [string, string][] = [
    [t('pages.customers.detail.orders'), fmt.number(customer.orders.length)],
    [t('pages.customers.detail.revenue'), fmt.exactCurrency(customer.revenue)],
    [t('pages.customers.detail.balance'), customer.balance > 0 ? fmt.exactCurrency(customer.balance) : '—'],
    [t('pages.customers.detail.lastOrder'), customer.lastOrder ? fmt.dayMonth(customer.lastOrder) : t('pages.customers.never')],
  ]
  return (
    <Modal
      open
      side
      onClose={onClose}
      title={customer.name}
      description={customer.company || undefined}
      footer={
        canEdit ? (
          <Button onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
            {t('pages.customers.edit')}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{t(`labels.customerType.${customer.type}`)}</Badge>
          <Badge tone="info">{t(`labels.paymentTerms.${customer.paymentTerms}`)}</Badge>
        </div>
        <section aria-labelledby="customer-contact" className="tile space-y-1.5 rounded-xl p-3.5 text-sm">
          <h3 id="customer-contact" className="eyebrow">
            {t('pages.customers.detail.contact')}
          </h3>
          {customer.email && (
            <p className="flex min-w-0 items-center gap-1.5 text-text-secondary">
              <Mail aria-hidden className="size-3.5 shrink-0" />
              <a href={`mailto:${customer.email}`} className="truncate hover:text-text hover:underline">
                {customer.email}
              </a>
            </p>
          )}
          {customer.phone && (
            <p className="flex items-center gap-1.5 text-text-secondary">
              <Phone aria-hidden className="size-3.5 shrink-0" />
              <a href={`tel:${customer.phone}`} className="hover:text-text hover:underline">
                {customer.phone}
              </a>
            </p>
          )}
          {!customer.email && !customer.phone && <p className="text-text-muted">{t('pages.orders.detail.noContact')}</p>}
        </section>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="tabular truncate font-medium text-text">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="-mt-3 text-xs text-text-muted">{t('pages.customers.detail.revenueHint')}</p>
        <section aria-labelledby="customer-history">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id="customer-history" className="eyebrow">
              {t('pages.customers.detail.history')}
            </h3>
            {customer.orders.length > 0 && (
              <Link to={`/orders?q=${encodeURIComponent(customer.name)}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-ink hover:underline">
                {t('pages.customers.detail.viewAll')}
                <ArrowRight aria-hidden className="size-3" />
              </Link>
            )}
          </div>
          {!customer.orders.length ? (
            <EmptyState title={t('pages.customers.detail.noOrders')} className="py-6" />
          ) : (
            <ul className="divide-y divide-border">
              {customer.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders?order=${o.code}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 text-sm hover:bg-surface-hover focus-visible:bg-surface-hover">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-text">{o.code}</span>
                      <span className="block text-xs text-text-muted">{fmt.dayMonth(o.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <OrderStatusBadge status={o.status} />
                      <span className="tabular w-20 text-right text-text">{fmt.exactCurrency(orderTotals(o).total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}

function CustomerForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveCustomer')
  const [form, setForm] = useState({ ...draft, company: draft.company ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = t('pages.customers.errors.name')
    if (email && !EMAIL.test(email)) next.email = t('pages.customers.errors.email')
    if (phone && !PHONE.test(phone)) next.phone = t('pages.customers.errors.phone')
    if (!email && !phone) next.email = t('pages.customers.errors.contact')
    setErrors(next)
    if (Object.keys(next).length) return
    const company = form.company.trim()
    const result = await save.run([{ ...form, name: form.name.trim(), company: company || undefined, email, phone }], t('pages.customers.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.customers.editTitle') : t('pages.customers.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="customer-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate>
        <FormGrid>
          <Field label={t('pages.customers.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} />}
          </Field>
          <Field label={t('pages.customers.fields.company')} optional>
            {(p) => <TextInput {...p} autoComplete="off" value={form.company} onChange={(e) => set('company', e.target.value)} />}
          </Field>
          <Field label={t('pages.customers.fields.type')}>
            {(p) => (
              <Select {...p} value={form.type} onChange={(e) => set('type', e.target.value as CustomerType)}>
                {CUSTOMER_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`labels.customerType.${v}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.customers.fields.terms')} hint={t('pages.customers.fields.termsHint')}>
            {(p) => (
              <Select {...p} value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value as Customer['paymentTerms'])}>
                {PAYMENT_TERMS.map((v) => (
                  <option key={v} value={v}>
                    {t(`labels.paymentTerms.${v}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.customers.fields.email')} error={errors.email}>
            {(p) => <TextInput {...p} type="email" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />}
          </Field>
          <Field label={t('pages.customers.fields.phone')} error={errors.phone}>
            {(p) => <TextInput {...p} type="tel" autoComplete="off" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}
          </Field>
        </FormGrid>
      </form>
    </Modal>
  )
}
