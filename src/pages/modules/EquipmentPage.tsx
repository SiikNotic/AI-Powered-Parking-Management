import { AlertTriangle, CheckCircle2, Clock, Plus, PowerOff, Wrench } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNow } from '@/components/modules/inventory/useNow'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { addDays, DAY_MS, startOfDay } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import type { Equipment, GrowRoom, Role } from '@/types'

type Kind = Equipment['kind']
type Status = Equipment['status']

const KINDS: Kind[] = ['humidifier', 'hvac', 'fan', 'sensor', 'fridge', 'scale', 'sealer']
const STATUSES: Status[] = ['operational', 'maintenance_due', 'offline']
/** Roles allowed to edit equipment (same as the RLS policy). */
const WRITERS: Role[] = ['OWNER', 'FARM_MANAGER']

const STATUS_TONE: Record<Status, BadgeTone> = { operational: 'success', maintenance_due: 'warning', offline: 'offline' }
const STATUS_ICON = { operational: CheckCircle2, maintenance_due: Wrench, offline: PowerOff }

/** yyyy-mm-dd in local time, for date inputs. */
const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Noon local time of a date input value (avoids timezone day shifts). */
const fromDateInput = (v: string) => new Date(`${v}T12:00:00`)

type Draft = Omit<Equipment, 'id' | 'farmId'> & { id?: string }

export function EquipmentPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const now = useNow()
  const canEdit = WRITERS.includes(user.role)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind | ''>('')
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [room, setRoom] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [completing, setCompleting] = useState<Equipment | null>(null)

  const roomName = useMemo(() => new Map((data?.rooms ?? []).map((r) => [r.id, r.name])), [data])
  const today = startOfDay(now).getTime()
  /** Whole days until next maintenance (negative = overdue). */
  const daysUntil = (e: Equipment) => Math.round((startOfDay(new Date(e.nextMaintenance)).getTime() - today) / DAY_MS)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.equipment ?? []).filter(
      (e) => (!kind || e.kind === kind) && (!statusFilter || e.status === statusFilter) && (!room || e.roomId === room) && (!q || e.name.toLowerCase().includes(q) || e.serial.toLowerCase().includes(q)),
    )
  }, [data, query, kind, statusFilter, room])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const all = data?.equipment ?? []
  const count = (s: Status) => all.filter((e) => e.status === s).length
  const dueSoon = all.filter((e) => daysUntil(e) <= 7)
  const overdue = all.filter((e) => daysUntil(e) < 0)

  const nextCell = (e: Equipment) => {
    const days = daysUntil(e)
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap">
        <span>{fmt.dayMonth(e.nextMaintenance)}</span>
        {days < 0 ? (
          <Badge tone="danger" icon={<AlertTriangle aria-hidden className="size-3" />}>
            {t('pages.equipment.overdue', { days: -days })}
          </Badge>
        ) : days === 0 ? (
          <Badge tone="warning" icon={<Clock aria-hidden className="size-3" />}>
            {t('pages.equipment.overdueToday')}
          </Badge>
        ) : days <= 7 ? (
          <Badge tone="warning" icon={<Clock aria-hidden className="size-3" />}>
            {t('pages.equipment.dueIn', { days })}
          </Badge>
        ) : null}
      </span>
    )
  }

  const columns: Column<Equipment>[] = [
    { key: 'name', header: t('pages.equipment.columns.name'), cell: (e) => <span className="font-medium text-text">{e.name}</span>, sort: (e) => e.name },
    { key: 'kind', header: t('pages.equipment.columns.kind'), cell: (e) => t(`labels.equipmentKind.${e.kind}`), sort: (e) => e.kind },
    { key: 'room', header: t('pages.equipment.columns.room'), cell: (e) => roomName.get(e.roomId) ?? '—', sort: (e) => roomName.get(e.roomId) ?? '' },
    { key: 'serial', header: t('pages.equipment.columns.serial'), cell: (e) => <span className="font-mono text-xs">{e.serial || '—'}</span>, hideOnMobile: true },
    {
      key: 'status',
      header: t('pages.equipment.columns.status'),
      cell: (e) => {
        const Icon = STATUS_ICON[e.status]
        return (
          <Badge tone={STATUS_TONE[e.status]} icon={<Icon aria-hidden className="size-3" />}>
            {t(`labels.equipmentStatus.${e.status}`)}
          </Badge>
        )
      },
      sort: (e) => STATUSES.indexOf(e.status),
    },
    { key: 'next', header: t('pages.equipment.columns.next'), cell: nextCell, sort: (e) => e.nextMaintenance },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: t('pages.equipment.columns.actions'),
            align: 'right' as const,
            cell: (e: Equipment) => (
              <Button
                size="sm"
                variant="secondary"
                aria-label={`${t('pages.equipment.markDone')}: ${e.name}`}
                onClick={(ev) => {
                  ev.stopPropagation()
                  setCompleting(e)
                }}
                onKeyDown={(ev) => ev.stopPropagation()}
              >
                <Wrench aria-hidden className="size-3.5" />
                {t('pages.equipment.markDoneShort')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.equipment.title')}
        description={t('pages.equipment.subtitle')}
        actions={
          canEdit && data ? (
            <Button
              variant="primary"
              onClick={() => setDraft({ name: '', kind: 'humidifier', roomId: data.rooms[0]?.id ?? '', serial: '', status: 'operational', nextMaintenance: addDays(now, 30).toISOString() })}
            >
              <Plus aria-hidden className="size-4" />
              {t('pages.equipment.new')}
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
            <StatCard
              label={t('pages.equipment.stats.operational')}
              value={fmt.number(count('operational'))}
              hint={t('pages.equipment.stats.ofTotal', { total: all.length })}
              icon={<CheckCircle2 aria-hidden className="size-3.5" />}
            />
            <StatCard label={t('pages.equipment.stats.maintenanceDue')} value={fmt.number(count('maintenance_due'))} tone={count('maintenance_due') ? 'warning' : 'default'} icon={<Wrench aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.equipment.stats.offline')} value={fmt.number(count('offline'))} tone={count('offline') ? 'danger' : 'default'} icon={<PowerOff aria-hidden className="size-3.5" />} />
            <StatCard
              label={t('pages.equipment.stats.dueSoon')}
              value={fmt.number(dueSoon.length)}
              hint={t('pages.equipment.stats.dueSoonHint', { count: overdue.length })}
              tone={overdue.length ? 'danger' : dueSoon.length ? 'warning' : 'default'}
              icon={<Clock aria-hidden className="size-3.5" />}
            />
          </StatGrid>
          <Card>
            <Toolbar className="mb-4">
              <SearchInput value={query} onChange={setQuery} placeholder={t('pages.equipment.searchPlaceholder')} />
              <FilterSelect label={t('pages.equipment.filters.kind')} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: t(`labels.equipmentKind.${k}`) }))} />
              <FilterSelect label={t('pages.equipment.filters.status')} value={statusFilter} onChange={setStatusFilter} options={STATUSES.map((s) => ({ value: s, label: t(`labels.equipmentStatus.${s}`) }))} />
              <FilterSelect label={t('pages.equipment.filters.room')} value={room} onChange={setRoom} options={data.rooms.map((r) => ({ value: r.id, label: r.name }))} />
            </Toolbar>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(e) => e.id}
              label={t('pages.equipment.title')}
              onRowClick={canEdit ? (e) => setDraft({ ...e }) : undefined}
              emptyTitle={all.length ? t('table.noMatches') : t('table.empty')}
              initialSort={{ key: 'next', dir: 'asc' }}
            />
          </Card>
        </>
      )}
      {draft && data && <EquipmentForm draft={draft} rooms={data.rooms} onClose={() => setDraft(null)} />}
      {completing && <CompleteDialog equipment={completing} now={now} onClose={() => setCompleting(null)} />}
    </PageShell>
  )
}

