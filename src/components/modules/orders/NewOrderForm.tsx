import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/context/toast'
import { stockByProduct } from '@/domain/inventory'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { Customer, Order, PaymentMethod, SaleChannel } from '@/types'
import { CHANNELS, customerPrice, defaultPayment, PRICE_FACTOR } from './orderRules'

interface Line {
  key: number
  productId: string
  quantity: string
  unitPrice: string
  /** True once the user typed a price, so customer changes no longer reprice it. */
  manual: boolean
}

let lineSeq = 0
const newLine = (): Line => ({ key: ++lineSeq, productId: '', quantity: '1', unitPrice: '', manual: false })

const PAYMENTS: PaymentMethod[] = ['card', 'cash', 'transfer', 'invoice']

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toLocalInput(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function defaultDue() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return toLocalInput(d)
}

/** Sensible defaults for a customer: channel, fulfillment and tax (resale is tax exempt). */
function customerDefaults(customer?: Customer) {
  if (!customer) return { channel: 'in_person' as SaleChannel, fulfillment: 'pickup' as Order['fulfillment'], tax: '6' }
  const resale = customer.type === 'wholesale' || customer.type === 'distributor'
  const channel: SaleChannel = resale ? 'wholesale' : customer.type === 'restaurant' ? 'delivery' : 'online'
  return { channel, fulfillment: (channel === 'online' ? 'pickup' : 'delivery') as Order['fulfillment'], tax: resale ? '0' : '6' }
}

