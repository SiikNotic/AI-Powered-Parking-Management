import { Menu } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { useI18n } from '@/i18n'
import { isDemoData } from '@/services'
import { FarmSelector } from './FarmSelector'
import { GlobalSearch } from './GlobalSearch'
import { LanguageSelector } from './LanguageSelector'
import { NotificationsMenu } from './NotificationsMenu'
import { ProfileMenu } from './ProfileMenu'
import { ThemeToggle } from './ThemeToggle'

interface TopbarProps {
  onOpenMenu: () => void
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <IconButton label={t('nav.openMenu')} onClick={onOpenMenu} className="-ml-1 md:hidden">
          <Menu aria-hidden className="size-5" />
        </IconButton>
        <FarmSelector className="min-w-0 max-w-[15rem] flex-1 md:w-60 md:flex-none" />
        <GlobalSearch />
        {isDemoData && (
          <Tooltip content={t('app.demoNotice')} className="ml-auto hidden lg:inline-flex">
            <span tabIndex={0} className="inline-flex rounded-full">
              <Badge tone="warning">{t('app.demoBadge')}</Badge>
            </span>
          </Tooltip>
        )}
        <div className="ml-auto flex items-center lg:ml-0">
          <NotificationsMenu />
          {/* On phones these live in the account menu to leave room for the farm name. */}
          <span className="hidden sm:contents">
            <LanguageSelector />
            <ThemeToggle />
          </span>
        </div>
        <ProfileMenu />
      </div>
    </header>
  )
}
