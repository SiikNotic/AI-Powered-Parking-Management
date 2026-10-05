import { cn } from '@/lib/cn'

export interface BarItem {
  key: string
  label: string
  value: number
  formatted: string
}

/** Ranked horizontal bars with the value written next to each bar (no hover needed). */
export function HorizontalBars({ items, barClassName = 'bg-brand', label }: { items: BarItem[]; barClassName?: string; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-3" aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-text-secondary">{item.label}</span>
            <span className="tabular shrink-0 font-semibold text-text">{item.formatted}</span>
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
