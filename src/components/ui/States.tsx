import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-lg', className)} />
}

/** Screen-reader friendly wrapper for a loading region. */
export function LoadingState({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{t('states.loading')}</span>
      {children}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-text-muted">
        <Icon aria-hidden className="size-5" />
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[0.8125rem] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  onRetry?: () => void
  className?: string
}

export function ErrorState({ onRetry, className }: ErrorStateProps) {
  const { t } = useI18n()
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-crit-soft text-crit-ink">
        <AlertTriangle aria-hidden className="size-5" />
      </div>
      <p className="text-sm font-semibold text-text">{t('states.errorTitle')}</p>
      <p className="mt-1 max-w-xs text-[0.8125rem] text-text-muted">{t('states.errorDescription')}</p>
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          {t('states.retry')}
        </Button>
      )}
    </div>
  )
}
