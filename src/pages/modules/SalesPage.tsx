import { Banknote, CreditCard, Landmark, Minus, PackageOpen, Plus, Printer, Receipt, ShoppingCart, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaidBadge } from '@/components/modules/orders/OrderBadges'
import { round2, SALES_WRITERS } from '@/components/modules/orders/orderRules'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { SearchInput } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { useToast } from '@/context/toast'
import { orderTotals } from '@/domain/finance'
import { stockByProduct } from '@/domain/inventory'
import { dayKey } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { toNumber } from '@/lib/number'
import type { InventoryProduct, Order, PaymentMethod, ProductCategory } from '@/types'

type CounterPayment = Extract<PaymentMethod, 'card' | 'cash' | 'transfer'>
const PAYMENTS: CounterPayment[] = ['card', 'cash', 'transfer']
const PAYMENT_ICON: Record<PaymentMethod, ReactNode> = {
  card: <CreditCard aria-hidden className="size-3.5" />,
  cash: <Banknote aria-hidden className="size-3.5" />,
  transfer: <Landmark aria-hidden className="size-3.5" />,
  invoice: <Receipt aria-hidden className="size-3.5" />,
}

interface ReceiptLine {
  productId: string
  name: string
  quantity: number
  unit: InventoryProduct['unit']
  unitPrice: number
}

interface ReceiptData {
  code: string
  date: string
  customerName: string | null
  payment: CounterPayment
  lines: ReceiptLine[]
  discountRate: number
  taxRate: number
  subtotal: number
  discount: number
  tax: number
  total: number
}

type RecentRow = Order & { total: number; customerName: string }

const nowIso = () => new Date().toISOString()

/** Pounds sell in half-pound steps, everything else by the unit. */
const stepFor = (p: InventoryProduct) => (p.unit === 'lb' ? 0.5 : 1)

