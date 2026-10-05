/**
 * One Realtime channel per farm. Row changes invalidate the cached records and
 * notify the UI through the change feed; sensor inserts are also pushed to
 * SensorProvider subscribers. Realtime applies the same RLS as queries.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { EnvironmentalReading } from '@/types'
import { changeFeed } from '../changeFeed'
import { supabase } from './client'
import { invalidateRecords } from './records'
import { toReading, type ReadingRow } from './rows'

const DATA_TABLES = ['harvests', 'inventory_movements', 'orders', 'order_items', 'expenses', 'production_batches', 'farm_tasks', 'equipment', 'inventory_products']

interface FarmChannel {
  channel: RealtimeChannel
  readingListeners: Set<(r: EnvironmentalReading) => void>
}

const channels = new Map<string, FarmChannel>()
let pendingDashboard: ReturnType<typeof setTimeout> | null = null

/** Coalesce bursts (e.g. an order with several items) into one refresh. */
function dataChanged(farmId: string) {
  invalidateRecords(farmId)
  if (pendingDashboard) clearTimeout(pendingDashboard)
  pendingDashboard = setTimeout(() => {
    changeFeed.publish('dashboard')
    changeFeed.publish('alerts')
  }, 400)
}

export function farmChannel(farmId: string): FarmChannel {
  const existing = channels.get(farmId)
  if (existing) return existing
  const readingListeners = new Set<(r: EnvironmentalReading) => void>()
  let channel = supabase().channel(`farm:${farmId}`)
  for (const table of DATA_TABLES) {
    // order_items has farm_id too, so every table can be filtered by farm.
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `farm_id=eq.${farmId}` }, () => dataChanged(farmId))
  }
  channel = channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `farm_id=eq.${farmId}` }, () => changeFeed.publish('alerts'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'environmental_readings', filter: `farm_id=eq.${farmId}` }, (payload) => {
      const reading = toReading(payload.new as ReadingRow)
      readingListeners.forEach((l) => l(reading))
      changeFeed.publish('sensors')
    })
  channel.subscribe()
  const entry = { channel, readingListeners }
  channels.set(farmId, entry)
  return entry
}

export function closeAllChannels() {
  for (const { channel } of channels.values()) void supabase().removeChannel(channel)
  channels.clear()
}
