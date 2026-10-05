import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
  icon?: ReactNode
}

/** Compact figure for a page's summary row. */
export function StatCard({ label, value, hint, tone = 'default', icon }: StatCardProps) {
  return (
    <div className="panel min-w-0 rounded-card p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[0.75rem] font-medium text-text-secondary">{label}</p>
        {icon && <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">{icon}</span>}
      </div>
      <p
        className={cn(
          'tabular mt-1.5 truncate font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.02em]',
          tone === 'danger' ? 'text-crit-ink' : tone === 'warning' ? 'text-warn-ink' : tone === 'success' ? 'text-ok-ink' : 'text-text',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-[0.75rem] text-text-muted">{hint}</p>}
    </div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
}
