/** Production pipeline: batch states, harvest totals, yield, cost per lb and forecast. */
import type { BatchStatus, DateRange, Harvest, MushroomSpecies, ProductionBatch } from '@/types'
import { addDays, DAY_MS, dayKey, dayKeys, inRange, startOfDay } from './time'

export const ACTIVE_STATUSES: BatchStatus[] = ['INOCULATED', 'COLONIZING', 'FRUITING', 'READY_TO_HARVEST', 'HARVESTED']
export const PIPELINE_STATUSES: BatchStatus[] = ['PLANNED', 'INOCULATED', 'COLONIZING', 'FRUITING', 'READY_TO_HARVEST', 'HARVESTED']

/** Days between flushes once a batch has started fruiting. */
const FLUSH_INTERVAL_DAYS = 8

export const isActive = (b: ProductionBatch) => ACTIVE_STATUSES.includes(b.status)

export function pipelineCounts(batches: ProductionBatch[]): Record<BatchStatus, number> {
  const counts = Object.fromEntries(
    (['PLANNED', 'INOCULATED', 'COLONIZING', 'FRUITING', 'READY_TO_HARVEST', 'HARVESTED', 'COMPLETED', 'FAILED', 'DISCARDED'] as const).map((s) => [s, 0]),
  ) as Record<BatchStatus, number>
  for (const b of batches) counts[b.status]++
  return counts
}

export interface HarvestTotals {
  wet: number
  waste: number
  net: number
  flushes: number
}

export function harvestTotals(harvests: Harvest[], range: DateRange): HarvestTotals {
  const totals = { wet: 0, waste: 0, net: 0, flushes: 0 }
  for (const h of harvests) {
    if (!inRange(h.date, range)) continue
    totals.wet += h.wetWeight
    totals.waste += h.wasteWeight
    totals.flushes++
  }
  totals.net = totals.wet - totals.waste
  return totals
}

export interface DailyHarvest {
  day: string
  /** Net lb by species id. */
  bySpecies: Record<string, number>
  total: number
}

export function dailyHarvest(harvests: Harvest[], batches: ProductionBatch[], range: DateRange): DailyHarvest[] {
  const speciesOf = new Map(batches.map((b) => [b.id, b.speciesId]))
  const rows = new Map(dayKeys(range).map((day) => [day, { day, bySpecies: {} as Record<string, number>, total: 0 }]))
  for (const h of harvests) {
    if (!inRange(h.date, range)) continue
    const row = rows.get(dayKey(h.date))
    const speciesId = speciesOf.get(h.batchId)
    if (!row || !speciesId) continue
    const net = h.wetWeight - h.wasteWeight
    row.bySpecies[speciesId] = (row.bySpecies[speciesId] ?? 0) + net
    row.total += net
  }
  return [...rows.values()]
}

export function harvestBySpecies(harvests: Harvest[], batches: ProductionBatch[], range: DateRange): Map<string, number> {
  const speciesOf = new Map(batches.map((b) => [b.id, b.speciesId]))
  const totals = new Map<string, number>()
  for (const h of harvests) {
    if (!inRange(h.date, range)) continue
    const s = speciesOf.get(h.batchId)
    if (s) totals.set(s, (totals.get(s) ?? 0) + h.wetWeight - h.wasteWeight)
  }
  return totals
}

export const expectedYield = (batch: ProductionBatch, species: MushroomSpecies) => batch.substrateWeight * species.averageYield

export interface YieldStats {
  /** Harvested ÷ expected for batches that finished (0–1+). */
  efficiency: number | null
  /** Production cost per lb harvested for finished batches. */
  costPerLb: number | null
  /** Share of batches that failed or were discarded. */
  lossRate: number
}

