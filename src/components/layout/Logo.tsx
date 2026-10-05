import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('size-9 shrink-0', className)}>
      <defs>
        <linearGradient id="sky-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--signature-from)" />
          <stop offset="1" stopColor="var(--signature-to)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="var(--ink)" />
      {/* Horizon arc — the "sky" */}
      <path d="M9 17.5a11 11 0 0 1 22 0" fill="none" stroke="url(#sky-mark)" strokeWidth="3" strokeLinecap="round" />
      {/* Parking "P" */}
      <path
        d="M15.5 31V19h6.2a4.3 4.3 0 0 1 0 8.6H15.5"
        fill="none"
        stroke="var(--text-inverse)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[0.9375rem] font-bold uppercase tracking-[0.04em] text-text">
            {t('app.name')}
          </span>
          <span className="mt-1 text-[0.6875rem] font-medium text-text-muted">{t('app.tagline')}</span>
        </span>
      )}
    </span>
  )
}
