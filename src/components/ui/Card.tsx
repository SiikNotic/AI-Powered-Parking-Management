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
        'rounded-card border border-border bg-surface shadow-card',
        'p-5 sm:p-6',
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
}

export function CardHeader({ id, title, subtitle, action, className }: CardHeaderProps) {
  return (
    <header className={cn('mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-text">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-[0.8125rem] text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}
