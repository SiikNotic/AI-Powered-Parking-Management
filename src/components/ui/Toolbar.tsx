import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { inputClass, Select } from './Form'

/** Row of list controls: search on the left, filters and actions after it. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('relative min-w-0 flex-1 sm:max-w-xs', className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('table.search')}
        aria-label={placeholder ?? t('table.search')}
        className={cn(inputClass, 'pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label={t('table.clearSearch')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text">
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  )
}

interface FilterSelectProps<T extends string> {
  label: string
  value: T | ''
  onChange: (v: T | '') => void
  options: { value: T; label: string }[]
  allLabel?: string
  className?: string
}

export function FilterSelect<T extends string>({ label, value, onChange, options, allLabel, className }: FilterSelectProps<T>) {
  const { t } = useI18n()
  return (
    <div className={cn('w-full sm:w-auto sm:min-w-44', className)}>
      <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T | '')}>
        <option value="">{allLabel ?? `${label}: ${t('table.all')}`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
