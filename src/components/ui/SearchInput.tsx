import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { inputClass } from './Form'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder, label, className }: SearchInputProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'pl-9')}
      />
    </div>
  )
}
