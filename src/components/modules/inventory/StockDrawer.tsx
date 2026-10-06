import { useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { expiringLots, toPounds, type StockLine } from '@/domain/inventory'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { FarmData } from '@/services'
import type { MovementKind } from './MovementDialog'

interface Props {
  line: StockLine
  data: FarmData
  now: Date
  canWrite: boolean
  onAction: (kind: MovementKind) => void
  onClose: () => void
}

/** Side drawer with one product's stock, open lots and full movement history. */
export function StockDrawer({ line, data, now, canWrite, onAction, onClose }: Props) {
  const { t } = useI18n()
  const fmt = useFormat()
  const { product } = line
  const unit = t(`labels.unit.${product.unit}`)
  const batchCode = useMemo(() => new Map(data.batches.map((b) => [b.id, b.code])), [data.batches])
  const history = useMemo(() => data.movements.filter((m) => m.productId === product.id).sort((a, b) => b.date.localeCompare(a.date)), [data.movements, product.id])
  const lots = useMemo(() => expiringLots(data.products, data.movements, now, 365).filter((l) => l.product.id === product.id), [data.products, data.movements, now, product.id])
  const lb = toPounds(product, line.quantity)
  const location = data.locations.find((l) => l.id === product.locationId)?.name ?? '—'

  return (
    <Modal open side onClose={onClose} title={product.name} description={`${product.sku} · ${t(`labels.productCategory.${product.category}`)}`}>
      <div className="space-y-6">
        <dl className="grid grid-cols-2 gap-2">
          <Fact label={t('pages.inventory.drawer.onHand')} value={`${fmt.decimal(line.quantity)} ${unit}`} sub={lb !== null && product.unit !== 'lb' ? t('pages.inventory.lbEquivalent', { lb: fmt.pounds(lb) }) : undefined} />
          <Fact label={t('pages.inventory.drawer.value')} value={fmt.exactCurrency(line.value)} />
          <Fact label={t('pages.inventory.drawer.location')} value={location} />
          <Fact label={t('pages.inventory.drawer.reorder')} value={`${fmt.decimal(product.reorderPoint)} ${unit}`} />
        </dl>

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {(['receive', 'adjust', 'waste', 'transfer'] as const).map((k) => (
              <Button key={k} size="sm" variant="secondary" onClick={() => onAction(k)}>
                {t(`pages.inventory.actions.${k}`)}
              </Button>
            ))}
          </div>
        )}

        <section aria-labelledby="drawer-lots">
          <h3 id="drawer-lots" className="eyebrow mb-2">
            {t('pages.inventory.drawer.lots')}
          </h3>
          {lots.length ? (
            <ul className="space-y-1.5">
              {lots.map((lot, i) => (
                <li key={`${lot.expiresAt}-${i}`} className="tile flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm">
                  <span className="tabular text-text">
                    {fmt.decimal(lot.quantity)} {unit}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-text-secondary">
                    {fmt.dayMonth(lot.expiresAt)}
                    {lot.daysLeft < 0 ? <Badge tone="danger">{t('pages.inventory.status.expired')}</Badge> : lot.daysLeft <= 2 ? <Badge tone="warning">{t('pages.inventory.status.expiresSoon')}</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{t('pages.inventory.drawer.noLots')}</p>
          )}
        </section>

        <section aria-labelledby="drawer-history">
          <h3 id="drawer-history" className="eyebrow mb-2">
            {t('pages.inventory.drawer.history')}
          </h3>
          {history.length ? (
            <ol className="divide-y divide-border">
              {history.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t(`labels.movementType.${m.type}`)}</Badge>
                      <span className="text-xs text-text-muted">{fmt.dayMonthTime(m.date)}</span>
                    </div>
                    {(m.reference || m.batchId) && (
                      <p className="mt-1 break-words text-xs text-text-secondary">
                        {[m.reference, m.batchId ? batchCode.get(m.batchId) : null].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <SignedQty value={m.quantity} unit={unit} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">{t('pages.inventory.drawer.noHistory')}</p>
          )}
        </section>
      </div>
    </Modal>
  )
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile rounded-xl p-3">
      <dt className="text-[0.6875rem] text-text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-display text-base font-semibold text-text">{value}</dd>
      {sub && <dd className="text-xs text-text-muted">{sub}</dd>}
    </div>
  )
}

/** Signed quantity: the sign is always written out, colour only reinforces it. */
export function SignedQty({ value, unit }: { value: number; unit: string }) {
  const fmt = useFormat()
  return (
    <span className={`tabular shrink-0 whitespace-nowrap font-medium ${value < 0 ? 'text-crit-ink' : 'text-text'}`}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {fmt.decimal(Math.abs(value))} {unit}
    </span>
  )
}
