import { CalendarClock, Map, MapPinPlus, SquarePlus, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/navigation'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'

interface QuickAction {
  key: TranslationKey
  to: string
  icon: LucideIcon
  primary?: boolean
}

// Targets are placeholder routes for now ("Coming soon" pages).
const actions: QuickAction[] = [
  { key: 'dashboard.quickActions.addLocation', to: ROUTES.parkingLocations, icon: MapPinPlus, primary: true },
  { key: 'dashboard.quickActions.addSpace', to: ROUTES.parkingSpaces, icon: SquarePlus },
  { key: 'dashboard.quickActions.viewMap', to: ROUTES.parkingSpaces, icon: Map },
  { key: 'dashboard.quickActions.viewReservations', to: ROUTES.reservations, icon: CalendarClock },
]

export function QuickActions({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <nav aria-labelledby="quick-actions-title" className={className}>
      <h2 id="quick-actions-title" className="sr-only">
        {t('dashboard.quickActions.title')}
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {actions.map(({ key, to, icon: Icon, primary }) => (
          <li key={key}>
            <Link
              to={to}
              className={cn(
                'flex h-12 items-center gap-2.5 rounded-full px-4 text-[0.8125rem] font-semibold transition-[filter,background-color,border-color] sm:h-14 sm:px-5',
                primary
                  ? 'bg-signature text-white shadow-[0_8px_24px_-10px_rgba(236,79,143,0.6)] hover:brightness-105'
                  : 'border border-border bg-surface text-text shadow-card hover:border-border-strong hover:bg-surface-raised',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  primary ? 'bg-white/20' : 'bg-surface-sunken',
                )}
              >
                <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 truncate">{t(key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
