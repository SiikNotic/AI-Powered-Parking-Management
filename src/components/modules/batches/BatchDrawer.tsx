import { AlertTriangle, CheckCircle2, Circle, MapPin, Pencil, Scissors } from 'lucide-react'
import { useState } from 'react'
import { StatBlock } from '@/components/dashboard/shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/Form'
import { expectedYield, isOverdue } from '@/domain/production'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { speciesImageUrl } from '@/lib/speciesImage'
import { BATCH_FLOW } from '@/services/shared/rules'
import type { BatchEvent, BatchStatus, Employee, GrowRoom, Harvest, MushroomSpecies, ProductionBatch } from '@/types'
import { HARVESTABLE } from './access'
import { BatchQr } from './BatchQr'
import { BatchStatusBadge } from './BatchStatusBadge'

const DESTRUCTIVE: BatchStatus[] = ['FAILED', 'DISCARDED']

const EVENT_ICON: Record<BatchEvent['type'], typeof CheckCircle2> = {
  CREATED: CheckCircle2,
  STATUS_CHANGED: CheckCircle2,
  LOCATION_CHANGED: MapPin,
  HARVESTED: Scissors,
  NOTE_ADDED: Pencil,
}

interface BatchDrawerProps {
  open: boolean
  batch: ProductionBatch
  species: MushroomSpecies | undefined
  room: GrowRoom | undefined
  harvests: Harvest[]
  events: BatchEvent[]
  employees: Employee[]
  canWrite: boolean
  canHarvest: boolean
  pending: boolean
  onClose: () => void
  onStatus: (status: BatchStatus) => void
  onLocation: (locationCode: string | null) => void
  onHarvest: () => void
}

