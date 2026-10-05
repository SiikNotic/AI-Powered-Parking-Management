/**
 * ⚠️ DEMO alert service. Alerts are derived from farm state; their status
 * (NEW → ACKNOWLEDGED → RESOLVED) is stored separately and every change is
 * written to the audit log. Conditions that clear are auto-resolved.
 */
import { demoUser, getFarmDataset } from '@/data/demo'
import type { AlertStatus, FarmAlert } from '@/types'
import { changeFeed } from '../changeFeed'
import type { AlertService } from '../contracts'
import { ServiceError } from '../errors'
import { delay } from './delay'
import { alertDraftsFor } from './farmState'

const STORAGE_KEY = 'mushroom-farm.alert-status'

type StatusMap = Record<string, AlertStatus>

function readStatuses(): Record<string, StatusMap> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, StatusMap>
  } catch {
    return {}
  }
}

function writeStatus(farmId: string, alertId: string, status: AlertStatus) {
  const all = readStatuses()
  all[farmId] = { ...all[farmId], [alertId]: status }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/** Alerts that were active earlier in the session and have since cleared. */
const cleared = new Map<string, Map<string, FarmAlert>>()
const lastIds = new Map<string, string>()

function compute(farmId: string): FarmAlert[] {
  const drafts = alertDraftsFor(farmId)
  const activeIds = new Set(drafts.map((a) => a.id))
  lastIds.set(farmId, drafts.map((a) => a.id).join('|'))
  const all = readStatuses()
  const statuses = all[farmId] ?? {}
  // A stored status only applies while its condition lasts; if it returns later it is NEW again.
  const stale = Object.keys(statuses).filter((id) => !activeIds.has(id))
  if (stale.length) {
    stale.forEach((id) => delete statuses[id])
    all[farmId] = statuses
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore */
    }
  }
  const active = drafts.map((a): FarmAlert => ({ ...a, status: statuses[a.id] ?? 'NEW' }))
  const history = cleared.get(farmId) ?? new Map<string, FarmAlert>()
  for (const a of active) history.set(a.id, a)
  cleared.set(farmId, history)
  const resolved = [...history.values()].filter((a) => !activeIds.has(a.id)).map((a) => ({ ...a, status: 'RESOLVED' as const }))
  return [...active, ...resolved]
}

// Re-evaluate when sensors report; notify only when the set of alerts changes.
changeFeed.subscribe(['sensors'], () => {
  for (const farmId of cleared.keys()) {
    const ids = alertDraftsFor(farmId).map((a) => a.id).join('|')
    if (lastIds.get(farmId) !== ids) {
      lastIds.set(farmId, ids)
      changeFeed.publish('alerts')
    }
  }
})

async function setStatus(farmId: string, alertId: string, status: AlertStatus) {
  const alert = compute(farmId).find((a) => a.id === alertId)
  if (!alert) throw new ServiceError('not_found')
  writeStatus(farmId, alertId, status)
  getFarmDataset(farmId).audit.unshift({
    id: crypto.randomUUID(),
    userId: demoUser.id,
    action: status === 'RESOLVED' ? 'resolved' : 'acknowledged',
    entity: 'alert',
    entityLabel: alert.location,
    date: new Date().toISOString(),
    oldValue: alert.status,
    newValue: status,
  })
  await delay(null, 180)
  changeFeed.publish('alerts')
  changeFeed.publish('dashboard')
}

export const demoAlertService: AlertService = {
  list(farmId) {
    return delay(compute(farmId), 160)
  },
  acknowledge: (farmId, alertId) => setStatus(farmId, alertId, 'ACKNOWLEDGED'),
  resolve: (farmId, alertId) => setStatus(farmId, alertId, 'RESOLVED'),
}
