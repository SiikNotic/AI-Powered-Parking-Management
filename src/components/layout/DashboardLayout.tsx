import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BREAKPOINTS, useMediaQuery } from '@/hooks/useMediaQuery'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const COLLAPSE_KEY = 'sky-parking.sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * App shell.
 * - Desktop (≥1280px): fixed sidebar, collapsible to icons.
 * - Tablet (768–1279px): compact icon sidebar.
 * - Mobile (<768px): sidebar becomes a drawer.
 */
export function DashboardLayout() {
  const { t } = useI18n()
  const { pathname, hash } = useLocation()
  const isTablet = useMediaQuery(BREAKPOINTS.tablet)
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const compact = !isDesktop || collapsed
  // The drawer only exists on mobile; growing past it hides it.
  const drawerVisible = drawerOpen && !isTablet

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Drawer: lock scroll, focus first link, close on Escape.
  useEffect(() => {
    if (!drawerVisible) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerVisible])

  // Scroll to top on navigation, or to the anchored section when a hash is present.
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.focus({ preventScroll: true })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-full bg-ink px-4 py-2 text-sm text-text-inverse focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('app.skipToContent')}
      </a>

      {/* Tablet / desktop rail */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden p-3 transition-[width] duration-200 md:block',
          compact ? 'w-[5.5rem]' : 'w-[17rem]',
        )}
      >
        <div className="glass h-full rounded-[1.5rem] px-3 pb-3">
          <Sidebar compact={compact} onToggleCollapse={isDesktop ? toggleCollapsed : undefined} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t('nav.primary')}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('nav.closeMenu')}
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={closeDrawer}
          />
          <div
            ref={drawerRef}
            className="glass-strong absolute inset-y-0 left-0 w-[min(18rem,85vw)] rounded-r-[1.5rem] px-3 pb-3 animate-fade-in"
          >
            <Sidebar compact={false} inDrawer onClose={closeDrawer} />
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200',
          compact ? 'md:pl-[5.5rem]' : 'md:pl-[17rem]',
        )}
      >
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-clip focus:outline-none">
          <Suspense
            fallback={
              <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8" role="status" aria-busy="true">
                <div className="skeleton h-64 rounded-card" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
