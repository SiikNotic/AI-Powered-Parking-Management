import { Building2, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { ROUTES } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { authService } from '@/services'
import { Avatar } from './Avatar'

export function ProfileMenu() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { manager } = useSession()
  if (!manager) return <span className="skeleton size-9 rounded-full" aria-hidden />

  const fullName = `${manager.firstName} ${manager.lastName}`

  return (
    <Popover
      label={t('topbar.profileMenu')}
      panelClassName="w-64"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${t('topbar.profileMenu')}: ${fullName}`}
          className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-surface-hover sm:pr-2"
        >
          <Avatar name={fullName} />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.06em] text-text lg:inline">
            {manager.firstName} {manager.lastName[0]}.
          </span>
          <ChevronDown aria-hidden className="hidden size-4 text-text-muted sm:block" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={fullName} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{fullName}</p>
              <p className="truncate text-xs text-text-muted">{manager.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <MenuItem onSelect={() => { close(); navigate(ROUTES.settings) }}>
            <UserRound aria-hidden className="size-4 text-text-muted" />
            {t('topbar.profile')}
          </MenuItem>
          <MenuItem onSelect={() => { close(); navigate(ROUTES.settings) }}>
            <Building2 aria-hidden className="size-4 text-text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block">{t('topbar.organization')}</span>
              <span className="block truncate text-xs text-text-muted">{manager.organization.name}</span>
            </span>
          </MenuItem>
          <MenuItem onSelect={() => { close(); navigate(ROUTES.settings) }}>
            <Settings aria-hidden className="size-4 text-text-muted" />
            {t('topbar.accountSettings')}
          </MenuItem>
          <div className="my-1 border-t border-border" />
          <MenuItem onSelect={() => { close(); void authService.signOut() }}>
            <LogOut aria-hidden className="size-4 text-text-muted" />
            {t('nav.logout')}
          </MenuItem>
        </>
      )}
    </Popover>
  )
}