export function NewOrderForm({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const toast = useToast()
  const { data } = useFarmData()
  const create = useCommand('createOrder')
  const [form, setForm] = useState(() => ({
    customerId: '',
    paymentMethod: defaultPayment() as PaymentMethod,
    dueAt: defaultDue(),
    discount: '0',
    ...customerDefaults(),
  }))
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const customers = useMemo(() => [...(data?.customers ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data])
  const products = useMemo(() => (data?.products ?? []).filter((p) => p.price > 0).sort((a, b) => a.name.localeCompare(b.name)), [data])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const stock = useMemo(() => (data ? stockByProduct(data.movements) : new Map<string, number>()), [data])
  const customer = customers.find((c) => c.id === form.customerId)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setLine = (key: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
    // Editing a field clears its stale error.
    const touched = [patch.productId !== undefined && `product-${key}`, patch.quantity !== undefined && `quantity-${key}`, patch.unitPrice !== undefined && `price-${key}`]
    setErrors((e) => (touched.some((k) => k && k in e) ? Object.fromEntries(Object.entries(e).filter(([k]) => !touched.includes(k))) : e))
  }

  const changeCustomer = (id: string) => {
    const next = customers.find((c) => c.id === id)
    setForm((f) => ({ ...f, customerId: id, paymentMethod: defaultPayment(next), ...customerDefaults(next) }))
    setLines((ls) =>
      ls.map((l) => {
        const p = productById.get(l.productId)
        return p && !l.manual ? { ...l, unitPrice: String(customerPrice(p.price, next?.type)) } : l
      }),
    )
  }

  const changeProduct = (key: number, productId: string) => {
    const p = productById.get(productId)
    setLine(key, { productId, unitPrice: p ? String(customerPrice(p.price, customer?.type)) : '', manual: false })
  }

  const discountPct = toNumber(form.discount)
  const taxPct = toNumber(form.tax)
  const subtotal = lines.reduce((s, l) => {
    const q = toNumber(l.quantity)
    const price = toNumber(l.unitPrice)
    return q > 0 && price >= 0 ? s + q * price : s
  }, 0)
  const discount = discountPct >= 0 && discountPct <= 100 ? subtotal * (discountPct / 100) : 0
  const tax = taxPct >= 0 ? (subtotal - discount) * (taxPct / 100) : 0
  const total = subtotal - discount + tax

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!lines.length) next.lines = t('pages.orders.errors.lines')
    const seen = new Set<string>()
    for (const l of lines) {
      if (!l.productId) next[`product-${l.key}`] = t('pages.orders.errors.product')
      else if (seen.has(l.productId)) next[`product-${l.key}`] = t('pages.orders.errors.duplicate')
      seen.add(l.productId)
      if (!(toNumber(l.quantity) > 0)) next[`quantity-${l.key}`] = t('pages.orders.errors.quantity')
      if (l.productId && !(toNumber(l.unitPrice) >= 0)) next[`price-${l.key}`] = t('pages.orders.errors.price')
    }
    if (!(discountPct >= 0 && discountPct <= 100)) next.discount = t('pages.orders.errors.discount')
    if (!(taxPct >= 0 && taxPct <= 30)) next.tax = t('pages.orders.errors.tax')
    const due = new Date(form.dueAt)
    if (!form.dueAt || Number.isNaN(due.getTime())) next.dueAt = t('pages.orders.errors.dueAt')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await create.run([
      {
        customerId: form.customerId || null,
        channel: form.channel,
        paymentMethod: form.paymentMethod,
        fulfillment: form.fulfillment,
        discount: discountPct / 100,
        taxRate: taxPct / 100,
        dueAt: due.toISOString(),
        items: lines.map((l) => ({ productId: l.productId, quantity: toNumber(l.quantity), unitPrice: toNumber(l.unitPrice) })),
        status: 'CONFIRMED',
      },
    ])
    if (result.ok) {
      toast.show(t('pages.orders.created', { code: result.value }))
      onCreated(result.value)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('pages.orders.form.title')}
      description={t('pages.orders.form.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="order-form" disabled={create.pending || !products.length}>
            {create.pending ? t('pages.orders.form.creating') : t('pages.orders.form.submit')}
          </Button>
        </>
      }
    >
      {!products.length ? (
        <EmptyState title={t('pages.orders.form.noProducts')} />
      ) : (
        <form id="order-form" onSubmit={submit} noValidate className="space-y-5">
          <FormGrid className="lg:grid-cols-3">
            <Field label={t('pages.orders.form.customer')}>
              {(p) => (
                <Select {...p} value={form.customerId} onChange={(e) => changeCustomer(e.target.value)}>
                  <option value="">{t('pages.orders.form.walkIn')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.name} · ${c.company}` : c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.orders.form.channel')}>
              {(p) => (
                <Select {...p} value={form.channel} onChange={(e) => set('channel', e.target.value as SaleChannel)}>
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {t(`channels.${c}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.orders.form.fulfillment')}>
              {(p) => (
                <Select {...p} value={form.fulfillment} onChange={(e) => set('fulfillment', e.target.value as Order['fulfillment'])}>
                  {(['pickup', 'delivery'] as const).map((f) => (
                    <option key={f} value={f}>
                      {t(`labels.fulfillment.${f}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.orders.form.payment')} hint={customer && customer.paymentTerms !== 'due_on_receipt' ? t('pages.orders.form.paymentHint') : undefined}>
              {(p) => (
                <Select {...p} value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
                  {PAYMENTS.map((m) => (
                    <option key={m} value={m}>
                      {t(`labels.paymentMethod.${m}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.orders.form.dueAt')} error={errors.dueAt}>
              {(p) => <TextInput {...p} type="datetime-local" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('pages.orders.form.discount')} error={errors.discount}>
                {(p) => <TextInput {...p} inputMode="decimal" value={form.discount} onChange={(e) => set('discount', e.target.value)} />}
              </Field>
              <Field label={t('pages.orders.form.tax')} error={errors.tax}>
                {(p) => <TextInput {...p} inputMode="decimal" value={form.tax} onChange={(e) => set('tax', e.target.value)} />}
              </Field>
            </div>
          </FormGrid>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">{t('pages.orders.form.lines')}</legend>
            {lines.map((l, i) => {
              const product = productById.get(l.productId)
              const onHand = product ? Math.max(0, stock.get(product.id) ?? 0) : 0
              const qty = toNumber(l.quantity)
              const price = toNumber(l.unitPrice)
              const unit = product ? t(`labels.unit.${product.unit}`) : ''
              const factor = customer ? PRICE_FACTOR[customer.type] : 1
              return (
                <div key={l.key} className="tile rounded-xl p-3">
                  <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
                    <Field label={t('pages.orders.form.product')} error={errors[`product-${l.key}`]} className="col-span-2 sm:col-span-1" hint={product ? t('pages.orders.form.onHand', { qty: `${fmt.decimal(onHand)} ${unit}` }) : undefined}>
                      {(p) => (
                        <Select {...p} value={l.productId} onChange={(e) => changeProduct(l.key, e.target.value)}>
                          <option value="">{t('pages.orders.form.selectProduct')}</option>
                          {products.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label={t('pages.orders.form.quantity', { unit: unit || '—' })} error={errors[`quantity-${l.key}`]}>
                      {(p) => <TextInput {...p} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} />}
                    </Field>
                    <Field label={t('pages.orders.form.unitPrice')} error={errors[`price-${l.key}`]}>
                      {(p) => <TextInput {...p} inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value, manual: true })} />}
                    </Field>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-xs font-semibold text-text-secondary">{t('pages.orders.form.lineTotal')}</span>
                      <span className="tabular flex h-10 items-center font-medium text-text">{qty > 0 && price >= 0 ? fmt.exactCurrency(qty * price) : '—'}</span>
                    </div>
                    <div className="flex items-end justify-end self-stretch sm:self-start sm:pt-6">
                      <IconButton label={t('pages.orders.form.removeLine', { n: i + 1 })} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} disabled={lines.length === 1}>
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                  {product && customer && factor !== 1 && (
                    <p className="mt-2 text-xs text-text-muted">
                      {t('pages.orders.form.listPrice', { price: fmt.exactCurrency(product.price), pct: fmt.percent(factor), type: t(`labels.customerType.${customer.type}`) })}
                    </p>
                  )}
                  {product && qty > onHand && (
                    <p role="status" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warn-ink">
                      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      {t('pages.orders.form.stockWarning', { qty: `${fmt.decimal(onHand)} ${unit}` })}
                    </p>
                  )}
                </div>
              )
            })}
            {errors.lines && <p className="text-xs font-medium text-crit-ink">{errors.lines}</p>}
            <Button size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
              <Plus aria-hidden className="size-4" />
              {t('pages.orders.form.addLine')}
            </Button>
          </fieldset>

          <dl className="tile ml-auto max-w-sm space-y-1.5 rounded-xl p-4 text-sm">
            <div className="flex justify-between gap-4 text-text-secondary">
              <dt>{t('pages.orders.form.subtotal')}</dt>
              <dd className="tabular">{fmt.exactCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-text-secondary">
              <dt>{t('pages.orders.form.discountLine', { pct: fmt.percent((discountPct || 0) / 100) })}</dt>
              <dd className="tabular">−{fmt.exactCurrency(discount)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-text-secondary">
              <dt>{t('pages.orders.form.taxLine', { pct: fmt.percent((taxPct || 0) / 100) })}</dt>
              <dd className="tabular">{fmt.exactCurrency(tax)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-display text-base font-semibold text-text">
              <dt>{t('pages.orders.form.total')}</dt>
              <dd className="tabular">{fmt.exactCurrency(total)}</dd>
            </div>
          </dl>
        </form>
      )}
    </Modal>
  )
}
