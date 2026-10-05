import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { SPACE_STATUSES } from '@/config/status'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ParkingLocation, ParkingSpace, PriceUnit, SpaceInput, SpaceType, VehicleType } from '@/types'

const SPACE_TYPES: SpaceType[] = ['truck', 'trailer', 'oversized', 'rv', 'car', 'compact', 'ev']
const VEHICLES: VehicleType[] = ['semi_trailer', 'bobtail', 'box_truck', 'rv', 'car', 'suv', 'pickup', 'motorcycle', 'van']
const UNITS: PriceUnit[] = ['night', 'day', 'hour']

interface SpaceFormProps {
  space?: ParkingSpace
  locations: ParkingLocation[]
  defaultLocationId?: string
  /** Suggests the next free number for the chosen location. */
  nextNumber: (locationId: string) => number
  pending: boolean
  onClose: () => void
  onSubmit: (input: SpaceInput) => void
}

function defaultsFor(location?: ParkingLocation): Pick<SpaceInput, 'type' | 'length' | 'width' | 'price' | 'priceUnit' | 'vehicleTypes'> {
  if (location?.category === 'car') return { type: 'car', length: 18, width: 9, price: 15, priceUnit: 'day', vehicleTypes: ['car', 'suv', 'pickup', 'van'] }
  if (location?.category === 'rv') return { type: 'rv', length: 45, width: 14, price: 55, priceUnit: 'night', vehicleTypes: ['rv', 'van'] }
  return { type: 'truck', length: 75, width: 12, price: 45, priceUnit: 'night', vehicleTypes: ['semi_trailer', 'bobtail', 'box_truck'] }
}

export function SpaceForm({ space, locations, defaultLocationId, nextNumber, pending, onClose, onSubmit }: SpaceFormProps) {
  const { t } = useI18n()
  const editing = Boolean(space)
  const [values, setValues] = useState<SpaceInput>(() => {
    if (space) {
      const { id: _id, updatedAt: _updated, ...rest } = space
      return rest
    }
    const locationId = defaultLocationId ?? locations[0]?.id ?? ''
    const location = locations.find((l) => l.id === locationId)
    return { locationId, number: nextNumber(locationId), zone: 'A', status: 'available', ...defaultsFor(location) }
  })
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof SpaceInput>(key: K, value: SpaceInput[K]) => setValues((v) => ({ ...v, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.locationId || !values.zone.trim() || values.number <= 0 || values.length <= 0 || values.width <= 0 || values.price < 0) {
      setError(t('errors.required'))
      return
    }
    setError(null)
    onSubmit({ ...values, zone: values.zone.trim().toUpperCase() })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('spacesPage.edit') : t('spacesPage.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="space-form" disabled={pending}>
            {pending ? t('common.saving') : editing ? t('common.saveChanges') : t('spacesPage.add')}
          </Button>
        </>
      }
    >
      <form id="space-form" onSubmit={submit} noValidate className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label={t('common.location')} className="col-span-2 sm:col-span-4">
          {(p) => (
            <SelectInput
              {...p}
              value={values.locationId}
              disabled={editing}
              onChange={(e) => {
                const location = locations.find((l) => l.id === e.target.value)
                setValues((v) => ({ ...v, locationId: e.target.value, number: nextNumber(e.target.value), ...defaultsFor(location) }))
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('spacesPage.form.number')}>
          {(p) => <TextInput {...p} type="number" min={1} value={values.number} onChange={(e) => set('number', Number(e.target.value))} />}
        </Field>
        <Field label={t('spacesPage.form.zone')}>
          {(p) => <TextInput {...p} value={values.zone} maxLength={2} onChange={(e) => set('zone', e.target.value.toUpperCase())} />}
        </Field>
        <Field label={t('spacesPage.form.type')}>
          {(p) => (
            <SelectInput {...p} value={values.type} onChange={(e) => set('type', e.target.value as SpaceType)}>
              {SPACE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`spaceType.${type}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('spacesPage.form.status')}>
          {(p) => (
            <SelectInput {...p} value={values.status} onChange={(e) => set('status', e.target.value as SpaceInput['status'])}>
              {SPACE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('spacesPage.form.length')}>
          {(p) => <TextInput {...p} type="number" min={1} value={values.length} onChange={(e) => set('length', Number(e.target.value))} />}
        </Field>
        <Field label={t('spacesPage.form.width')}>
          {(p) => <TextInput {...p} type="number" min={1} value={values.width} onChange={(e) => set('width', Number(e.target.value))} />}
        </Field>
        <Field label={t('spacesPage.form.price')}>
          {(p) => <TextInput {...p} type="number" min={0} value={values.price} onChange={(e) => set('price', Number(e.target.value))} />}
        </Field>
        <Field label={t('spacesPage.form.priceUnit')}>
          {(p) => (
            <SelectInput {...p} value={values.priceUnit} onChange={(e) => set('priceUnit', e.target.value as PriceUnit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`locationsPage.form.units.${u}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <fieldset className="col-span-2 sm:col-span-4">
          <legend className="mb-2 text-xs font-semibold text-text-secondary">{t('spacesPage.form.vehicleTypes')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {VEHICLES.map((vehicle) => {
              const checked = values.vehicleTypes.includes(vehicle)
              return (
                <label
                  key={vehicle}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                    checked ? 'border-brand bg-brand-soft text-brand-ink' : 'border-glass-border bg-surface-hover text-text-secondary',
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      set('vehicleTypes', checked ? values.vehicleTypes.filter((v) => v !== vehicle) : [...values.vehicleTypes, vehicle])
                    }
                  />
                  {t(`vehicle.${vehicle}`)}
                </label>
              )
            })}
          </div>
        </fieldset>
        {error && <p className="col-span-2 text-xs font-medium text-occupied-ink sm:col-span-4">{error}</p>}
      </form>
    </Modal>
  )
}
