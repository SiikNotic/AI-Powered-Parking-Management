import type { Camera } from '@/types'
import type { CameraService } from '../contracts'
import { ServiceError } from '../errors'
import { logActivity, newId, read, write } from './db'
import { matchesLocation, withLatency } from './delay'

export const mockCameraService: CameraService = {
  list: (location) =>
    withLatency(() => read().cameras.filter((c) => matchesLocation(c.locationId, location)).sort((a, b) => a.name.localeCompare(b.name))),

  create: (input) =>
    withLatency(() => {
      const camera: Camera = { ...input, id: newId('cam'), lastSeenAt: new Date().toISOString() }
      write(['cameras', 'alerts'], (draft) => {
        draft.cameras.push(camera)
      })
      return camera
    }),

  update: (id, input) =>
    withLatency(() => {
      const existing = read().cameras.find((c) => c.id === id)
      if (!existing) throw new ServiceError('notFound')
      const next = { ...existing, ...input }
      write(['cameras', 'alerts'], (draft) => {
        draft.cameras = draft.cameras.map((c) => (c.id === id ? next : c))
      })
      return next
    }),

  setStatus: (id, status) =>
    withLatency(() => {
      const existing = read().cameras.find((c) => c.id === id)
      if (!existing) throw new ServiceError('notFound')
      const next: Camera = { ...existing, status, lastSeenAt: status === 'online' ? new Date().toISOString() : existing.lastSeenAt }
      write(['cameras', 'alerts', 'activity'], (draft) => {
        draft.cameras = draft.cameras.map((c) => (c.id === id ? next : c))
        if (status !== existing.status && (status === 'online' || status === 'offline')) {
          logActivity(draft, {
            type: status === 'online' ? 'camera_online' : 'camera_offline',
            locationId: next.locationId,
            params: { cameraName: next.name },
          })
        }
      })
      return next
    }),

  delete: (id) =>
    withLatency(() => {
      write(['cameras', 'alerts'], (draft) => {
        draft.cameras = draft.cameras.filter((c) => c.id !== id)
      })
    }),
}
