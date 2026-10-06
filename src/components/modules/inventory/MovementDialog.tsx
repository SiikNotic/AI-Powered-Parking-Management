import { AlertTriangle } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { stockByProduct, toPounds } from '@/domain/inventory'
import { useCommand } from '@/hooks/useCommand'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { FarmData } from '@/services'
import type { InventoryProduct } from '@/types'

export type MovementKind = 'receive' | 'adjust' | 'waste' | 'transfer' | 'pack'

export interface MovementPreset {
  productId?: string
  quantity?: number
  reference?: string
}

interface Props {
  kind: MovementKind
  data: FarmData
  preset?: MovementPreset
  onClose: () => void
}

const EPS = 0.001
const round = (n: number) => Math.round(n * 100) / 100

/** End of the chosen day in local time, as ISO. */
const dateToIso = (value: string) => new Date(`${value}T23:59:00`).toISOString()

/** One dialog for every manual stock change; each kind validates before calling the service. */
export function MovementDialog({ kind, data, preset, onClose }: Props) {
  const { t } = useI18n()
  const fmt = useFormat()
  const record = useCommand('recordMovement')
  const pack = useCommand('packProduct')
  const pending = record.pending || pack.pending

  const stock = useMemo(() => stockByProduct(data.movements), [data.movements])
  const products = useMemo(() => [...data.products].sort((a, b) => a.name.localeCompare(b.name)), [data.products])
  const byId = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products])
  const locationName = useMemo(() => new Map(data.locations.map((l) => [l.id, l.name])), [data.locations])

  const bulkSources = useMemo(() => products.filter((p) => p.category === 'fresh' && p.unit === 'lb' && p.speciesId), [products])

  const [productId, setProductId] = useState(preset?.productId ?? (kind === 'pack' ? (bulkSources[0]?.id ?? '') : ''))
  const [quantity, setQuantity] = useState(preset?.quantity !== undefined ? String(preset.quantity) : '')
  const [reference, setReference] = useState(preset?.reference ?? '')
  const [expiry, setExpiry] = useState('')
  const [wasteType, setWasteType] = useState<'WASTED' | 'DAMAGED'>('WASTED')
  const [toLocation, setToLocation] = useState('')
  const [targetId, setTargetId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const product = byId.get(productId)
  const onHand = product ? round(stock.get(product.id) ?? 0) : 0
  const unit = product ? t(`labels.unit.${product.unit}`) : ''
  const qty = toNumber(quantity)
  const qtyText = (p: InventoryProduct, n: number) => `${fmt.decimal(n)} ${t(`labels.unit.${p.unit}`)}`

  // Pack: targets are unit packs with a weight, same species as the bulk source.
  const targets = product ? products.filter((p) => p.id !== product.id && p.unit === 'unit' && p.unitWeight && p.speciesId === product.speciesId) : []
  const target = targets.find((p) => p.id === targetId)
  const packLb = target && Number.isFinite(qty) ? round(qty * (target.unitWeight ?? 0)) : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!product) next.product = t('pages.inventory.errors.product')
    if (kind === 'adjust') {
      if (!Number.isFinite(qty) || Math.abs(qty) < EPS) next.quantity = t('pages.inventory.errors.nonZero')
      if (!reference.trim()) next.reference = t('pages.inventory.errors.reason')
    } else if (kind === 'pack') {
      if (!target) next.target = t('pages.inventory.errors.target')
      if (!Number.isFinite(qty) || qty <= 0) next.quantity = t('pages.inventory.errors.positive')
      else if (!Number.isInteger(qty)) next.quantity = t('pages.inventory.errors.wholeUnits')
      else if (packLb > onHand + EPS) next.quantity = t('pages.inventory.errors.notEnoughBulk', { lb: fmt.pounds(packLb) })
    } else {
      if (!Number.isFinite(qty) || qty <= 0) next.quantity = t('pages.inventory.errors.positive')
      else if (kind !== 'receive' && product && qty > onHand + EPS) next.quantity = t('pages.inventory.errors.tooMuch', { qty: qtyText(product, onHand) })
    }
    if (kind === 'transfer' && product && (!toLocation || toLocation === product.locationId)) next.toLocation = t('pages.inventory.errors.location')
    setErrors(next)
    if (Object.keys(next).length || !product) return

    const success = t(`pages.inventory.saved.${kind}`)
    let ok = false
    if (kind === 'receive') {
      ok = (await record.run([{ productId: product.id, type: 'RECEIVED', quantity: qty, reference: reference.trim(), expiresAt: expiry ? dateToIso(expiry) : null }], success)).ok
    } else if (kind === 'adjust') {
      ok = (await record.run([{ productId: product.id, type: 'ADJUSTMENT', quantity: qty, reference: reference.trim() }], success)).ok
    } else if (kind === 'waste') {
      ok = (await record.run([{ productId: product.id, type: wasteType, quantity: -qty, reference: reference.trim() }], success)).ok
    } else if (kind === 'transfer') {
      const from = product.locationId
      const ref = reference.trim() || t('pages.inventory.transferReference', { from: locationName.get(from) ?? '—', to: locationName.get(toLocation) ?? '—' })
      const out = await record.run([{ productId: product.id, type: 'TRANSFERRED', quantity: -qty, fromLocationId: from, reference: ref }])
      if (out.ok) ok = (await record.run([{ productId: product.id, type: 'TRANSFERRED', quantity: qty, toLocationId: toLocation, reference: ref }], success)).ok
    } else if (target) {
      ok = (await pack.run([{ sourceId: product.id, targetId: target.id, units: qty }], success)).ok
    }
    if (ok) onClose()
  }

  const productOptions = kind === 'pack' ? bulkSources : products

  return (
    <Modal
      open
      onClose={onClose}
      title={t(`pages.inventory.titles.${kind}`)}
      description={t(`pages.inventory.descriptions.${kind}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant={kind === 'waste' ? 'danger' : 'primary'} type="submit" form="movement-form" disabled={pending}>
            {pending ? t('form.saving') : t(`pages.inventory.submit.${kind}`)}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={kind === 'pack' ? t('pages.inventory.form.source') : t('pages.inventory.form.product')} error={errors.product}>
          {(p) => (
            <Select
              {...p}
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setTargetId('')
                setToLocation('')
              }}
            >
              {kind !== 'pack' && <option value="">{t('pages.inventory.form.chooseProduct')}</option>}
              {productOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {qtyText(o, Math.max(0, stock.get(o.id) ?? 0))}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {kind === 'pack' && (
          <Field label={t('pages.inventory.form.target')} error={errors.target} hint={product && !targets.length ? t('pages.inventory.form.noTargets') : undefined}>
            {(p) => (
              <Select {...p} value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={!targets.length}>
                <option value="">{t('pages.inventory.form.chooseTarget')}</option>
                {targets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {fmt.pounds(o.unitWeight ?? 0)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <FormGrid>
          {kind === 'waste' && (
            <Field label={t('pages.inventory.form.wasteType')}>
              {(p) => (
                <Select {...p} value={wasteType} onChange={(e) => setWasteType(e.target.value as 'WASTED' | 'DAMAGED')}>
                  <option value="WASTED">{t('labels.movementType.WASTED')}</option>
                  <option value="DAMAGED">{t('labels.movementType.DAMAGED')}</option>
                </Select>
              )}
            </Field>
          )}
          <Field
            label={kind === 'adjust' ? t('pages.inventory.form.adjustQuantity', { unit }) : kind === 'pack' ? t('pages.inventory.form.units') : t('pages.inventory.form.quantity', { unit })}
            hint={kind === 'adjust' ? t('pages.inventory.form.adjustHint') : product && (kind === 'waste' || kind === 'transfer') ? t('pages.inventory.form.available', { qty: qtyText(product, Math.max(0, onHand)) }) : undefined}
            error={errors.quantity}
          >
            {(p) => <TextInput {...p} inputMode={kind === 'pack' ? 'numeric' : 'decimal'} value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
          </Field>
          {kind === 'receive' && (
            <Field label={t('pages.inventory.form.expiry')} hint={t('pages.inventory.form.expiryHint')} optional>
              {(p) => <TextInput {...p} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />}
            </Field>
          )}
          {kind === 'transfer' && product && (
            <>
              <Field label={t('pages.inventory.form.fromLocation')}>{(p) => <TextInput {...p} value={locationName.get(product.locationId) ?? '—'} readOnly disabled />}</Field>
              <Field label={t('pages.inventory.form.toLocation')} error={errors.toLocation} hint={t('pages.inventory.form.transferHint')}>
                {(p) => (
                  <Select {...p} value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                    <option value="">—</option>
                    {data.locations
                      .filter((l) => l.id !== product.locationId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </Select>
                )}
              </Field>
            </>
          )}
        </FormGrid>

        {kind !== 'pack' && (
          <Field
            label={kind === 'adjust' ? t('pages.inventory.form.reason') : t('pages.inventory.form.reference')}
            hint={kind === 'adjust' ? t('pages.inventory.form.reasonHint') : t('pages.inventory.form.referenceHint')}
            error={errors.reference}
            optional={kind !== 'adjust'}
          >
            {(p) => <TextInput {...p} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} />}
          </Field>
        )}

        {product && kind === 'adjust' && (
          <Summary>
            <SummaryRow label={t('pages.inventory.form.current')} value={qtyText(product, onHand)} />
            <SummaryRow label={t('pages.inventory.form.resulting')} value={Number.isFinite(qty) ? qtyText(product, round(onHand + qty)) : '—'} strong />
            {Number.isFinite(qty) && onHand + qty < -EPS && (
              <p className="flex items-start gap-2 pt-1 text-xs text-warn-ink">
                <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {t('pages.inventory.form.negativeWarning')}
              </p>
            )}
          </Summary>
        )}

        {product && kind === 'pack' && target && (
          <Summary>
            <SummaryRow
              label={t('pages.inventory.form.source')}
              value={t('pages.inventory.form.lbUsed', { lb: fmt.pounds(packLb), available: fmt.pounds(Math.max(0, onHand)) })}
              strong
            />
            <SummaryRow label={target.name} value={`${fmt.pounds(toPounds(target, 1) ?? 0)} / ${t('labels.unit.unit')}`} />
          </Summary>
        )}
      </form>
    </Modal>
  )
}

function Summary({ children }: { children: ReactNode }) {
  return <div className="tile space-y-1.5 rounded-xl p-3 text-sm">{children}</div>
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className={strong ? 'tabular font-semibold text-text' : 'tabular text-text-secondary'}>{value}</span>
    </div>
  )
}
