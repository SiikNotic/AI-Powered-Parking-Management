import { useEffect, useMemo, useState } from 'react'
import { evaluateRoom, type RoomEnvironment } from '@/domain/environment'
import { sensorProvider } from '@/services'
import type { EnvironmentalReading, GrowRoom } from '@/types'

const HISTORY_HOURS = 24
const KEEP = 24 * 12 + 60

export interface LiveEnvironment {
  status: 'loading' | 'ready' | 'error'
  rooms: RoomEnvironment[]
  /** Last 24 h per room id (5-minute resolution), updated live. */
  history: Record<string, EnvironmentalReading[]>
  updatedAt: string | null
}

/**
 * Loads 24 h of readings per room, then appends readings pushed by the
 * SensorProvider (no polling). Statuses are re-evaluated on every update.
 */
export function useLiveEnvironment(farmId: string, rooms: GrowRoom[] | undefined): LiveEnvironment {
  const [state, setState] = useState<{ farmId: string; history: Record<string, EnvironmentalReading[]>; status: LiveEnvironment['status']; updatedAt: string | null }>({
    farmId,
    history: {},
    status: 'loading',
    updatedAt: null,
  })
  const roomKey = rooms?.map((r) => r.id).join(',') ?? ''

  useEffect(() => {
    if (!roomKey) return
    let cancelled = false
    const ids = roomKey.split(',')
    Promise.all(ids.map((id) => sensorProvider.getHistory(farmId, id, HISTORY_HOURS))).then(
      (lists) => {
        if (cancelled) return
        setState({ farmId, history: Object.fromEntries(ids.map((id, i) => [id, lists[i]])), status: 'ready', updatedAt: new Date().toISOString() })
      },
      () => !cancelled && setState((s) => ({ ...s, status: 'error' })),
    )
    const unsubscribe = sensorProvider.subscribe(farmId, (reading) => {
      setState((s) => {
        if (s.farmId !== farmId || s.status !== 'ready') return s
        const list = [...(s.history[reading.roomId] ?? []), reading].slice(-KEEP)
        return { ...s, history: { ...s.history, [reading.roomId]: list }, updatedAt: reading.timestamp }
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [farmId, roomKey])

  const current = state.farmId === farmId ? state : { history: {} as Record<string, EnvironmentalReading[]>, status: 'loading' as const, updatedAt: null }

  const evaluated = useMemo(() => {
    if (!rooms || !current.updatedAt) return []
    // "Now" is the time of the latest update, so statuses stay pure and refresh on every push.
    const now = new Date(current.updatedAt)
    const hourAgo = new Date(now.getTime() - 3_600_000).toISOString()
    return rooms.map((room) => {
      const list = current.history[room.id] ?? []
      const latest = list[list.length - 1] ?? null
      let past: EnvironmentalReading | null = null
      for (const r of list) {
        if (r.timestamp > hourAgo) break
        past = r
      }
      return evaluateRoom(room, latest, past, now)
    })
  }, [rooms, current.history, current.updatedAt])

  return { status: current.status, rooms: evaluated, history: current.history, updatedAt: current.updatedAt }
}
