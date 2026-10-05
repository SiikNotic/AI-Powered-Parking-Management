import { Boxes, ClipboardList, FlaskConical, Search, Sprout, Thermometer, Users, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { searchService, type SearchKind, type SearchResult } from '@/services'

const kindIcons: Record<SearchKind, LucideIcon> = {
  batch: FlaskConical,
  product: Boxes,
  customer: Users,
  order: ClipboardList,
  room: Thermometer,
  species: Sprout,
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

interface SearchBoxProps {
  autoFocus?: boolean
  onDone?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

function SearchBox({ autoFocus, onDone, inputRef }: SearchBoxProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { farm } = useSession()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const debounced = useDebounced(query, 150)
  const results = useAsync(() => searchService.search(farm.id, debounced), [farm.id, debounced])
  const items: SearchResult[] = debounced.trim().length >= 2 ? (results.data ?? []) : []
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [])

  const choose = (r: SearchResult) => {
    setOpen(false)
    setQuery('')
    onDone?.()
    navigate(r.link)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault()
      choose(items[active])
    } else if (e.key === 'Escape') {
      if (query) setQuery('')
      else {
        setOpen(false)
        onDone?.()
        e.currentTarget.blur()
      }
    }
  }

  const showPanel = open && debounced.trim().length >= 2

  return (
    <div ref={rootRef} className="relative w-full">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && items[active] ? `${listId}-${active}` : undefined}
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 w-full tile rounded-xl pl-9 pr-14 text-sm text-text placeholder:text-text-muted transition-colors hover:border-border-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border px-1.5 py-0.5 text-[0.625rem] font-semibold text-text-muted lg:block">
        Ctrl K
      </kbd>
      {showPanel && (
        <div id={listId} role="listbox" aria-label={t('search.results')} className="panel-pop absolute inset-x-0 top-full z-50 mt-2 max-h-[min(24rem,70dvh)] overflow-y-auto rounded-2xl p-1.5 scrollbar-thin">
          {items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-text-muted">{results.status === 'loading' ? t('states.loading') : t('search.empty', { query: debounced })}</p>
          ) : (
            items.map((r, i) => {
              const Icon = kindIcons[r.kind]
              return (
                <div
                  key={`${r.kind}-${r.id}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2', i === active && 'bg-surface-hover')}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-secondary">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{r.title}</span>
                    <span className="block truncate text-xs text-text-muted">{r.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-[0.6875rem] font-medium text-text-muted">{t(`search.kinds.${r.kind}`)}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/** Global search: inline on tablet/desktop, full-width sheet on phones. Ctrl/⌘ K or "/" to focus. */
export function GlobalSearch() {
  const { t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault()
        if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus()
        else setMobileOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="hidden min-w-0 flex-1 md:block lg:max-w-md">
        <SearchBox inputRef={inputRef} />
      </div>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t('search.label')}
        className="inline-flex size-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover hover:text-text md:hidden"
      >
        <Search aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
      </button>
      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[110] md:hidden" role="dialog" aria-modal="true" aria-label={t('search.label')}>
            <div aria-hidden className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setMobileOpen(false)} />
            <div className="panel-pop absolute inset-x-0 top-0 flex items-start gap-2 rounded-b-2xl p-3 animate-fade-in">
              <SearchBox autoFocus onDone={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t('common.close')}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
