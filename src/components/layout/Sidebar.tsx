import type { ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Tooltip } from '@/components/ui/Tooltip'
import { MODULES, NAV_GROUPS } from '@/config/navigation'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
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
  const { can } = useSession()

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
      <div className={cn('flex h-16 shrink-0 items-center', compact ? 'justify-center' : 'justify-between px-2')}>
        <NavLink to="/" aria-label={t('app.name')} className="rounded-xl" onClick={onClose}>
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

      <nav aria-label={t('nav.primary')} className="scrollbar-thin mt-2 flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.map((id) => MODULES[id]).filter((m) => !m.permission || can(m.permission))
          if (!items.length) return null
          return (
            <div key={group.label} className="mb-4">
              {compact ? (
                <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border" />
              ) : (
                <p className="eyebrow mb-1.5 px-3">{t(group.label)}</p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const label = t(`modules.${item.id}.name`)
                  const Icon = item.icon
                  const soon = item.phase !== undefined
                  return (
                    <li key={item.id}>
                      {withTooltip(
                        soon ? `${label} · ${t('nav.soon')}` : label,
                        <NavLink
                          to={item.path}
                          end
                          onClick={onClose}
                          aria-label={compact ? label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group flex h-9 items-center gap-3 rounded-lg text-[0.8125rem] font-medium transition-colors',
                              compact ? 'mx-auto w-10 justify-center' : 'w-full px-3',
                              isActive ? 'bg-brand text-text-inverse' : soon ? 'text-text-muted hover:bg-surface-hover hover:text-text' : 'text-text-secondary hover:bg-surface-hover hover:text-text',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon aria-hidden className="size-[1.0625rem] shrink-0" strokeWidth={1.8} />
                              {!compact && <span className="min-w-0 flex-1 truncate">{label}</span>}
                              {!compact && soon && !isActive && (
                                <span className="rounded-md border border-border px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-text-muted">{t('nav.soon')}</span>
                              )}
                            </>
                          )}
                        </NavLink>,
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {onToggleCollapse &&
        withTooltip(
          compact ? t('nav.expand') : t('nav.collapse'),
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={compact ? t('nav.expand') : t('nav.collapse')}
            aria-expanded={!compact}
            className={cn(
              'mt-1 flex h-9 shrink-0 items-center gap-3 rounded-lg border-t border-border pt-0 text-[0.8125rem] text-text-muted transition-colors hover:bg-surface-hover hover:text-text',
              compact ? 'mx-auto w-10 justify-center' : 'w-full px-3',
            )}
          >
            {compact ? (
              <ChevronsRight aria-hidden className="size-[1.0625rem]" />
            ) : (
              <>
                <ChevronsLeft aria-hidden className="size-[1.0625rem]" />
                {t('nav.collapse')}
              </>
            )}
          </button>,
        )}
    </div>
  )
}
