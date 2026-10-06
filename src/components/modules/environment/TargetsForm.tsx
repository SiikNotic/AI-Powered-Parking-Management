import { useState, type FormEvent } from 'react'
import { METRIC_UNIT } from '@/components/dashboard/format'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { METRICS } from '@/domain/environment'
import { useCommand } from '@/hooks/useCommand'
import { useI18n } from '@/i18n'
import { toNumber } from '@/lib/number'
import type { GrowRoom, Metric } from '@/types'

type Draft = Record<Metric, { min: string; max: string }>

export function TargetsForm({ room, onClose }: { room: GrowRoom; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveRoom')
  const [form, setForm] = useState<Draft>(() => {
    const draft = {} as Draft
    for (const m of METRICS) draft[m] = { min: String(room.targets[m].min), max: String(room.targets[m].max) }
    return draft
  })
  const [errors, setErrors] = useState<Partial<Record<Metric, string>>>({})
  const set = (metric: Metric, bound: 'min' | 'max', value: string) => setForm((f) => ({ ...f, [metric]: { ...f[metric], [bound]: value } }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Partial<Record<Metric, string>> = {}
    const targets = {} as GrowRoom['targets']
    for (const m of METRICS) {
      const min = toNumber(form[m].min)
      const max = toNumber(form[m].max)
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0) next[m] = t('pages.environment.targets.errorNumber')
      else if (min > max) next[m] = t('pages.environment.targets.errorOrder')
      targets[m] = { min, max }
    }
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await save.run([{ id: room.id, name: room.name, type: room.type, targets }], t('pages.environment.targets.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pages.environment.targets.title', { room: room.name })}
      description={t('pages.environment.targets.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="targets-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="targets-form" onSubmit={submit} noValidate className="space-y-5">
        {METRICS.map((m) => (
          <fieldset key={m} className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-text">
              {t(`environment.metrics.${m}`)} <span className="font-normal text-text-muted">({METRIC_UNIT[m]})</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('pages.environment.targets.min')} error={errors[m]}>
                {(p) => <TextInput {...p} inputMode="decimal" value={form[m].min} onChange={(e) => set(m, 'min', e.target.value)} />}
              </Field>
              <Field label={t('pages.environment.targets.max')}>
                {(p) => <TextInput {...p} inputMode="decimal" aria-invalid={errors[m] ? true : undefined} value={form[m].max} onChange={(e) => set(m, 'max', e.target.value)} />}
              </Field>
            </div>
          </fieldset>
        ))}
      </form>
    </Modal>
  )
}
