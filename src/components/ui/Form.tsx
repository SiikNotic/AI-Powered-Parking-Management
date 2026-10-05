import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export const inputClass =
  'h-10 w-full rounded-xl border border-glass-border bg-surface-hover px-3 text-sm text-text placeholder:text-text-muted ' +
  'transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 ' +
  'disabled:opacity-60 aria-[invalid=true]:border-occupied'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const { t } = useI18n()
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-text-secondary">
        {label}
        {optional && <span className="font-normal text-text-muted"> ({t('common.optional')})</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-occupied-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, 'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: 'var(--select-chevron)' }} {...props}>
      {children}
    </select>
  )
}

interface ToggleProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

/** Switch with a visible label (role="switch"). */
export function Toggle({ id, checked, onChange, label, description }: ToggleProps) {
  const autoId = useId()
  const switchId = id ?? autoId
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={switchId} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-text-muted">{description}</span>}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-glass-border transition-colors',
          checked ? 'bg-brand' : 'bg-surface-sunken',
        )}
      >
        <span
          aria-hidden
          className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')}
        />
      </button>
    </div>
  )
}
