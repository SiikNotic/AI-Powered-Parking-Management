import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/i18n'
import type { Customer, CustomerInput } from '@/types'

interface CustomerFormProps {
  customer?: Customer
  pending: boolean
  onClose: () => void
  onSubmit: (input: CustomerInput) => void
}

export function CustomerForm({ customer, pending, onClose, onSubmit }: CustomerFormProps) {
  const { t } = useI18n()
  const [values, setValues] = useState<CustomerInput>({
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    company: customer?.company ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({})
  const set = (key: keyof CustomerInput, value: string) => setValues((v) => ({ ...v, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!values.name.trim()) next.name = t('errors.required')
    if (!values.phone.trim()) next.phone = t('errors.required')
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) next.email = t('errors.invalidEmail')
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit({ ...values, name: values.name.trim(), company: values.company?.trim() || undefined })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? t('customersPage.edit') : t('customersPage.add')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="customer-form" disabled={pending}>
            {pending ? t('common.saving') : customer ? t('common.saveChanges') : t('customersPage.add')}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate className="grid gap-4">
        <Field label={t('customersPage.form.name')} error={errors.name}>
          {(p) => <TextInput {...p} value={values.name} autoComplete="name" onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label={t('customersPage.form.phone')} error={errors.phone}>
          {(p) => <TextInput {...p} type="tel" value={values.phone} autoComplete="tel" onChange={(e) => set('phone', e.target.value)} />}
        </Field>
        <Field label={t('customersPage.form.email')} error={errors.email} optional>
          {(p) => <TextInput {...p} type="email" value={values.email} autoComplete="email" onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label={t('customersPage.form.company')} optional>
          {(p) => <TextInput {...p} value={values.company ?? ''} autoComplete="organization" onChange={(e) => set('company', e.target.value)} />}
        </Field>
      </form>
    </Modal>
  )
}
