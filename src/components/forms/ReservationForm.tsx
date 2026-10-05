import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { fromLocalInput, roundedFromNow, toLocalInput } from '@/lib/dates'
import { customerService, parkingService } from '@/services'
import type { CustomerInput, ParkingLocation, ReservationInput, VehicleType } from '@/types'

interface ReservationFormProps {
  locations: ParkingLocation[]
  defaultLocationId?: string
  defaultCustomerId?: string
  pending: boolean
  onClose: () => void
  /** `newCustomer` is created first when the manager adds someone new. */
  onSubmit: (input: Omit<ReservationInput, 'customerId'> & { customerId?: string }, newCustomer?: CustomerInput) => void
}

export function ReservationForm({ locations, defaultLocationId, defaultCustomerId, pending, onClose, onSubmit }: ReservationFormProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? '')
  const spaces = useAsync(() => parkingService.getSpaces(locationId), [locationId], ['spaces'])
  const customers = useAsync(() => customerService.list(), [], ['customers'])
  const [spaceId, setSpaceId] = useState('')
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? '')
  const [newCustomer, setNewCustomer] = useState<CustomerInput>({ name: '', email: '', phone: '', company: '' })
  const [vehicle, setVehicle] = useState<VehicleType | ''>('')
  const [checkIn, setCheckIn] = useState(() => toLocalInput(roundedFromNow(2)))
  const [checkOut, setCheckOut] = useState(() => toLocalInput(roundedFromNow(16)))
  const [status, setStatus] = useState<ReservationInput['status']>('confirmed')
  const [error, setError] = useState<string | null>(null)

  const bookable = useMemo(
    () => (spaces.data ?? []).filter((s) => s.status === 'available' || s.status === 'reserved').sort((a, b) => a.number - b.number),
    [spaces.data],
  )
  const space = bookable.find((s) => s.id === spaceId)
  const vehicleOptions = space?.vehicleTypes ?? []

  const total = useMemo(() => {
    if (!space || !checkIn || !checkOut) return null
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    if (ms <= 0) return null
    const unit = space.priceUnit === 'hour' ? 3_600_000 : 86_400_000
    return space.price * Math.max(1, Math.ceil(ms / unit))
  }, [space, checkIn, checkOut])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const missingCustomer = customerMode === 'existing' ? !customerId : !newCustomer.name.trim() || !newCustomer.phone.trim()
    if (!locationId || !spaceId || !vehicle || !checkIn || !checkOut || missingCustomer) {
      setError(t('errors.required'))
      return
    }
    if (customerMode === 'new' && newCustomer.email && !/^\S+@\S+\.\S+$/.test(newCustomer.email)) {
      setError(t('errors.invalidEmail'))
      return
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError(t('errors.invalidDates'))
      return
    }
    setError(null)
    onSubmit(
      {
        locationId,
        spaceId,
        customerId: customerMode === 'existing' ? customerId : undefined,
        vehicleType: vehicle,
        checkIn: fromLocalInput(checkIn),
        checkOut: fromLocalInput(checkOut),
        status,
      },
      customerMode === 'new' ? { ...newCustomer, company: newCustomer.company || undefined } : undefined,
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('reservationsPage.new')}
      size="lg"
      footer={
        <>
          {total !== null && (
            <p className="mr-auto text-sm text-text-secondary">
              {t('reservationsPage.form.estimatedTotal')}: <span className="tabular font-semibold text-text">{fmt.currency(total)}</span>
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="reservation-form" disabled={pending}>
            {pending ? t('common.saving') : t('reservationsPage.new')}
          </Button>
        </>
      }
    >
      <form id="reservation-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('common.location')}>
          {(p) => (
            <SelectInput
              {...p}
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value)
                setSpaceId('')
                setVehicle('')
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
        <Field label={t('reservationsPage.form.space')}>
          {(p) => (
            <SelectInput
              {...p}
              value={spaceId}
              disabled={!spaces.data}
              onChange={(e) => {
                setSpaceId(e.target.value)
                const next = bookable.find((s) => s.id === e.target.value)
                setVehicle(next?.vehicleTypes[0] ?? '')
              }}
            >
              <option value="">{t('reservationsPage.form.selectSpace')}</option>
              {bookable.map((s) => (
                <option key={s.id} value={s.id}>
                  {t('reservationsPage.form.spaceOption', {
                    number: s.number,
                    type: t(`spaceType.${s.type}`),
                    price: fmt.currency(s.price),
                    unit: t(`priceUnit.${s.priceUnit}`),
                  })}
                  {s.status === 'reserved' ? ` · ${t('status.reserved')}` : ''}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <div className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-secondary">{t('reservationsPage.form.customer')}</span>
            <SegmentedControl
              label={t('reservationsPage.form.customer')}
              value={customerMode}
              onChange={setCustomerMode}
              options={[
                { value: 'existing', label: t('reservationsPage.form.existingCustomer') },
                { value: 'new', label: t('reservationsPage.form.newCustomer') },
              ]}
            />
          </div>
          {customerMode === 'existing' ? (
            <SelectInput aria-label={t('reservationsPage.form.customer')} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t('reservationsPage.form.selectCustomer')}</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </SelectInput>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('customersPage.form.name')}>
                {(p) => <TextInput {...p} value={newCustomer.name} autoComplete="name" onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />}
              </Field>
              <Field label={t('customersPage.form.phone')}>
                {(p) => <TextInput {...p} type="tel" value={newCustomer.phone} autoComplete="tel" onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />}
              </Field>
              <Field label={t('customersPage.form.email')} optional>
                {(p) => <TextInput {...p} type="email" value={newCustomer.email} autoComplete="email" onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} />}
              </Field>
              <Field label={t('customersPage.form.company')} optional>
                {(p) => <TextInput {...p} value={newCustomer.company ?? ''} autoComplete="organization" onChange={(e) => setNewCustomer((c) => ({ ...c, company: e.target.value }))} />}
              </Field>
            </div>
          )}
        </div>

        <Field label={t('reservationsPage.form.vehicle')}>
          {(p) => (
            <SelectInput {...p} value={vehicle} disabled={!space} onChange={(e) => setVehicle(e.target.value as VehicleType)}>
              {!space && <option value="">—</option>}
              {vehicleOptions.map((v) => (
                <option key={v} value={v}>
                  {t(`vehicle.${v}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('reservationsPage.form.status')}>
          {(p) => (
            <SelectInput {...p} value={status} onChange={(e) => setStatus(e.target.value as ReservationInput['status'])}>
              <option value="confirmed">{t('reservationStatus.confirmed')}</option>
              <option value="pending">{t('reservationStatus.pending')}</option>
            </SelectInput>
          )}
        </Field>
        <Field label={t('reservationsPage.form.checkIn')}>
          {(p) => <TextInput {...p} type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />}
        </Field>
        <Field label={t('reservationsPage.form.checkOut')}>
          {(p) => <TextInput {...p} type="datetime-local" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />}
        </Field>
        {error && <p className="text-xs font-medium text-occupied-ink sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  )
}
