import { toNumber } from '@/lib/number'
import type { Range } from '@/types'

export interface RangeDraft {
  min: string
  max: string
}

export const toRangeDraft = (r: Range): RangeDraft => ({ min: String(r.min), max: String(r.max) })

/** Parsed range, or null when a value is missing or min > max. */
export function parseRange(r: RangeDraft): Range | null {
  const min = toNumber(r.min)
  const max = toNumber(r.max)
  return Number.isFinite(min) && Number.isFinite(max) && min <= max ? { min, max } : null
}