export function BatchDrawer({ open, batch, species, room, harvests, events, employees, canWrite, canHarvest, pending, onClose, onStatus, onLocation, onHarvest }: BatchDrawerProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const employeeName = new Map(employees.map((e) => [e.id, e.name]))
  const sorted = [...harvests].sort((a, b) => b.date.localeCompare(a.date))
  const wet = harvests.reduce((s, h) => s + h.wetWeight, 0)
  const waste = harvests.reduce((s, h) => s + h.wasteWeight, 0)
  const expected = species ? expectedYield(batch, species) : 0
  const ratio = expected > 0 ? wet / expected : null
  const next = BATCH_FLOW[batch.status]
  const [now] = useState(() => new Date().toISOString())
  const overdue = isOverdue(batch, harvests, new Date(now))

  const milestones: { key: string; label: string; date: string | null; done: boolean }[] = [
    { key: 'spawn', label: t('pages.batches.drawer.milestones.spawn'), date: batch.spawnDate, done: batch.spawnDate <= now },
    { key: 'inoculation', label: t('pages.batches.drawer.milestones.inoculation'), date: batch.inoculationDate, done: !!batch.inoculationDate },
    { key: 'colonization', label: t('pages.batches.drawer.milestones.colonization'), date: batch.colonizationDate, done: !!batch.colonizationDate },
    { key: 'fruiting', label: t('pages.batches.drawer.milestones.fruiting'), date: batch.fruitingDate, done: !!batch.fruitingDate },
    { key: 'expected', label: t('pages.batches.drawer.milestones.expected'), date: batch.expectedHarvestDate, done: harvests.length > 0 },
  ]

  const showActions = canWrite && next.length > 0
  const showHarvest = canHarvest && HARVESTABLE.includes(batch.status)
  const photo = speciesImageUrl(species)
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationDraft, setLocationDraft] = useState('')

  const startEditLocation = () => {
    setLocationDraft(batch.locationCode ?? '')
    setEditingLocation(true)
  }
  const saveLocation = () => {
    const code = locationDraft.trim().toUpperCase()
    if (code && !/^[A-Za-z0-9]{1,4}-[A-Za-z0-9]{1,6}$/.test(code)) return
    onLocation(code || null)
    setEditingLocation(false)
  }

  return (
    <Modal
      open={open}
      side
      onClose={onClose}
      title={t('pages.batches.drawer.title', { code: batch.code })}
      description={[species?.name, room?.name].filter(Boolean).join(' · ')}
      footer={
        showHarvest || showActions ? (
          <div className="flex w-full flex-col gap-3">
            {showActions && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-secondary">{t('pages.batches.drawer.moveTo')}</p>
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <Button key={s} size="sm" variant={DESTRUCTIVE.includes(s) ? 'danger' : 'secondary'} disabled={pending} onClick={() => onStatus(s)}>
                      {t(`batch.status.${s}`)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {showHarvest && (
              <Button variant="primary" onClick={onHarvest} className="w-full sm:w-auto sm:self-end">
                <Scissors aria-hidden className="size-4" />
                {t('pages.batches.drawer.recordHarvest')}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {photo && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={photo} alt={species?.name ?? ''} className="h-40 w-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <BatchStatusBadge status={batch.status} />
          {overdue && (
            <Badge tone="danger" icon={<AlertTriangle aria-hidden className="size-3" />}>
              {t('pages.batches.overdue')}
            </Badge>
          )}
          {batch.locationCode ? (
            <Badge tone="info" icon={<MapPin aria-hidden className="size-3" />}>
              {batch.locationCode}
            </Badge>
          ) : (
            canWrite && (
              <Button size="sm" variant="ghost" onClick={startEditLocation}>
                <MapPin aria-hidden className="size-3.5" />
                {t('pages.batches.drawer.setLocation')}
              </Button>
            )
          )}
        </div>

        {editingLocation && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
            <TextInput
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value.toUpperCase())}
              placeholder="A-1A"
              maxLength={11}
              className="uppercase"
              aria-label={t('pages.batches.fields.locationCode')}
              autoFocus
            />
            <Button size="sm" variant="primary" onClick={saveLocation} disabled={pending}>
              {t('form.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingLocation(false)}>
              {t('form.cancel')}
            </Button>
          </div>
        )}
        {!editingLocation && batch.locationCode && canWrite && (
          <div>
            <Button size="sm" variant="ghost" onClick={startEditLocation}>
              <Pencil aria-hidden className="size-3.5" />
              {t('pages.batches.drawer.moveLocation')}
            </Button>
          </div>
        )}

        <section aria-labelledby="batch-yield">
          <h3 id="batch-yield" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.yield')}
          </h3>
          <div className="tile rounded-xl p-3">
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label={t('pages.batches.drawer.harvested')} value={fmt.pounds(wet)} />
              <StatBlock label={t('pages.batches.drawer.net')} value={fmt.pounds(wet - waste)} />
              <StatBlock label={t('pages.batches.drawer.expected')} value={fmt.pounds(expected)} />
            </div>
            {ratio !== null && (
              <>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(1, ratio) * 100)}
                  aria-label={t('pages.batches.drawer.efficiency', { value: fmt.percent(ratio) })}
                >
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                </div>
                <p className="tabular mt-1.5 text-xs text-text-muted">{t('pages.batches.drawer.efficiency', { value: fmt.percent(ratio) })}</p>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="batch-details">
          <h3 id="batch-details" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.details')}
          </h3>
          <p className="mb-3 text-sm">
            <span className="block text-[0.75rem] text-text-muted">{t('pages.batches.fields.substrate')}</span>
            <span className="font-medium text-text">{batch.substrate}</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBlock label={t('pages.batches.fields.substrateWeight')} value={fmt.pounds(batch.substrateWeight)} />
            <StatBlock label={t('pages.batches.fields.spawnWeight')} value={fmt.pounds(batch.spawnWeight)} />
            <StatBlock label={t('pages.batches.fields.bags')} value={fmt.number(batch.bags)} />
            <StatBlock label={t('pages.batches.columns.cost')} value={fmt.exactCurrency(batch.cost)} />
            <StatBlock label={t('pages.batches.drawer.costPerLb')} value={wet > 0 ? fmt.exactCurrency(batch.cost / wet) : '—'} />
          </div>
        </section>

        <section aria-labelledby="batch-timeline">
          <h3 id="batch-timeline" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.timeline')}
          </h3>
          <ol className="relative space-y-3 border-l border-border pl-5">
            {milestones.map((m) => (
              <li key={m.key} className="relative">
                <span className={cn('absolute top-0.5 -left-[1.66rem] grid size-4 place-items-center rounded-full bg-surface', m.done ? 'text-ok' : 'text-text-muted')}>
                  {m.done ? <CheckCircle2 aria-hidden className="size-4" /> : <Circle aria-hidden className="size-3.5" />}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className={m.done ? 'font-medium text-text' : 'text-text-secondary'}>{m.label}</span>
                  <span className="tabular text-xs text-text-muted">{m.date ? fmt.dayMonth(m.date) : t('pages.batches.drawer.pending')}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="batch-qr">
          <h3 id="batch-qr" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.qr')}
          </h3>
          <BatchQr batch={batch} speciesName={species?.name} locationCode={batch.locationCode} />
        </section>

        <section aria-labelledby="batch-history">
          <h3 id="batch-history" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.history', { count: events.length })}
          </h3>
          {!events.length ? (
            <p className="text-sm text-text-muted">{t('pages.batches.drawer.noHistory')}</p>
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-5">
              {events.map((e) => {
                const Icon = EVENT_ICON[e.type]
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute top-0.5 -left-[1.66rem] grid size-4 place-items-center rounded-full bg-surface text-text-secondary">
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium text-text">{e.message}</span>
                      <span className="tabular text-xs text-text-muted">{fmt.dayMonthTime(e.createdAt)}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="batch-harvests">
          <h3 id="batch-harvests" className="mb-2 font-display text-sm font-semibold text-text">
            {t('pages.batches.drawer.harvests', { count: harvests.length })}
          </h3>
          {!sorted.length ? (
            <p className="text-sm text-text-muted">{t('pages.batches.drawer.noHarvests')}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {sorted.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="tabular font-medium text-text">{fmt.dayMonthTime(h.date)}</span>
                    <span className="block truncate text-xs text-text-muted">{employeeName.get(h.employeeId) ?? '—'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-xs text-text-secondary">
                      {fmt.decimal(h.wetWeight)} − {fmt.decimal(h.wasteWeight)} =
                    </span>
                    <span className="tabular font-semibold text-text">{fmt.pounds(h.wetWeight - h.wasteWeight)}</span>
                    <Badge>{t(`labels.grade.${h.grade}`)}</Badge>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 bg-surface-2 px-3 py-2 text-sm font-semibold text-text">
                <span>{t('pages.batches.drawer.totals')}</span>
                <span className="tabular">{fmt.pounds(wet - waste)}</span>
              </li>
            </ul>
          )}
        </section>

        {batch.notes && (
          <section aria-labelledby="batch-notes">
            <h3 id="batch-notes" className="mb-1 font-display text-sm font-semibold text-text">
              {t('pages.batches.drawer.notes')}
            </h3>
            <p className="text-sm whitespace-pre-line text-text-secondary">{batch.notes}</p>
          </section>
        )}

        {!next.length && <p className="text-xs text-text-muted">{t('pages.batches.drawer.noNext')}</p>}
      </div>
    </Modal>
  )
}
