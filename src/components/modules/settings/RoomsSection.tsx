import { Plus, Radio } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatMetric } from '@/components/dashboard/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useCommand } from '@/hooks/useCommand'
import { useI18n } from '@/i18n'
import type { GrowRoom, Metric, RoomType } from '@/types'
import { parseRange, toRangeDraft } from './range'
import { RangeInputs } from './RangeInputs'

const ROOM_TYPES: RoomType[] = ['grow', 'incubation', 'fruiting', 'cold_storage', 'packing', 'processing']
const METRICS: Metric[] = ['temperature', 'humidity', 'co2']

type Draft = Pick<GrowRoom, 'name' | 'type' | 'targets'> & { id?: string }

const emptyRoom = (): Draft => ({
  name: '',
  type: 'fruiting',
  targets: { temperature: { min: 60, max: 68 }, humidity: { min: 85, max: 95 }, co2: { min: 400, max: 1000 } },
})

export function RoomsSection({ rooms, canEdit }: { rooms: GrowRoom[]; canEdit: boolean }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft | null>(null)
  const target = (r: GrowRoom, m: Metric) => `${formatMetric(m, r.targets[m].min)} – ${formatMetric(m, r.targets[m].max)}`

  const columns: Column<GrowRoom>[] = [
    { key: 'name', header: t('pages.settings.rooms.columns.name'), cell: (r) => <span className="font-medium text-text">{r.name}</span>, sort: (r) => r.name },
    { key: 'type', header: t('pages.settings.rooms.columns.type'), cell: (r) => <Badge>{t(`rooms.${r.type}`)}</Badge>, sort: (r) => t(`rooms.${r.type}`) },
    ...METRICS.map((m): Column<GrowRoom> => ({ key: m, header: t(`pages.settings.rooms.columns.${m}`), cell: (r) => <span className="tabular whitespace-nowrap">{target(r, m)}</span>, hideOnMobile: m === 'co2' })),
    {
      key: 'sensor',
      header: t('pages.settings.rooms.columns.sensor'),
      cell: (r) =>
        r.sensorId ? (
          <Badge tone="info" icon={<Radio aria-hidden className="size-3" />}>
            {r.sensorId}
          </Badge>
        ) : (
          <Badge tone="offline">{t('pages.settings.rooms.noSensor')}</Badge>
        ),
      hideOnMobile: true,
    },
  ]

  return (
    <Card labelledBy="settings-rooms">
      <CardHeader
        id="settings-rooms"
        title={t('pages.settings.rooms.title')}
        subtitle={t('pages.settings.rooms.subtitle')}
        action={
          canEdit ? (
            <Button size="sm" variant="primary" onClick={() => setDraft(emptyRoom())}>
              <Plus aria-hidden className="size-3.5" />
              {t('pages.settings.rooms.add')}
            </Button>
          ) : undefined
        }
      />
      {!canEdit && <p className="tile mb-4 rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.settings.readOnly')}</p>}
      <DataTable rows={rooms} columns={columns} rowKey={(r) => r.id} label={t('pages.settings.rooms.title')} onRowClick={canEdit ? (r) => setDraft({ id: r.id, name: r.name, type: r.type, targets: r.targets }) : undefined} initialSort={{ key: 'name', dir: 'asc' }} />
      {draft && <RoomForm draft={draft} onClose={() => setDraft(null)} />}
    </Card>
  )
}

function RoomForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveRoom')
  const [name, setName] = useState(draft.name)
  const [type, setType] = useState<RoomType>(draft.type)
  const [targets, setTargets] = useState({ temperature: toRangeDraft(draft.targets.temperature), humidity: toRangeDraft(draft.targets.humidity), co2: toRangeDraft(draft.targets.co2) })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = { temperature: parseRange(targets.temperature), humidity: parseRange(targets.humidity), co2: parseRange(targets.co2) }
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = t('pages.settings.rooms.errors.name')
    for (const m of METRICS) if (!parsed[m]) next[m] = t('pages.settings.rooms.errors.range')
    if (parsed.humidity && (parsed.humidity.min < 0 || parsed.humidity.max > 100)) next.humidity = t('pages.settings.rooms.errors.range')
    if (parsed.co2 && parsed.co2.min < 0) next.co2 = t('pages.settings.rooms.errors.range')
    setErrors(next)
    const { temperature, humidity, co2 } = parsed
    if (Object.keys(next).length || !temperature || !humidity || !co2) return
    const result = await save.run([{ id: draft.id, name: name.trim(), type, targets: { temperature, humidity, co2 } }], t('pages.settings.rooms.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.settings.rooms.editTitle') : t('pages.settings.rooms.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="room-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="room-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.settings.rooms.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label={t('pages.settings.rooms.fields.type')}>
            {(p) => (
              <Select {...p} value={type} onChange={(e) => setType(e.target.value as RoomType)}>
                {ROOM_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {t(`rooms.${rt}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {METRICS.map((m) => (
            <RangeInputs key={m} label={t(`pages.settings.rooms.fields.${m}`)} value={targets[m]} onChange={(v) => setTargets((cur) => ({ ...cur, [m]: v }))} error={errors[m]} />
          ))}
        </FormGrid>
      </form>
    </Modal>
  )
}
