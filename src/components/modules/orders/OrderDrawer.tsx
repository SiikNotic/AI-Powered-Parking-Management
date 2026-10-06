import { AlertTriangle, ArrowRight, Info, Mail, Phone, UserRound, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { orderTotals } from '@/domain/finance'
import { useCommand } from '@/hooks/useCommand'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { ORDER_FLOW } from '@/services/shared/rules'
import type { FarmData } from '@/services/shared/records'
import type { Order, OrderStatus } from '@/types'
import { OrderStatusBadge, PaidBadge } from './OrderBadges'
import { isOverdue } from './orderRules'

interface OrderDrawerProps {
  order: Order
  data: FarmData
  canEdit: boolean
  onClose: () => void
}

interface TimelineEvent {
  key: string
  date: string
  label: string
}

export function OrderDrawer({ order, data, canEdit, onClose }: OrderDrawerProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const setStatus = useCommand('setOrderStatus')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [now] = useState(() => Date.now())

  const customer = data.customers.find((c) => c.id === order.customerId)
  const totals = orderTotals(order)
  const productById = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products])
  const next = ORDER_FLOW[order.status]
  const forward = next.filter((s) => s !== 'CANCELLED')
  const overdue = isOverdue(order, now)

  const timeline = useMemo<TimelineEvent[]>(() => {
    const created = new Date(order.createdAt).getTime()
    const events: TimelineEvent[] = [{ key: 'created', date: order.createdAt, label: t('pages.orders.detail.events.created') }]
    for (const a of data.audit) {
      if (a.entity !== 'order' || a.entityLabel !== order.code || !a.newValue) continue
      // The creation entry duplicates "Order created".
      if (Math.abs(new Date(a.date).getTime() - created) < 2000) continue
      events.push({ key: a.id, date: a.date, label: t('pages.orders.detail.events.status', { status: t(`orderStatus.${a.newValue as OrderStatus}`) }) })
    }
    const stockDates = new Map<string, 'out' | 'back'>()
    for (const m of data.movements) {
      if (m.type === 'SOLD' && m.reference === order.code) stockDates.set(m.date.slice(0, 19), 'out')
      else if (m.type === 'ADJUSTMENT' && m.reference?.startsWith(`${order.code} `)) stockDates.set(m.date.slice(0, 19), 'back')
    }
    for (const [date, kind] of stockDates) {
      events.push({ key: `stock-${kind}-${date}`, date, label: t(kind === 'out' ? 'pages.orders.detail.events.stockOut' : 'pages.orders.detail.events.stockBack') })
    }
    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [data.audit, data.movements, order.code, order.createdAt, t])

  const move = async (status: OrderStatus) => {
    const result = await setStatus.run([order.id, status], t('pages.orders.detail.statusChanged', { code: order.code, status: t(`orderStatus.${status}`) }))
    if (result.ok) setConfirmCancel(false)
  }

  const facts: [string, string][] = [
    [t('pages.orders.detail.channel'), t(`channels.${order.channel}`)],
    [t('pages.orders.detail.fulfillment'), t(`labels.fulfillment.${order.fulfillment}`)],
    [t('pages.orders.detail.payment'), t(`labels.paymentMethod.${order.paymentMethod}`)],
    [t('pages.orders.detail.created'), fmt.dayMonthTime(order.createdAt)],
  ]

  return (
    <Modal open side onClose={onClose} title={t('pages.orders.detail.title', { code: order.code })}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaidBadge paid={order.paid} />
          {overdue && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-crit-ink">
              <AlertTriangle aria-hidden className="size-3.5" />
              {t('pages.orders.overdue')}
            </span>
          )}
        </div>

        <section aria-labelledby="order-customer" className="tile rounded-xl p-3.5">
          <h3 id="order-customer" className="eyebrow mb-1.5">
            {t('pages.orders.detail.customer')}
          </h3>
          {customer ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-text">
                <UserRound aria-hidden className="mr-1.5 inline size-4 align-[-3px] text-text-muted" />
                {customer.name}
                {customer.company && <span className="font-normal text-text-secondary"> · {customer.company}</span>}
              </p>
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
              <Link to={`/customers?customer=${customer.id}`} className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-brand-ink hover:underline">
                {t('pages.orders.detail.viewCustomer')}
                <ArrowRight aria-hidden className="size-3" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">{t('pages.orders.walkIn')}</p>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="truncate text-text">{value}</dd>
            </div>
          ))}
          <div className="min-w-0">
            <dt className="text-xs text-text-muted">{t('pages.orders.detail.due')}</dt>
            <dd className={overdue ? 'font-semibold text-crit-ink' : 'text-text'}>{fmt.dayMonthTime(order.dueAt)}</dd>
          </div>
        </dl>

        <section aria-labelledby="order-lines">
          <h3 id="order-lines" className="eyebrow mb-2">
            {t('pages.orders.detail.lines')}
          </h3>
          <ul className="divide-y divide-border">
            {order.items.map((item) => {
              const p = productById.get(item.productId)
              return (
                <li key={item.productId} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{p?.name ?? '—'}</p>
                    <p className="tabular text-xs text-text-muted">
                      {t('pages.orders.detail.qtyPrice', { qty: `${fmt.decimal(item.quantity)} ${p ? t(`labels.unit.${p.unit}`) : ''}`, price: fmt.exactCurrency(item.unitPrice) })}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-text">{fmt.exactCurrency(item.quantity * item.unitPrice)}</span>
                </li>
              )
            })}
          </ul>
          <dl className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <dt>{t('pages.orders.form.subtotal')}</dt>
              <dd className="tabular">{fmt.exactCurrency(totals.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-text-secondary">
                <dt>{t('pages.orders.form.discountLine', { pct: fmt.percent(order.discount) })}</dt>
                <dd className="tabular">−{fmt.exactCurrency(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <dt>{t('pages.orders.form.taxLine', { pct: fmt.percent(order.taxRate) })}</dt>
              <dd className="tabular">{fmt.exactCurrency(totals.tax)}</dd>
            </div>
            <div className="flex justify-between font-display text-base font-semibold text-text">
              <dt>{t('pages.orders.form.total')}</dt>
              <dd className="tabular">{fmt.exactCurrency(totals.total)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="order-timeline">
          <h3 id="order-timeline" className="eyebrow mb-2">
            {t('pages.orders.detail.timeline')}
          </h3>
          <ol className="space-y-2 border-l border-border pl-4">
            {timeline.map((e) => (
              <li key={e.key} className="relative text-sm">
                <span aria-hidden className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-text-muted" />
                <p className="text-text">{e.label}</p>
                <p className="text-xs text-text-muted">{fmt.dayMonthTime(e.date)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="order-next" className="space-y-3">
          <h3 id="order-next" className="eyebrow">
            {t('pages.orders.detail.nextStep')}
          </h3>
          {!next.length ? (
            <p className="text-sm text-text-secondary">{t('pages.orders.detail.closed')}</p>
          ) : (
            <>
              <p className="flex items-start gap-2 text-xs text-text-secondary">
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {t('pages.orders.detail.stockNote')}
              </p>
              {canEdit && !confirmCancel && (
                <div className="flex flex-wrap gap-2">
                  {forward.map((s, i) => (
                    <Button key={s} size="sm" variant={i === 0 ? 'primary' : 'secondary'} disabled={setStatus.pending} onClick={() => move(s)}>
                      <ArrowRight aria-hidden className="size-3.5" />
                      {t(`orderStatus.${s}`)}
                    </Button>
                  ))}
                  {next.includes('CANCELLED') && (
                    <Button size="sm" variant="ghost" className="text-crit-ink" disabled={setStatus.pending} onClick={() => setConfirmCancel(true)}>
                      <XCircle aria-hidden className="size-3.5" />
                      {t('pages.orders.detail.cancel')}
                    </Button>
                  )}
                </div>
              )}
              {canEdit && confirmCancel && (
                <div role="alertdialog" aria-labelledby="cancel-title" aria-describedby="cancel-body" className="rounded-xl border border-crit/40 bg-crit-soft p-3.5">
                  <p id="cancel-title" className="text-sm font-semibold text-crit-ink">
                    {t('pages.orders.detail.cancelTitle', { code: order.code })}
                  </p>
                  <p id="cancel-body" className="mt-1 text-xs text-text-secondary">
                    {t('pages.orders.detail.cancelBody')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="danger" disabled={setStatus.pending} onClick={() => move('CANCELLED')}>
                      {t('pages.orders.detail.cancelConfirm')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>
                      {t('pages.orders.detail.keep')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
