import { Check, ChevronDown, Languages, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { useSession } from '@/context/session'
import { ROLES } from '@/domain/permissions'
import { useTheme } from '@/context/theme'
import { locales, useI18n, type Locale } from '@/i18n'
import { cn } from '@/lib/cn'
import { Avatar } from './Avatar'

export function ProfileMenu() {
  const { t, locale, setLocale } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { user, setRole, canSwitchRole, signOut } = useSession()

  return (
    <Popover
      label={t('topbar.profileMenu')}
      panelClassName="w-72 max-h-[80dvh] overflow-y-auto scrollbar-thin"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${t('topbar.profileMenu')}: ${user.name}`}
          className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-surface-hover sm:pr-2"
        >
          <Avatar name={user.name} />
          <span className="hidden min-w-0 text-left leading-tight xl:block">
            <span className="block text-[0.8125rem] font-semibold text-text">{user.name}</span>
            <span className="block text-[0.6875rem] text-text-muted">{t(`roles.${user.role}`)}</span>
          </span>
          <ChevronDown aria-hidden className="hidden size-4 text-text-muted sm:block" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={user.name} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{user.name}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
              <Badge tone="brand" className="mt-1">
                {t(`roles.${user.role}`)}
              </Badge>
            </div>
          </div>
          {canSwitchRole && (
            <>
              <div className="my-1 border-t border-border" />
              <p className="eyebrow px-3 pb-1 pt-1.5">{t('topbar.viewAs')}</p>
              <p className="px-3 pb-1.5 text-xs text-text-muted">{t('topbar.viewAsHint')}</p>
              {ROLES.map((role) => (
                <MenuItem
                  key={role}
                  checked={role === user.role}
                  onSelect={() => {
                    setRole(role)
                    close()
                  }}
                  className="py-1.5"
                >
                  <span className="flex-1">{t(`roles.${role}`)}</span>
                  <Check aria-hidden className={cn('size-4 text-brand', role !== user.role && 'invisible')} />
                </MenuItem>
              ))}
            </>
          )}
          <div className="my-1 border-t border-border sm:hidden" />
          <MenuItem className="sm:hidden" onSelect={() => setLocale((Object.keys(locales) as Locale[]).find((l) => l !== locale) ?? 'en')}>
            <Languages aria-hidden className="size-4 text-text-muted" />
            <span className="flex-1">{t('topbar.language')}</span>
            <span className="text-xs font-semibold text-text-muted">{locales[locale].short}</span>
          </MenuItem>
          <MenuItem className="sm:hidden" onSelect={toggleTheme}>
            {theme === 'dark' ? <Sun aria-hidden className="size-4 text-text-muted" /> : <Moon aria-hidden className="size-4 text-text-muted" />}
            {t('topbar.theme.toggle', { mode: (theme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')).toLowerCase() })}
          </MenuItem>
          <div className="my-1 border-t border-border" />
          <MenuItem
            onSelect={() => {
              close()
              navigate('/settings')
            }}
          >
            <Settings aria-hidden className="size-4 text-text-muted" />
            {t('modules.settings.name')}
          </MenuItem>
          {!canSwitchRole && (
            <MenuItem
              onSelect={() => {
                close()
                signOut()
              }}
            >
              <LogOut aria-hidden className="size-4 text-text-muted" />
              {t('auth.signOut')}
            </MenuItem>
          )}
        </>
      )}
    </Popover>
  )
}
