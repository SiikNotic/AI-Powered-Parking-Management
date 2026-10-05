import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/** Mark: a mushroom cap over three mycelium roots — growth on a network. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('size-9 shrink-0', className)}>
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <path d="M9.5 19.5c0-6.1 4.7-10.5 10.5-10.5s10.5 4.4 10.5 10.5c0 .8-.6 1.3-1.3 1.3H10.8c-.7 0-1.3-.5-1.3-1.3Z" fill="var(--text-inverse)" />
      <path d="M17.2 21.2v4.3c0 1.6 1.2 2.8 2.8 2.8s2.8-1.2 2.8-2.8v-4.3" fill="none" stroke="var(--text-inverse)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 28.3v3.2M20 31.5l-4.5 1.6M20 31.5l4.5 1.6" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="15.5" r="1.3" fill="var(--brand)" opacity="0.35" />
      <circle cx="23.5" cy="13.8" r="1" fill="var(--brand)" opacity="0.35" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-text">{t('app.name')}</span>
          <span className="mt-1 text-[0.6875rem] font-medium text-text-muted">{t('app.tagline')}</span>
        </span>
      )}
    </span>
  )
}
