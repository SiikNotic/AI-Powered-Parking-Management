import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Select, TextInput, Textarea } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { addDays } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { FarmData } from '@/services/shared/records'
import type { RoomType } from '@/types'

const GROWING_ROOMS: RoomType[] = ['grow', 'incubation', 'fruiting']

/** `YYYY-MM-DD` in local time, for date inputs. */
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
/** Date input value → ISO at local noon (keeps the calendar day in any time zone). */
const toIso = (value: string) => new Date(`${value}T12:00`).toISOString()
const plusDays = (value: string, days: number) => (value ? localDate(addDays(new Date(`${value}T12:00`), days)) : '')

/** `data` comes from the page so the form is initialised with loaded records. */
export function BatchForm({ data, onClose }: { data: FarmData; onClose: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const create = useCommand('createBatch')
  const species = data.species
  const allRooms = data.rooms
  const growing = allRooms.filter((r) => GROWING_ROOMS.includes(r.type))
  const rooms = growing.length ? growing : allRooms
  const [form, setForm] = useState(() => {
    const today = localDate(new Date())
    return {
      speciesId: species[0]?.id ?? '',
      roomId: rooms[0]?.id ?? '',
      substrate: '',
      substrateWeight: '',
      spawnWeight: '',
      bags: '',
      spawnDate: today,
      expectedHarvestDate: plusDays(today, species[0]?.averageGrowDays ?? 0),
      cost: '',
      notes: '',
    }
  })
  // The expected date follows species + spawn date until the user picks one.
  const [expectedTouched, setExpectedTouched] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const sp = species.find((s) => s.id === form.speciesId)

  const update = (patch: Partial<typeof form>) =>
    setForm((f) => {
      const next = { ...f, ...patch }
      if (!expectedTouched && ('speciesId' in patch || 'spawnDate' in patch)) {
        const days = species.find((s) => s.id === next.speciesId)?.averageGrowDays ?? 0
        next.expectedHarvestDate = plusDays(next.spawnDate, days)
      }
      return next
    })

  const substrateWeight = toNumber(form.substrateWeight)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const spawnWeight = toNumber(form.spawnWeight)
    const bags = toNumber(form.bags)
    const cost = form.cost.trim() ? toNumber(form.cost) : 0
    const next: Record<string, string> = {}
    if (!sp) next.speciesId = t('pages.batches.errors.species')
    if (!form.roomId) next.roomId = t('pages.batches.errors.room')
    if (!form.substrate.trim()) next.substrate = t('pages.batches.errors.substrate')
    if (!(substrateWeight > 0)) next.substrateWeight = t('pages.batches.errors.substrateWeight')
    if (!(spawnWeight > 0)) next.spawnWeight = t('pages.batches.errors.spawnWeight')
    if (!(Number.isInteger(bags) && bags >= 1)) next.bags = t('pages.batches.errors.bags')
    if (!form.spawnDate) next.spawnDate = t('pages.batches.errors.spawnDate')
    if (!form.expectedHarvestDate || (form.spawnDate && form.expectedHarvestDate < form.spawnDate)) next.expectedHarvestDate = t('pages.batches.errors.expectedDate')
    if (!(cost >= 0)) next.cost = t('pages.batches.errors.cost')
    setErrors(next)
    if (Object.keys(next).length) return
    const notes = form.notes.trim()
    const result = await create.run(
      [
        {
          speciesId: form.speciesId,
          roomId: form.roomId,
          substrate: form.substrate.trim(),
          substrateWeight,
          spawnWeight,
          bags,
          spawnDate: toIso(form.spawnDate),
          expectedHarvestDate: toIso(form.expectedHarvestDate),
          cost,
          ...(notes ? { notes } : {}),
        },
      ],
      t('pages.batches.created'),
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('pages.batches.newTitle')}
      description={t('pages.batches.newDescription')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="batch-form" disabled={create.pending}>
            {create.pending ? t('form.saving') : t('form.create')}
          </Button>
        </>
      }
    >
      <form id="batch-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.batches.fields.species')} error={errors.speciesId}>
            {(p) => (
              <Select {...p} value={form.speciesId} onChange={(e) => update({ speciesId: e.target.value })}>
                {species.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.batches.fields.room')} error={errors.roomId}>
            {(p) => (
              <Select {...p} value={form.roomId} onChange={(e) => update({ roomId: e.target.value })}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {t(`rooms.${r.type}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.batches.fields.substrate')} error={errors.substrate} className="sm:col-span-2">
            {(p) => <TextInput {...p} placeholder={t('pages.batches.fields.substratePlaceholder')} value={form.substrate} onChange={(e) => update({ substrate: e.target.value })} />}
          </Field>
          <Field
            label={t('pages.batches.fields.substrateWeight')}
            error={errors.substrateWeight}
            hint={sp && substrateWeight > 0 ? t('pages.batches.fields.expectedYield', { value: fmt.pounds(substrateWeight * sp.averageYield) }) : undefined}
          >
            {(p) => <TextInput {...p} inputMode="decimal" value={form.substrateWeight} onChange={(e) => update({ substrateWeight: e.target.value })} />}
          </Field>
          <Field label={t('pages.batches.fields.spawnWeight')} error={errors.spawnWeight}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.spawnWeight} onChange={(e) => update({ spawnWeight: e.target.value })} />}
          </Field>
          <Field label={t('pages.batches.fields.bags')} error={errors.bags}>
            {(p) => <TextInput {...p} inputMode="numeric" value={form.bags} onChange={(e) => update({ bags: e.target.value })} />}
          </Field>
          <Field label={t('pages.batches.fields.cost')} hint={t('pages.batches.fields.costHint')} error={errors.cost} optional>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.cost} onChange={(e) => update({ cost: e.target.value })} />}
          </Field>
          <Field label={t('pages.batches.fields.spawnDate')} error={errors.spawnDate}>
            {(p) => <TextInput {...p} type="date" value={form.spawnDate} onChange={(e) => update({ spawnDate: e.target.value })} />}
          </Field>
          <Field
            label={t('pages.batches.fields.expectedHarvestDate')}
            error={errors.expectedHarvestDate}
            hint={sp ? t('pages.batches.fields.expectedHint', { days: sp.averageGrowDays }) : undefined}
          >
            {(p) => (
              <TextInput
                {...p}
                type="date"
                min={form.spawnDate || undefined}
                value={form.expectedHarvestDate}
                onChange={(e) => {
                  setExpectedTouched(true)
                  update({ expectedHarvestDate: e.target.value })
                }}
              />
            )}
          </Field>
        </FormGrid>
        <Field label={t('pages.batches.fields.notes')} optional>
          {(p) => <Textarea {...p} rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />}
        </Field>
      </form>
    </Modal>
  )
}
