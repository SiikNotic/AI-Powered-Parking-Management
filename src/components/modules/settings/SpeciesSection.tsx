import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { speciesColor } from '@/components/dashboard/format'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useCommand } from '@/hooks/useCommand'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { toNumber } from '@/lib/number'
import type { MushroomSpecies, Range } from '@/types'
import { parseRange, toRangeDraft } from './range'
import { RangeInputs } from './RangeInputs'

type Draft = Omit<MushroomSpecies, 'id'> & { id?: string }

const emptySpecies = (colorIndex: number): Draft => ({
  name: '',
  scientificName: '',
  incubationTemp: { min: 75, max: 80 },
  fruitingTemp: { min: 60, max: 70 },
  humidity: { min: 85, max: 95 },
  co2: { min: 400, max: 1000 },
  averageYield: 0.18,
  averageGrowDays: 30,
  shelfLifeDays: 7,
  colorIndex: colorIndex % 5,
})

function Swatch({ index, className }: { index: number; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-3 shrink-0 rounded-full ring-1 ring-black/10', className)} style={{ background: speciesColor(index) }} />
}

export function SpeciesSection({ species, canEdit }: { species: MushroomSpecies[]; canEdit: boolean }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [draft, setDraft] = useState<Draft | null>(null)
  const range = (r: Range, unit: string) => `${fmt.decimal(r.min)}–${fmt.decimal(r.max)}${unit}`

  const columns: Column<MushroomSpecies>[] = [
    {
      key: 'name',
      header: t('pages.settings.species.columns.name'),
      sort: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-2">
          <Swatch index={s.colorIndex} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-text">{s.name}</span>
            {s.scientificName && <span className="block truncate text-[0.6875rem] italic text-text-muted">{s.scientificName}</span>}
          </span>
        </span>
      ),
    },
    { key: 'temp', header: t('pages.settings.species.columns.fruitingTemp'), cell: (s) => range(s.fruitingTemp, '°F') },
    { key: 'humidity', header: t('pages.settings.species.columns.humidity'), cell: (s) => range(s.humidity, '%') },
    { key: 'co2', header: t('pages.settings.species.columns.co2'), cell: (s) => range(s.co2, ' ppm'), hideOnMobile: true },
    { key: 'yield', header: t('pages.settings.species.columns.yield'), align: 'right', cell: (s) => fmt.percent(s.averageYield), sort: (s) => s.averageYield },
    { key: 'grow', header: t('pages.settings.species.columns.growDays'), align: 'right', cell: (s) => t('pages.settings.species.days', { count: s.averageGrowDays }), sort: (s) => s.averageGrowDays },
    { key: 'shelf', header: t('pages.settings.species.columns.shelfLife'), align: 'right', cell: (s) => t('pages.settings.species.days', { count: s.shelfLifeDays }), sort: (s) => s.shelfLifeDays, hideOnMobile: true },
  ]

  return (
    <Card labelledBy="settings-species">
      <CardHeader
        id="settings-species"
        title={t('pages.settings.species.title')}
        subtitle={t('pages.settings.species.subtitle')}
        action={
          canEdit ? (
            <Button size="sm" variant="primary" onClick={() => setDraft(emptySpecies(species.length))}>
              <Plus aria-hidden className="size-3.5" />
              {t('pages.settings.species.add')}
            </Button>
          ) : undefined
        }
      />
      {!canEdit && <p className="tile mb-4 rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.settings.readOnly')}</p>}
      <DataTable rows={species} columns={columns} rowKey={(s) => s.id} label={t('pages.settings.species.title')} onRowClick={canEdit ? (s) => setDraft({ ...s }) : undefined} initialSort={{ key: 'name', dir: 'asc' }} />
      {draft && <SpeciesForm draft={draft} onClose={() => setDraft(null)} />}
    </Card>
  )
}

function SpeciesForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveSpecies')
  const [form, setForm] = useState({
    name: draft.name,
    scientificName: draft.scientificName,
    incubationTemp: toRangeDraft(draft.incubationTemp),
    fruitingTemp: toRangeDraft(draft.fruitingTemp),
    humidity: toRangeDraft(draft.humidity),
    co2: toRangeDraft(draft.co2),
    averageYield: String(Math.round(draft.averageYield * 1000) / 10),
    averageGrowDays: String(draft.averageGrowDays),
    shelfLifeDays: String(draft.shelfLifeDays),
    colorIndex: draft.colorIndex,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const ranges = { incubationTemp: parseRange(form.incubationTemp), fruitingTemp: parseRange(form.fruitingTemp), humidity: parseRange(form.humidity), co2: parseRange(form.co2) }
    for (const [k, v] of Object.entries(ranges)) if (!v) next[k] = t('pages.settings.species.errors.range')
    if (ranges.humidity && (ranges.humidity.min < 0 || ranges.humidity.max > 100)) next.humidity = t('pages.settings.species.errors.range')
    if (ranges.co2 && ranges.co2.min < 0) next.co2 = t('pages.settings.species.errors.range')
    const yieldPct = toNumber(form.averageYield)
    const growDays = toNumber(form.averageGrowDays)
    const shelfDays = toNumber(form.shelfLifeDays)
    if (!form.name.trim()) next.name = t('pages.settings.species.errors.name')
    if (!(yieldPct > 0 && yieldPct <= 100)) next.averageYield = t('pages.settings.species.errors.yield')
    if (!(Number.isInteger(growDays) && growDays > 0)) next.averageGrowDays = t('pages.settings.species.errors.days')
    if (!(Number.isInteger(shelfDays) && shelfDays > 0)) next.shelfLifeDays = t('pages.settings.species.errors.days')
    setErrors(next)
    const { incubationTemp, fruitingTemp, humidity, co2 } = ranges
    if (Object.keys(next).length || !incubationTemp || !fruitingTemp || !humidity || !co2) return
    const result = await save.run(
      [{ id: draft.id, name: form.name.trim(), scientificName: form.scientificName.trim(), incubationTemp, fruitingTemp, humidity, co2, averageYield: yieldPct / 100, averageGrowDays: growDays, shelfLifeDays: shelfDays, colorIndex: form.colorIndex }],
      t('pages.settings.species.saved'),
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={draft.id ? t('pages.settings.species.editTitle') : t('pages.settings.species.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="species-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="species-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.settings.species.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} />}
          </Field>
          <Field label={t('pages.settings.species.fields.scientificName')} optional>
            {(p) => <TextInput {...p} value={form.scientificName} maxLength={120} className="italic" onChange={(e) => set('scientificName', e.target.value)} />}
          </Field>
          <RangeInputs label={t('pages.settings.species.fields.fruitingTemp')} value={form.fruitingTemp} onChange={(v) => set('fruitingTemp', v)} error={errors.fruitingTemp} />
          <RangeInputs label={t('pages.settings.species.fields.incubationTemp')} value={form.incubationTemp} onChange={(v) => set('incubationTemp', v)} error={errors.incubationTemp} />
          <RangeInputs label={t('pages.settings.species.fields.humidity')} value={form.humidity} onChange={(v) => set('humidity', v)} error={errors.humidity} />
          <RangeInputs label={t('pages.settings.species.fields.co2')} value={form.co2} onChange={(v) => set('co2', v)} error={errors.co2} />
          <Field label={t('pages.settings.species.fields.averageYield')} hint={t('pages.settings.species.fields.averageYieldHint')} error={errors.averageYield}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.averageYield} onChange={(e) => set('averageYield', e.target.value)} />}
          </Field>
          <Field label={t('pages.settings.species.fields.growDays')} error={errors.averageGrowDays}>
            {(p) => <TextInput {...p} inputMode="numeric" value={form.averageGrowDays} onChange={(e) => set('averageGrowDays', e.target.value)} />}
          </Field>
          <Field label={t('pages.settings.species.fields.shelfLife')} error={errors.shelfLifeDays}>
            {(p) => <TextInput {...p} inputMode="numeric" value={form.shelfLifeDays} onChange={(e) => set('shelfLifeDays', e.target.value)} />}
          </Field>
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-xs font-semibold text-text-secondary">{t('pages.settings.species.fields.color')}</legend>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <label key={i} className={cn('tile flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-xs text-text-secondary has-[:checked]:border-brand has-[:checked]:text-text has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30')}>
                  <input type="radio" name="species-color" className="sr-only" checked={form.colorIndex === i} onChange={() => set('colorIndex', i)} />
                  <Swatch index={i} className="size-4" />
                  {t('pages.settings.species.fields.colorOption', { number: i + 1 })}
                </label>
              ))}
            </div>
          </fieldset>
        </FormGrid>
      </form>
    </Modal>
  )
}