function EquipmentForm({ draft, rooms, onClose }: { draft: Draft; rooms: GrowRoom[]; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveEquipment')
  const [form, setForm] = useState({ ...draft, next: toDateInput(new Date(draft.nextMaintenance)) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const date = fromDateInput(form.next)
    if (!form.name.trim()) next.name = t('pages.equipment.errors.name')
    if (!form.roomId) next.room = t('pages.equipment.errors.room')
    if (!form.next || Number.isNaN(date.getTime())) next.next = t('pages.equipment.errors.date')
    setErrors(next)
    if (Object.keys(next).length) return
    const input = { id: form.id, name: form.name.trim(), kind: form.kind, roomId: form.roomId, serial: form.serial.trim(), status: form.status, nextMaintenance: date.toISOString() }
    const result = await save.run([input], t('pages.equipment.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.equipment.editTitle') : t('pages.equipment.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="equipment-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="equipment-form" onSubmit={submit} noValidate>
        <FormGrid>
          <Field label={t('pages.equipment.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />}
          </Field>
          <Field label={t('pages.equipment.fields.kind')}>
            {(p) => (
              <Select {...p} value={form.kind} onChange={(e) => set('kind', e.target.value as Kind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`labels.equipmentKind.${k}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.equipment.fields.room')} error={errors.room}>
            {(p) => (
              <Select {...p} value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
                {!form.roomId && <option value="">—</option>}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.equipment.fields.serial')} optional>
            {(p) => <TextInput {...p} value={form.serial} onChange={(e) => set('serial', e.target.value)} maxLength={80} />}
          </Field>
          <Field label={t('pages.equipment.fields.status')}>
            {(p) => (
              <Select {...p} value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`labels.equipmentStatus.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.equipment.fields.next')} error={errors.next}>
            {(p) => <TextInput {...p} type="date" value={form.next} onChange={(e) => set('next', e.target.value)} />}
          </Field>
        </FormGrid>
      </form>
    </Modal>
  )
}

function CompleteDialog({ equipment, now, onClose }: { equipment: Equipment; now: Date; onClose: () => void }) {
  const { t } = useI18n()
  const complete = useCommand('completeMaintenance')
  const [next, setNext] = useState(() => toDateInput(addDays(now, 30)))
  const [error, setError] = useState<string>()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const date = fromDateInput(next)
    if (!next || Number.isNaN(date.getTime())) return setError(t('pages.equipment.errors.date'))
    if (date.getTime() < startOfDay(addDays(now, 1)).getTime()) return setError(t('pages.equipment.errors.future'))
    setError(undefined)
    const result = await complete.run([equipment.id, date.toISOString()], t('pages.equipment.complete.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('pages.equipment.complete.title')}
      description={t('pages.equipment.complete.description', { name: equipment.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="maintenance-form" disabled={complete.pending}>
            {complete.pending ? t('form.saving') : t('pages.equipment.complete.submit')}
          </Button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={submit} noValidate>
        <Field label={t('pages.equipment.complete.next')} hint={t('pages.equipment.complete.nextHint')} error={error}>
          {(p) => <TextInput {...p} type="date" min={toDateInput(addDays(now, 1))} value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
      </form>
    </Modal>
  )
}
