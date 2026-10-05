import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Page container used by every module page. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[1680px] space-y-4 px-3 py-5 sm:px-6 sm:py-6 lg:px-8', className)}>{children}</div>
}

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-text sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