export function yieldStats(batches: ProductionBatch[], harvests: Harvest[], species: MushroomSpecies[]): YieldStats {
  const speciesById = new Map(species.map((s) => [s.id, s]))
  const harvested = new Map<string, number>()
  for (const h of harvests) harvested.set(h.batchId, (harvested.get(h.batchId) ?? 0) + h.wetWeight)
  let actual = 0
  let expected = 0
  let cost = 0
  const finished = batches.filter((b) => b.status === 'COMPLETED')
  for (const b of finished) {
    const sp = speciesById.get(b.speciesId)
    if (!sp) continue
    actual += harvested.get(b.id) ?? 0
    expected += expectedYield(b, sp)
    cost += b.cost
  }
  const started = batches.filter((b) => b.status !== 'PLANNED')
  const lost = started.filter((b) => b.status === 'FAILED' || b.status === 'DISCARDED').length
  return {
    efficiency: expected > 0 ? actual / expected : null,
    costPerLb: actual > 0 ? cost / actual : null,
    lossRate: started.length ? lost / started.length : 0,
  }
}

export interface ForecastBucket {
  /** Expected lb by species id. */
  bySpecies: Record<string, number>
  total: number
}

export interface HarvestForecast {
  thisWeek: ForecastBucket
  nextWeek: ForecastBucket
  thisMonth: ForecastBucket
  /** Batches expected to be harvested in the next 24 h (or overdue). */
  readySoon: ProductionBatch[]
}

/**
 * Projects the remaining expected yield of every active batch onto the
 * calendar: the first flush on the expected harvest date, later flushes every
 * FLUSH_INTERVAL_DAYS after the last recorded harvest (60/40 split).
 */
export function harvestForecast(batches: ProductionBatch[], harvests: Harvest[], species: MushroomSpecies[], now: Date): HarvestForecast {
  const speciesById = new Map(species.map((s) => [s.id, s]))
  const byBatch = new Map<string, Harvest[]>()
  for (const h of harvests) byBatch.set(h.batchId, [...(byBatch.get(h.batchId) ?? []), h])

  const today = startOfDay(now)
  // Weeks run Monday → Sunday.
  const weekStart = addDays(today, -((today.getDay() + 6) % 7))
  const nextWeekStart = addDays(weekStart, 7)
  const nextWeekEnd = addDays(weekStart, 14)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const empty = (): ForecastBucket => ({ bySpecies: {}, total: 0 })
  const forecast: HarvestForecast = { thisWeek: empty(), nextWeek: empty(), thisMonth: empty(), readySoon: [] }
  const add = (bucket: ForecastBucket, speciesId: string, lb: number) => {
    bucket.bySpecies[speciesId] = (bucket.bySpecies[speciesId] ?? 0) + lb
    bucket.total += lb
  }

  for (const b of batches) {
    if (!isActive(b) && b.status !== 'PLANNED') continue
    const sp = speciesById.get(b.speciesId)
    if (!sp) continue
    const done = byBatch.get(b.id) ?? []
    const remaining = Math.max(0, expectedYield(b, sp) - done.reduce((s, h) => s + h.wetWeight, 0))
    if (remaining < 0.5) continue

    const last = done.length ? new Date(done.reduce((a, h) => (h.date > a ? h.date : a), done[0].date)) : null
    let first = last ? addDays(last, FLUSH_INTERVAL_DAYS) : new Date(b.expectedHarvestDate)
    if (first.getTime() < now.getTime()) first = now // overdue: expected as soon as possible
    const flushes: [Date, number][] = done.length ? [[first, remaining]] : [[first, remaining * 0.6], [addDays(first, FLUSH_INTERVAL_DAYS), remaining * 0.4]]

    if (first.getTime() - now.getTime() < DAY_MS) forecast.readySoon.push(b)
    for (const [date, lb] of flushes) {
      const t = date.getTime()
      if (t < nextWeekStart.getTime()) add(forecast.thisWeek, b.speciesId, lb)
      else if (t < nextWeekEnd.getTime()) add(forecast.nextWeek, b.speciesId, lb)
      if (t < monthEnd.getTime()) add(forecast.thisMonth, b.speciesId, lb)
    }
  }
  forecast.readySoon.sort((a, b) => a.expectedHarvestDate.localeCompare(b.expectedHarvestDate))
  return forecast
}

/** Batch whose expected harvest date has passed without any harvest. */
export function isOverdue(batch: ProductionBatch, harvests: Harvest[], now: Date): boolean {
  if (batch.status !== 'READY_TO_HARVEST' && batch.status !== 'FRUITING') return false
  return new Date(batch.expectedHarvestDate).getTime() < now.getTime() - DAY_MS && !harvests.some((h) => h.batchId === batch.id)
}
