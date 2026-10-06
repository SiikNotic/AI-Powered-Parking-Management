import { Info } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/States'
import { expectedYield } from '@/domain/production'
import { useCommand } from '@/hooks/useCommand'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { FarmData } from '@/services/shared/records'
import type { HarvestGrade } from '@/types'
import { HARVESTABLE } from '../batches/access'

const GRADES: HarvestGrade[] = ['A', 'B', 'C']

/** `YYYY-MM-DDTHH:mm` in local time, for datetime-local inputs. */
function localDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Append-only harvest entry. Net weight (wet − waste) is moved into stock by the service. */
export function HarvestForm({ data, batchId, onClose }: { data: FarmData; batchId?: string; onClose: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const record = useCommand('recordHarvest')
  const batches = useMemo(() => data.batches.filter((b) => HARVESTABLE.includes(b.status)).sort((a, b) => a.code.localeCompare(b.code)), [data])
  const [form, setForm] = useState(() => ({
    batchId: batchId && batches.some((b) => b.id === batchId) ? batchId : (batches[0]?.id ?? ''),
    wet: '',
    waste: '0',
    grade: 'A' as HarvestGrade,
    employeeId: '',
    date: localDateTime(new Date()),
  }))
  const [maxDate] = useState(() => localDateTime(new Date()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const speciesById = new Map(data.species.map((s) => [s.id, s]))
  const roomName = new Map(data.rooms.map((r) => [r.id, r.name]))
  const batch = batches.find((b) => b.id === form.batchId)
  const species = batch ? speciesById.get(batch.speciesId) : undefined
  const harvested = batch ? data.harvests.filter((h) => h.batchId === batch.id).reduce((s, h) => s + h.wetWeight, 0) : 0
  const wet = toNumber(form.wet)
  const waste = toNumber(form.waste)
  const net = wet > 0 && waste >= 0 && waste <= wet ? wet - waste : null
  const employees = data.employees.filter((e) => e.active)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const when = new Date(form.date)
    if (!batch) next.batchId = t('pages.harvest.form.errors.batch')
    if (!(wet > 0)) next.wet = t('pages.harvest.form.errors.wet')
    if (!(waste >= 0) || (wet > 0 && waste > wet)) next.waste = t('pages.harvest.form.errors.waste')
    if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 5 * 60_000) next.date = t('pages.harvest.form.errors.date')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await record.run(
      [{ batchId: form.batchId, wetWeight: wet, wasteWeight: waste, grade: form.grade, employeeId: form.employeeId || null, date: when.toISOString() }],
      t('pages.harvest.form.saved', { value: fmt.pounds(wet - waste) }),
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pages.harvest.form.title')}
      footer={
        batches.length ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('form.cancel')}
            </Button>
            <Button variant="primary" type="submit" form="harvest-form" disabled={record.pending}>
              {record.pending ? t('form.saving') : t('pages.harvest.form.save')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        )
      }
    >
      {!batches.length ? (
        <EmptyState title={t('pages.harvest.form.noBatches')} />
      ) : (
        <form id="harvest-form" onSubmit={submit} noValidate className="space-y-4">
          <p className="flex gap-2 rounded-xl bg-info-soft px-3 py-2 text-[0.8125rem] text-info-ink">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t('pages.harvest.appendOnly')}
          </p>
          <Field
            label={t('pages.harvest.form.batch')}
            error={errors.batchId}
            hint={batch && species ? t('pages.harvest.form.remaining', { harvested: fmt.pounds(harvested), expected: fmt.pounds(expectedYield(batch, species)) }) : undefined}
          >
            {(p) => (
              <Select {...p} value={form.batchId} onChange={(e) => set('batchId', e.target.value)}>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.code} · {speciesById.get(b.speciesId)?.name ?? '—'} · {roomName.get(b.roomId) ?? '—'} · {t(`batch.status.${b.status}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <FormGrid>
            <Field label={t('pages.harvest.form.wet')} error={errors.wet}>
              {(p) => <TextInput {...p} inputMode="decimal" value={form.wet} onChange={(e) => set('wet', e.target.value)} />}
            </Field>
            <Field label={t('pages.harvest.form.waste')} hint={t('pages.harvest.form.wasteHint')} error={errors.waste}>
              {(p) => <TextInput {...p} inputMode="decimal" value={form.waste} onChange={(e) => set('waste', e.target.value)} />}
            </Field>
            <Field label={t('pages.harvest.form.grade')}>
              {(p) => (
                <Select {...p} value={form.grade} onChange={(e) => set('grade', e.target.value as HarvestGrade)}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {t(`labels.grade.${g}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.harvest.form.employee')} optional>
              {(p) => (
                <Select {...p} value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
                  <option value="">{t('pages.harvest.form.noEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('pages.harvest.form.date')} error={errors.date}>
              {(p) => <TextInput {...p} type="datetime-local" max={maxDate} value={form.date} onChange={(e) => set('date', e.target.value)} />}
            </Field>
          </FormGrid>
          <p className="tabular text-sm font-semibold text-text" aria-live="polite">
            {t('pages.harvest.form.net', { value: net === null ? '—' : fmt.pounds(net) })}
          </p>
        </form>
      )}
    </Modal>
  )
}
