import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { allNavItems } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useI18n, type TranslationKey } from '@/i18n'
import { isDemoData } from '@/services'
import { LanguageSelector } from './LanguageSelector'
import { LocationSelector } from './LocationSelector'
import { NotificationsMenu } from './NotificationsMenu'
import { ProfileMenu } from './ProfileMenu'
import { ThemeToggle } from './ThemeToggle'

function greetingKey(date = new Date()): TranslationKey {
  const hour = date.getHours()
  if (hour < 12) return 'topbar.greeting.morning'
  if (hour < 18) return 'topbar.greeting.afternoon'
  return 'topbar.greeting.evening'
}

interface TopbarProps {
  onOpenMenu: () => void
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { manager } = useSession()
  const current = allNavItems.find((item) => pathname.startsWith(item.path))
  const title = current ? t(`nav.${current.key}`) : t('app.name')

  return (
    <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0 !shadow-none">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
        <IconButton label={t('nav.openMenu')} onClick={onOpenMenu} className="-ml-2 md:hidden">
          <Menu aria-hidden className="size-5" />
        </IconButton>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-base font-semibold uppercase tracking-[0.03em] text-text sm:text-xl">
              {title}
            </h1>
            {isDemoData && (
              <Tooltip content={t('app.demoNotice')}>
                <span tabIndex={0} className="hidden rounded-full xs:inline-flex">
                  <Badge tone="brand">{t('app.demoBadge')}</Badge>
                </span>
              </Tooltip>
            )}
          </div>
          <p className="truncate text-[0.8125rem] text-text-muted">
            {manager ? t(greetingKey(), { name: manager.firstName }) : ' '}
          </p>
        </div>

        <LocationSelector className="hidden md:block" />
        <div className="flex items-center">
          <NotificationsMenu />
          <LanguageSelector />
          <ThemeToggle />
        </div>
        <ProfileMenu />
      </div>
      <div className="px-4 pb-3 md:hidden">
        <LocationSelector className="w-full" />
      </div>
    </header>
  )
}
