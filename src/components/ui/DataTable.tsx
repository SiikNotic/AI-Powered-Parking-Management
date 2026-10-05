import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { EmptyState } from './States'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Value used for sorting; omit to make the column unsortable. */
  sort?: (row: T) => string | number
  align?: 'left' | 'right'
  /** Hide on the mobile card view. */
  hideOnMobile?: boolean
  className?: string
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  label: string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  pageSize?: number
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  /** Mobile card title (defaults to the first column). */
  mobileTitle?: (row: T) => ReactNode
}

/**
 * Sortable, paginated table. On phones each row becomes a card with
 * label/value pairs, so nothing scrolls sideways.
 */
export function DataTable<T>({ rows, columns, rowKey, label, onRowClick, emptyTitle, emptyDescription, pageSize = 20, initialSort, mobileTitle }: DataTableProps<T>) {
  const { t } = useI18n()
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const get = col.sort
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)

  if (!rows.length) return <EmptyState title={emptyTitle ?? t('table.empty')} description={emptyDescription} />

  const toggle = (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  const [first, ...rest] = columns

  return (
    <div>
      {/* Desktop / tablet */}
      <div className="scrollbar-thin -mx-1 hidden overflow-x-auto md:block" role="region" aria-label={label} tabIndex={0}>
        <table className="w-full border-separate border-spacing-0 text-left text-[0.8125rem]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('eyebrow whitespace-nowrap border-b border-border px-2 pb-2.5 font-semibold', c.align === 'right' && 'text-right', c.className)}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggle(c.key)} className={cn('inline-flex items-center gap-1 rounded uppercase tracking-[0.08em] hover:text-text', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('group', onRowClick && 'cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('border-b border-border px-2 py-2.5 align-middle text-text-secondary', c.align === 'right' && 'tabular text-right', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="space-y-2 md:hidden" aria-label={label}>
        {visible.map((row) => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined}
              className="tile rounded-xl p-3"
            >
              <div className="text-sm font-semibold text-text">{mobileTitle ? mobileTitle(row) : first.cell(row)}</div>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                {rest
                  .filter((c) => !c.hideOnMobile)
                  .map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="truncate text-[0.6875rem] text-text-muted">{c.header}</dt>
                      <dd className="min-w-0 truncate text-xs text-text-secondary">{c.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-muted">
          <span>{t('table.range', { from: current * pageSize + 1, to: Math.min(sorted.length, (current + 1) * pageSize), total: sorted.length })}</span>
          <div className="flex gap-1">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={t('table.previous')} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-hover disabled:opacity-30">
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label={t('table.next')} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface-hover disabled:opacity-30">
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
