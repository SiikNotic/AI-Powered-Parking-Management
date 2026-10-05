import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useI18n, type TranslationKey } from '@/i18n'
import type { LocationInput, LocationSetup, ParkingCategory, ParkingLocation, PriceUnit } from '@/types'

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles'] as const
const CATEGORIES: ParkingCategory[] = ['truck', 'car', 'rv']
const UNITS: PriceUnit[] = ['night', 'day', 'hour']

interface LocationFormProps {
  open: boolean
  location?: ParkingLocation
  pending: boolean
  onClose: () => void
  onSubmit: (input: LocationInput, setup?: LocationSetup) => void
}

const defaultsFor = (category: ParkingCategory): Pick<LocationSetup, 'price' | 'priceUnit'> =>
  category === 'car' ? { price: 15, priceUnit: 'day' } : category === 'rv' ? { price: 55, priceUnit: 'night' } : { price: 45, priceUnit: 'night' }

export function LocationForm({ open, location, pending, onClose, onSubmit }: LocationFormProps) {
  const { t } = useI18n()
  const editing = Boolean(location)
  const [values, setValues] = useState<LocationInput>(() => ({
    name: location?.name ?? '',
    code: location?.code ?? '',
    category: location?.category ?? 'truck',
    address: location?.address ?? '',
    city: location?.city ?? '',
    state: location?.state ?? '',
    timezone: location?.timezone ?? 'America/New_York',
  }))
  const [setup, setSetup] = useState<LocationSetup>({ spaces: 24, zones: 2, ...defaultsFor(location?.category ?? 'truck') })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const set = <K extends keyof LocationInput>(key: K, value: LocationInput[K]) => setValues((v) => ({ ...v, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    for (const key of ['name', 'code', 'address', 'city', 'state'] as const) {
      if (!values[key].trim()) next[key] = t('errors.required')
    }
    if (values.code && !/^[A-Za-z]{2,5}$/.test(values.code.trim())) next.code = t('locationsPage.form.codeHint')
    if (!editing && (setup.spaces < 0 || setup.price < 0)) next.spaces = t('errors.positiveNumber')
    setErrors(next)
    if (Object.keys(next).length) return
    const input = { ...values, code: values.code.trim().toUpperCase(), state: values.state.trim().toUpperCase() }
    onSubmit(input, editing ? undefined : setup)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('locationsPage.edit') : t('locationsPage.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="location-form" disabled={pending}>
            {pending ? t('common.saving') : editing ? t('common.saveChanges') : t('locationsPage.add')}
          </Button>
        </>
      }
    >
      <form id="location-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field label={t('locationsPage.form.name')} error={errors.name} className="sm:col-span-4">
          {(p) => <TextInput {...p} value={values.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />}
        </Field>
        <Field label={t('locationsPage.form.code')} hint={t('locationsPage.form.codeHint')} error={errors.code} className="sm:col-span-2">
          {(p) => <TextInput {...p} value={values.code} maxLength={5} onChange={(e) => set('code', e.target.value.toUpperCase())} />}
        </Field>
        <Field label={t('locationsPage.form.category')} className="sm:col-span-3">
          {(p) => (
            <SelectInput
              {...p}
              value={values.category}
              onChange={(e) => {
                const category = e.target.value as ParkingCategory
                set('category', category)
                setSetup((s) => ({ ...s, ...defaultsFor(category) }))
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('locationsPage.form.timezone')} className="sm:col-span-3">
          {(p) => (
            <SelectInput {...p} value={values.timezone} onChange={(e) => set('timezone', e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {t(`timezones.${tz}` as TranslationKey)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('locationsPage.form.address')} error={errors.address} className="sm:col-span-6">
          {(p) => <TextInput {...p} value={values.address} onChange={(e) => set('address', e.target.value)} autoComplete="street-address" />}
        </Field>
        <Field label={t('locationsPage.form.city')} error={errors.city} className="sm:col-span-4">
          {(p) => <TextInput {...p} value={values.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />}
        </Field>
        <Field label={t('locationsPage.form.state')} error={errors.state} className="sm:col-span-2">
          {(p) => <TextInput {...p} value={values.state} maxLength={2} onChange={(e) => set('state', e.target.value.toUpperCase())} autoComplete="address-level1" />}
        </Field>

        {!editing && (
          <fieldset className="grid grid-cols-2 gap-4 rounded-2xl bg-surface-sunken p-4 sm:col-span-6 sm:grid-cols-4">
            <legend className="sr-only">{t('locationsPage.form.setupTitle')}</legend>
            <p className="col-span-2 text-xs text-text-secondary sm:col-span-4">
              <span className="font-semibold text-text">{t('locationsPage.form.setupTitle')}.</span> {t('locationsPage.form.setupHint')}
            </p>
            <Field label={t('locationsPage.form.spaces')} error={errors.spaces}>
              {(p) => <TextInput {...p} type="number" min={0} max={500} value={setup.spaces} onChange={(e) => setSetup((s) => ({ ...s, spaces: Number(e.target.value) }))} />}
            </Field>
            <Field label={t('locationsPage.form.zones')}>
              {(p) => <TextInput {...p} type="number" min={1} max={26} value={setup.zones} onChange={(e) => setSetup((s) => ({ ...s, zones: Number(e.target.value) }))} />}
            </Field>
            <Field label={t('locationsPage.form.price')}>
              {(p) => <TextInput {...p} type="number" min={0} step={1} value={setup.price} onChange={(e) => setSetup((s) => ({ ...s, price: Number(e.target.value) }))} />}
            </Field>
            <Field label={t('locationsPage.form.priceUnit')}>
              {(p) => (
                <SelectInput {...p} value={setup.priceUnit} onChange={(e) => setSetup((s) => ({ ...s, priceUnit: e.target.value as PriceUnit }))}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`locationsPage.form.units.${u}`)}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
          </fieldset>
        )}
      </form>
    </Modal>
  )
}
