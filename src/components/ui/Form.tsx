import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export const inputClass =
  'tile h-10 w-full rounded-xl px-3 text-sm text-text placeholder:text-text-muted transition-colors ' +
  'hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60 ' +
  'aria-[invalid=true]:border-crit'

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
        {optional && <span className="font-normal text-text-muted"> ({t('form.optional')})</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-crit-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(inputClass, 'appearance-none bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat pr-8', className)}
      style={{ backgroundImage: 'var(--select-chevron)' }}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-20 py-2', className)} {...props} />
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 text-sm text-text', className)}>
      <input type="checkbox" className="size-4 accent-[var(--brand)]" {...props} />
      {label}
    </label>
  )
}

/** Responsive grid for form fields. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>
}
