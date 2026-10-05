/** ⚠️ DEMO dashboard service: the shared snapshot builder over the generated farm. */
import { demoUser, getFarmDataset } from '@/data/demo'
import type { DashboardService } from '../contracts'
import { buildSnapshot } from '../shared/snapshot'
import { delay } from './delay'

export const demoDashboardService: DashboardService = {
  getSnapshot(farmId, period) {
    const snapshot = buildSnapshot(getFarmDataset(farmId), period, new Date(), (id) => (id === demoUser.id ? demoUser.name : undefined))
    return delay(snapshot, 260)
  },
}
