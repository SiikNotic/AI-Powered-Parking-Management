import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
  labelledBy?: string
}

export function Card({ children, className, as: Tag = 'section', labelledBy }: CardProps) {
  return (
    <Tag
      aria-labelledby={labelledBy}
      className={cn(
        'panel min-w-0 rounded-card',
        'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

interface CardHeaderProps {
  id: string
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
  icon?: ReactNode
}

export function CardHeader({ id, title, subtitle, action, className, icon }: CardHeaderProps) {
  return (
    <header className={cn('mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">{icon}</span>}
        <div className="min-w-0">
        <h2 id={id} className="font-display text-[1rem] font-semibold tracking-[-0.01em] text-text">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[0.8125rem] text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}
