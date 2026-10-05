import type { Customer, CustomerSummary } from '@/types'
import type { CustomerService } from '../contracts'
import { ServiceError } from '../errors'
import { logActivity, newId, read, write } from './db'
import { withLatency } from './delay'
import { isActive, joinReservation } from './selectors'

function summarize(customer: Customer): CustomerSummary {
  const own = read().reservations.filter((r) => r.customerId === customer.id)
  const paid = own.filter((r) => r.status === 'completed' || r.status === 'checked_in')
  const lastVisit = paid.map((r) => r.checkIn).sort().at(-1)
  return {
    ...customer,
    reservationCount: own.filter((r) => r.status !== 'cancelled').length,
    activeReservations: own.filter(isActive).length,
    totalSpent: paid.reduce((sum, r) => sum + r.total, 0),
    lastVisit,
  }
}

export const mockCustomerService: CustomerService = {
  list: (search) =>
    withLatency(() => {
      const q = search?.trim().toLowerCase()
      return read()
        .customers.filter((c) => !q || `${c.name} ${c.email} ${c.phone} ${c.company ?? ''}`.toLowerCase().includes(q))
        .map(summarize)
        .sort((a, b) => a.name.localeCompare(b.name))
    }),

  getReservations: (customerId) =>
    withLatency(() =>
      read()
        .reservations.filter((r) => r.customerId === customerId)
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
        .map((r) => joinReservation(r)),
    ),

  create: (input) =>
    withLatency(() => {
      const customer: Customer = { ...input, id: newId('cus'), createdAt: new Date().toISOString() }
      write(['customers', 'activity'], (draft) => {
        draft.customers.push(customer)
        const locationId = draft.locations[0]?.id ?? ''
        logActivity(draft, { type: 'customer_created', locationId, params: { customerName: customer.name } })
      })
      return customer
    }),

  update: (id, input) =>
    withLatency(() => {
      const existing = read().customers.find((c) => c.id === id)
      if (!existing) throw new ServiceError('notFound')
      const next = { ...existing, ...input }
      write(['customers', 'reservations'], (draft) => {
        draft.customers = draft.customers.map((c) => (c.id === id ? next : c))
      })
      return next
    }),

  delete: (id) =>
    withLatency(() => {
      write(['customers', 'reservations', 'spaces'], (draft) => {
        // Free any space this customer was holding.
        for (const r of draft.reservations) {
          if (r.customerId === id && (r.status === 'pending' || r.status === 'confirmed')) {
            r.status = 'cancelled'
            const space = draft.spaces.find((s) => s.id === r.spaceId)
            if (space?.status === 'reserved') space.status = 'available'
          }
        }
        draft.customers = draft.customers.filter((c) => c.id !== id)
      })
    }),
}
