import type { DateRange, Period } from '@/types'

export const DAY_MS = 86_400_000

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** Current period window, ending now. */
export function periodRange(period: Period, now: Date = new Date()): DateRange {
  const days = period === 'today' ? 0 : period === '7d' ? 6 : 29
  return { from: addDays(startOfDay(now), -days).toISOString(), to: now.toISOString() }
}

/** The window of equal length right before `range` (for period-over-period deltas). */
export function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from).getTime()
  const to = new Date(range.to).getTime()
  return { from: new Date(from - (to - from)).toISOString(), to: new Date(from).toISOString() }
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to
}

/** Local day keys (YYYY-MM-DD) covering the range, oldest first. */
export function dayKeys(range: DateRange): string[] {
  const keys: string[] = []
  for (let d = startOfDay(new Date(range.from)); d.getTime() <= new Date(range.to).getTime(); d = addDays(d, 1)) keys.push(dayKey(d))
  return keys
}

export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Percentage change, or null when there is no baseline. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / Math.abs(previous)
}
