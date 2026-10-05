import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Wide tables scroll inside their own container, never the page. */
export function Table({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className="scrollbar-thin -mx-2 overflow-x-auto" role="region" aria-label={label} tabIndex={label ? 0 : undefined}>
      <table className={cn('w-full min-w-[44rem] border-separate border-spacing-0 text-left text-[0.8125rem]', className)}>{children}</table>
    </div>
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('eyebrow whitespace-nowrap border-b border-border px-2 pb-3 font-semibold', className)} {...props} />
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-border px-2 py-3 align-middle text-text-secondary group-last:border-0', className)} {...props} />
}
