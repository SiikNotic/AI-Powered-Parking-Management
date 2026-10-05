/** ⚠️ DEMO — alert drafts for a demo farm, from its records and the simulated sensor feed. */
import { getFarmDataset } from '@/data/demo'
import { buildAlertDrafts } from '../shared/alerts'
import { roomHistory } from './demoSensorProvider'

export function alertDraftsFor(farmId: string, now = new Date()) {
  const data = getFarmDataset(farmId)
  const history = new Map(data.rooms.map((r) => [r.id, roomHistory(farmId, r.id)]))
  return buildAlertDrafts(data, history, now)
}
