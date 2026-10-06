import { addDays, startOfDay } from '@/domain/time'
import type { DateRange } from '@/types'

/** Reporting windows used by the finance pages. */
export type FinancePeriod = 'thisMonth' | 'lastMonth' | '30d' | '90d' | 'thisYear' | 'all'

/** The window for a finance period (through the end of today), or null for "all time". */
export function financeRange(period: FinancePeriod, now: Date = new Date()): DateRange | null {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // Rolling windows run to the end of today, so records added later today stay inside them.
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
  switch (period) {
    case 'thisMonth':
      return { from: monthStart.toISOString(), to: end }
    case 'lastMonth':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), to: new Date(monthStart.getTime() - 1).toISOString() }
    case '30d':
      return { from: addDays(startOfDay(now), -29).toISOString(), to: end }
    case '90d':
      return { from: addDays(startOfDay(now), -89).toISOString(), to: end }
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: end }
    case 'all':
      return null
  }
}

/** Local `YYYY-MM-DD` for date inputs. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Range covering whole local days between two `YYYY-MM-DD` values. */
export function dateInputRange(from: string, to: string): DateRange {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T23:59:59.999`)
  return { from: start.toISOString(), to: end.toISOString() }
}