export function SalesPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const charge = useCommand('createOrder')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [cart, setCart] = useState<Map<string, number>>(() => new Map())
  const [customerId, setCustomerId] = useState('')
  const [payment, setPayment] = useState<CounterPayment>('card')
  const [discountInput, setDiscountInput] = useState('0')
  const [taxInput, setTaxInput] = useState('6')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const canSell = SALES_WRITERS.includes(user.role)

  const stock = useMemo(() => (data ? stockByProduct(data.movements) : new Map<string, number>()), [data])
  const sellable = useMemo(() => (data?.products ?? []).filter((p) => p.price > 0).sort((a, b) => a.name.localeCompare(b.name)), [data])
  const productById = useMemo(() => new Map(sellable.map((p) => [p.id, p])), [sellable])
  const categories = useMemo(() => [...new Set(sellable.map((p) => p.category))], [sellable])
  const customers = useMemo(() => [...(data?.customers ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sellable.filter((p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
  }, [sellable, query, category])

  const inPerson = useMemo(() => {
    if (!data) return { today: [] as RecentRow[], recent: [] as RecentRow[] }
    const names = new Map(data.customers.map((c) => [c.id, c.name]))
    const rows = data.orders
      .filter((o) => o.channel === 'in_person' && o.status === 'COMPLETED')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({ ...o, total: orderTotals(o).total, customerName: names.get(o.customerId) ?? t('pages.sales.cart.walkIn') }))
    const today = dayKey(nowIso())
    return { today: rows.filter((o) => dayKey(o.createdAt) === today), recent: rows.slice(0, 10) }
  }, [data, t])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const available = (id: string) => Math.max(0, stock.get(id) ?? 0)
  const lines = [...cart].flatMap(([id, quantity]) => {
    const p = productById.get(id)
    return p ? [{ product: p, quantity }] : []
  })
  const discountPct = toNumber(discountInput)
  const taxPct = toNumber(taxInput)
  const discountValid = discountPct >= 0 && discountPct <= 100
  const taxValid = taxPct >= 0 && taxPct <= 30
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.product.price, 0)
  const discount = discountValid ? subtotal * (discountPct / 100) : 0
  const tax = taxValid ? (subtotal - discount) * (taxPct / 100) : 0
  const total = subtotal - discount + tax

  const setQty = (p: InventoryProduct, quantity: number) =>
    setCart((c) => {
      const next = new Map(c)
      const q = round2(Math.min(available(p.id), Math.max(0, quantity)))
      if (q > 0) next.set(p.id, q)
      else next.delete(p.id)
      return next
    })
  const add = (p: InventoryProduct) => {
    const current = cart.get(p.id) ?? 0
    setQty(p, current + Math.min(stepFor(p), available(p.id) - current))
  }

  const resetSale = () => {
    setCart(new Map())
    setCustomerId('')
    setPayment('card')
    setDiscountInput('0')
    setTaxInput('6')
  }

  const submit = async () => {
    if (!lines.length || !discountValid || !taxValid) return
    const chargedAt = nowIso()
    const result = await charge.run([
      {
        customerId: customerId || null,
        channel: 'in_person',
        fulfillment: 'pickup',
        paymentMethod: payment,
        discount: discountPct / 100,
        taxRate: taxPct / 100,
        dueAt: chargedAt,
        status: 'COMPLETED',
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, unitPrice: l.product.price })),
      },
    ])
    if (!result.ok) return
    toast.show(t('pages.sales.charged', { code: result.value }))
    setReceipt({
      code: result.value,
      date: chargedAt,
      customerName: customers.find((c) => c.id === customerId)?.name ?? null,
      payment,
      lines: lines.map((l) => ({ productId: l.product.id, name: l.product.name, quantity: l.quantity, unit: l.product.unit, unitPrice: l.product.price })),
      discountRate: discountPct / 100,
      taxRate: taxPct / 100,
      subtotal,
      discount,
      tax,
      total,
    })
    resetSale()
  }

  const todayTotal = inPerson.today.reduce((s, o) => s + o.total, 0)
  const byPayment = PAYMENTS.map((m) => {
    const list = inPerson.today.filter((o) => o.paymentMethod === m)
    return { method: m, count: list.length, total: list.reduce((s, o) => s + o.total, 0) }
  })

  const recentColumns: Column<RecentRow>[] = [
    { key: 'code', header: t('pages.sales.recent.columns.code'), cell: (o) => <span className="font-mono text-xs font-semibold text-text">{o.code}</span> },
    { key: 'date', header: t('pages.sales.recent.columns.date'), cell: (o) => fmt.dayMonthTime(o.createdAt) },
    { key: 'customer', header: t('pages.sales.recent.columns.customer'), cell: (o) => o.customerName, hideOnMobile: true },
    { key: 'items', header: t('pages.sales.recent.columns.items'), align: 'right', cell: (o) => fmt.number(o.items.length), hideOnMobile: true },
    {
      key: 'payment',
      header: t('pages.sales.recent.columns.payment'),
      cell: (o) => (
        <span className="inline-flex items-center gap-1.5">
          {PAYMENT_ICON[o.paymentMethod]}
          {t(`labels.paymentMethod.${o.paymentMethod}`)}
        </span>
      ),
    },
    { key: 'total', header: t('pages.sales.recent.columns.total'), align: 'right', cell: (o) => <span className="font-medium text-text">{fmt.exactCurrency(o.total)}</span> },
  ]

  const itemCount = lines.length

  return (
    <PageShell>
      <PageHeader title={t('pages.sales.title')} description={t('pages.sales.subtitle')} />
      {!data ? (
        <LoadingState className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <Skeleton className="h-[28rem] rounded-card" />
          <Skeleton className="h-[28rem] rounded-card" />
        </LoadingState>
      ) : (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            {/* Products */}
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SearchInput value={query} onChange={setQuery} placeholder={t('pages.sales.searchPlaceholder')} className="sm:max-w-sm" />
              </div>
              {categories.length > 1 && (
                <div role="group" aria-label={t('pages.sales.categories')} className="mb-4 flex flex-wrap gap-1.5">
                  {[null, ...categories].map((c) => {
                    const active = (c ?? '') === category
                    return (
                      <button
                        key={c ?? 'all'}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategory(c ?? '')}
                        className={cn(
                          'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                          active ? 'border-border-strong bg-surface-raised text-text shadow-sm' : 'border-transparent bg-surface-2 text-text-secondary hover:text-text',
                        )}
                      >
                        {c ? t(`labels.productCategory.${c}`) : t('pages.sales.allCategories')}
                      </button>
                    )
                  })}
                </div>
              )}
              {!sellable.length ? (
                <EmptyState icon={PackageOpen} title={t('pages.sales.noProducts')} description={t('pages.sales.noProductsHint')} />
              ) : !visible.length ? (
                <EmptyState title={t('pages.sales.noMatches')} />
              ) : (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                  {visible.map((p) => {
                    const onHand = available(p.id)
                    const inCart = cart.get(p.id) ?? 0
                    const disabled = !canSell || onHand <= 0 || inCart >= onHand
                    const unit = t(`labels.unit.${p.unit}`)
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => add(p)}
                          aria-label={t('pages.sales.addToCart', { name: p.name })}
                          className={cn(
                            'tile flex h-full w-full flex-col items-start gap-1 rounded-xl p-3 text-left transition-[border-color,transform] duration-150',
                            'hover:border-border-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                            inCart > 0 && 'border-brand/60',
                          )}
                        >
                          <span className="line-clamp-2 text-sm font-semibold leading-snug text-text">{p.name}</span>
                          <span className="tabular font-display text-base font-semibold text-text">
                            {fmt.exactCurrency(p.price)}
                            <span className="text-xs font-normal text-text-muted"> / {unit}</span>
                          </span>
                          <span className={cn('mt-auto text-xs', onHand > 0 ? 'text-text-muted' : 'font-medium text-crit-ink')}>
                            {onHand > 0 ? t('pages.sales.onHand', { qty: `${fmt.decimal(onHand)} ${unit}` }) : t('pages.sales.outOfStock')}
                          </span>
                          {inCart > 0 && (
                            <span className="text-xs font-medium text-brand-ink">
                              <ShoppingCart aria-hidden className="mr-1 inline size-3 align-[-1px]" />
                              {fmt.decimal(inCart)} {unit}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {/* Cart */}
            <Card className="lg:sticky lg:top-20" labelledBy="pos-cart">
              <CardHeader
                id="pos-cart"
                title={t('pages.sales.cart.title')}
                subtitle={itemCount ? t('pages.sales.cart.count', { count: itemCount }) : undefined}
                icon={<ShoppingCart aria-hidden className="size-3.5" />}
                action={
                  itemCount ? (
                    <Button size="sm" variant="ghost" onClick={() => setCart(new Map())}>
                      {t('pages.sales.cart.clear')}
                    </Button>
                  ) : undefined
                }
              />
              {!itemCount ? (
                <EmptyState icon={ShoppingCart} title={t('pages.sales.cart.empty')} className="py-6" />
              ) : (
                <ul className="divide-y divide-border">
                  {lines.map(({ product: p, quantity }) => {
                    const unit = t(`labels.unit.${p.unit}`)
                    const atMax = quantity >= available(p.id)
                    return (
                      <li key={p.id} className="py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text">{p.name}</p>
                            <p className="tabular text-xs text-text-muted">
                              {fmt.exactCurrency(p.price)} / {unit}
                            </p>
                          </div>
                          <span className="tabular shrink-0 text-sm font-medium text-text">{fmt.exactCurrency(quantity * p.price)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          <IconButton label={t('pages.sales.cart.decrease', { name: p.name })} className="size-8 bg-surface-2" onClick={() => setQty(p, quantity - stepFor(p))}>
                            <Minus aria-hidden className="size-3.5" />
                          </IconButton>
                          <span aria-live="polite" aria-label={t('pages.sales.cart.quantity', { name: p.name })} className="tabular min-w-16 text-center text-sm font-semibold text-text">
                            {fmt.decimal(quantity)} {unit}
                          </span>
                          <IconButton label={t('pages.sales.cart.increase', { name: p.name })} className="size-8 bg-surface-2" disabled={atMax} onClick={() => add(p)}>
                            <Plus aria-hidden className="size-3.5" />
                          </IconButton>
                          <IconButton label={t('pages.sales.cart.remove', { name: p.name })} className="ml-auto size-8" onClick={() => setQty(p, 0)}>
                            <Trash2 aria-hidden className="size-3.5" />
                          </IconButton>
                        </div>
                        {atMax && <p className="mt-1 text-[0.6875rem] text-warn-ink">{t('pages.sales.cart.maxStock')}</p>}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <Field label={t('pages.sales.cart.customer')} optional>
                  {(p) => (
                    <Select {...p} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                      <option value="">{t('pages.sales.cart.walkIn')}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-text-secondary">{t('pages.sales.cart.payment')}</span>
                  <SegmentedControl<CounterPayment>
                    label={t('pages.sales.cart.payment')}
                    value={payment}
                    onChange={setPayment}
                    className="w-full [&>button]:flex-1"
                    options={PAYMENTS.map((m) => ({ value: m, label: t(`labels.paymentMethod.${m}`) }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('pages.sales.cart.discount')} error={discountValid ? undefined : t('pages.sales.errors.discount')}>
                    {(p) => <TextInput {...p} inputMode="decimal" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} />}
                  </Field>
                  <Field label={t('pages.sales.cart.tax')} error={taxValid ? undefined : t('pages.sales.errors.tax')}>
                    {(p) => <TextInput {...p} inputMode="decimal" value={taxInput} onChange={(e) => setTaxInput(e.target.value)} />}
                  </Field>
                </div>
                <Totals
                  subtotal={subtotal}
                  discount={discount}
                  tax={tax}
                  total={total}
                  discountLabel={t('pages.sales.cart.discountLine', { pct: fmt.percent(discountValid ? discountPct / 100 : 0) })}
                  taxLabel={t('pages.sales.cart.taxLine', { pct: fmt.percent(taxValid ? taxPct / 100 : 0) })}
                />
                {canSell && (
                  <Button variant="primary" className="h-12 w-full text-base" disabled={!itemCount || !discountValid || !taxValid || charge.pending} onClick={submit}>
                    <Wallet aria-hidden className="size-5" />
                    {charge.pending ? t('pages.sales.cart.charging') : t('pages.sales.cart.charge', { amount: fmt.exactCurrency(total) })}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Today */}
          <section aria-labelledby="pos-today" className="space-y-3">
            <h2 id="pos-today" className="font-display text-[1rem] font-semibold text-text">
              {t('pages.sales.today.title')}
            </h2>
            <StatGrid>
              <StatCard label={t('pages.sales.today.sales')} value={fmt.number(inPerson.today.length)} icon={<Receipt aria-hidden className="size-3.5" />} />
              <StatCard label={t('pages.sales.today.collected')} value={fmt.exactCurrency(todayTotal)} hint={t('pages.sales.today.collectedHint')} icon={<Wallet aria-hidden className="size-3.5" />} />
              <StatCard
                label={t('pages.sales.today.avgTicket')}
                value={inPerson.today.length ? fmt.exactCurrency(todayTotal / inPerson.today.length) : '—'}
                icon={<TrendingUp aria-hidden className="size-3.5" />}
              />
              <div className="panel min-w-0 rounded-card p-3.5 sm:p-4">
                <p className="truncate text-[0.75rem] font-medium text-text-secondary">{t('pages.sales.today.byPayment')}</p>
                <ul className="mt-1.5 space-y-1">
                  {byPayment.map((b) => (
                    <li key={b.method} className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-text-secondary">
                        {PAYMENT_ICON[b.method]}
                        <span className="truncate">
                          {t(`labels.paymentMethod.${b.method}`)} ({b.count})
                        </span>
                      </span>
                      <span className="tabular font-medium text-text">{fmt.exactCurrency(b.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </StatGrid>
          </section>

          <Card labelledBy="pos-recent">
            <CardHeader id="pos-recent" title={t('pages.sales.recent.title')} />
            <DataTable
              rows={inPerson.recent}
              columns={recentColumns}
              rowKey={(o) => o.id}
              label={t('pages.sales.recent.title')}
              onRowClick={(o) => navigate(`/orders?order=${o.code}`)}
              emptyTitle={t('pages.sales.recent.empty')}
            />
          </Card>
        </>
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </PageShell>
  )
}

function Totals({ subtotal, discount, tax, total, discountLabel, taxLabel }: { subtotal: number; discount: number; tax: number; total: number; discountLabel: string; taxLabel: string }) {
  const { t } = useI18n()
  const fmt = useFormat()
  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between gap-4 text-text-secondary">
        <dt>{t('pages.sales.cart.subtotal')}</dt>
        <dd className="tabular">{fmt.exactCurrency(subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between gap-4 text-text-secondary">
          <dt>{discountLabel}</dt>
          <dd className="tabular">−{fmt.exactCurrency(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 text-text-secondary">
        <dt>{taxLabel}</dt>
        <dd className="tabular">{fmt.exactCurrency(tax)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-1.5 font-display text-lg font-semibold text-text">
        <dt>{t('pages.sales.cart.total')}</dt>
        <dd className="tabular">{fmt.exactCurrency(total)}</dd>
      </div>
    </dl>
  )
}

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #pos-receipt, #pos-receipt * { visibility: visible !important; }
  #pos-receipt { position: fixed; inset: 0 auto auto 0; width: 100%; padding: 24px; color: #000; background: #fff; }
}`

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { farm } = useSession()
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('pages.sales.receipt.title')}
      footer={
        <>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden className="size-4" />
            {t('pages.sales.receipt.print')}
          </Button>
          <Button variant="primary" onClick={onClose}>
            <Plus aria-hidden className="size-4" />
            {t('pages.sales.receipt.newSale')}
          </Button>
        </>
      }
    >
      <style>{PRINT_CSS}</style>
      <div id="pos-receipt" className="space-y-4 text-sm">
        <div className="text-center">
          <p className="font-display text-base font-semibold text-text">{farm.name}</p>
          <p className="font-mono text-xs text-text-muted">{receipt.code}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-text-muted">{t('pages.sales.receipt.date')}</dt>
            <dd className="text-text">{fmt.dayMonthTime(receipt.date)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{t('pages.sales.receipt.payment')}</dt>
            <dd className="inline-flex items-center gap-1.5 text-text">
              {PAYMENT_ICON[receipt.payment]}
              {t(`labels.paymentMethod.${receipt.payment}`)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-text-muted">{t('pages.sales.receipt.customer')}</dt>
            <dd className="text-text">{receipt.customerName ?? t('pages.sales.cart.walkIn')}</dd>
          </div>
        </dl>
        <ul className="divide-y divide-dashed divide-border border-y border-dashed border-border">
          {receipt.lines.map((l) => (
            <li key={l.productId} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-text">{l.name}</span>
                <span className="tabular block text-xs text-text-muted">
                  {fmt.decimal(l.quantity)} {t(`labels.unit.${l.unit}`)} × {fmt.exactCurrency(l.unitPrice)}
                </span>
              </span>
              <span className="tabular shrink-0 text-text">{fmt.exactCurrency(l.quantity * l.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <Totals
          subtotal={receipt.subtotal}
          discount={receipt.discount}
          tax={receipt.tax}
          total={receipt.total}
          discountLabel={t('pages.sales.cart.discountLine', { pct: fmt.percent(receipt.discountRate) })}
          taxLabel={t('pages.sales.cart.taxLine', { pct: fmt.percent(receipt.taxRate) })}
        />
        <div className="flex items-center justify-between">
          <PaidBadge paid />
          <span className="text-xs text-text-muted">{t('pages.sales.receipt.thanks')}</span>
        </div>
      </div>
    </Modal>
  )
}
