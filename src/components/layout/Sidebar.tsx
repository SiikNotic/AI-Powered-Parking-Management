import type { ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Tooltip } from '@/components/ui/Tooltip'
import { navigation, ROUTES } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { authService } from '@/services'
import { Avatar } from './Avatar'
import { Logo } from './Logo'

interface SidebarProps {
  /** Icons only (tablet, or collapsed on desktop). */
  compact: boolean
  /** Shown inside the mobile drawer. */
  inDrawer?: boolean
  /** Desktop only: user can collapse/expand. */
  onToggleCollapse?: () => void
  onClose?: () => void
}

export function Sidebar({ compact, inDrawer = false, onToggleCollapse, onClose }: SidebarProps) {
  const { t } = useI18n()
  const { manager } = useSession()
  const fullName = manager ? `${manager.firstName} ${manager.lastName}` : ''

  const withTooltip = (label: string, node: ReactNode) =>
    compact ? (
      <Tooltip content={label} className="flex">
        {node}
      </Tooltip>
    ) : (
      node
    )

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center', compact ? 'justify-center' : 'justify-between px-2')}>
        <NavLink to={ROUTES.dashboard} aria-label={t('app.name')} className="rounded-xl" onClick={onClose}>
          <Logo compact={compact} />
        </NavLink>
        {inDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="inline-flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label={t('nav.primary')} className="scrollbar-thin mt-4 flex-1 overflow-y-auto overflow-x-hidden">
        {navigation.map((section) => (
          <div key={section.key} className="mb-5">
            {compact ? (
              <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border-strong first:hidden" />
            ) : (
              <p className="eyebrow mb-2 px-3">{t(`nav.sections.${section.key}`)}</p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const label = t(`nav.${item.key}`)
                const Icon = item.icon
                return (
                  <li key={item.key}>
                    {withTooltip(
                      label,
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        aria-label={compact ? label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition-colors',
                            compact ? 'w-10 justify-center mx-auto' : 'w-full px-3',
                            isActive
                              ? 'bg-ink text-text-inverse shadow-sm'
                              : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                          )
                        }
                      >
                        <Icon aria-hidden className="size-[1.125rem] shrink-0" strokeWidth={1.9} />
                        {!compact && <span className="truncate">{label}</span>}
                      </NavLink>,
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-2 space-y-1 border-t border-border pt-3">
        {manager && (
          <div className={cn('flex items-center gap-3 rounded-xl py-2', compact ? 'justify-center' : 'px-2')}>
            {withTooltip(`${fullName} · ${manager.organization.name}`, <Avatar name={fullName} />)}
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{fullName}</p>
                <p className="truncate text-xs text-text-muted">{manager.organization.name}</p>
              </div>
            )}
          </div>
        )}
        {withTooltip(
          t('nav.logout'),
          <button
            type="button"
            onClick={() => void authService.signOut()}
            aria-label={compact ? t('nav.logout') : undefined}
            className={cn(
              'flex h-10 items-center gap-3 rounded-xl text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text',
              compact ? 'mx-auto w-10 justify-center' : 'w-full px-3',
            )}
          >
            <LogOut aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
            {!compact && t('nav.logout')}
          </button>,
        )}
        {onToggleCollapse && (
          withTooltip(
            compact ? t('nav.expand') : t('nav.collapse'),
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={compact ? t('nav.expand') : t('nav.collapse')}
              aria-expanded={!compact}
              className={cn(
                'flex h-10 items-center gap-3 rounded-xl text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text',
                compact ? 'mx-auto w-10 justify-center' : 'w-full px-3',
              )}
            >
              {compact ? (
                <ChevronsRight aria-hidden className="size-[1.125rem]" />
              ) : (
                <>
                  <ChevronsLeft aria-hidden className="size-[1.125rem]" />
                  {t('nav.collapse')}
                </>
              )}
            </button>,
          )
        )}
      </div>
    </div>
  )
}
