/**
 * ⚠️ DEMO DATA — NOT REAL.
 * Customers and reservations generated for the demo dashboard.
 * Every reserved space in `mockParkingData` gets one upcoming reservation.
 */
import type { Customer, Reservation, ReservationStatus, VehicleType } from '@/types'
import { hoursFromNow } from './demoUtils'
import { mockSpaces } from './mockParkingData'

export const mockCustomers: Customer[] = [
  { id: 'cus_01', name: 'John Smith', email: 'john.smith@example.com', phone: '+1 215 555 0142', company: 'Keystone Carriers' },
  { id: 'cus_02', name: 'Maria Gonzalez', email: 'maria.g@example.com', phone: '+1 214 555 0187', company: 'Lone Star Haulers' },
  { id: 'cus_03', name: 'Darnell Brooks', email: 'dbrooks@example.com', phone: '+1 267 555 0119' },
  { id: 'cus_04', name: 'Emily Carter', email: 'emily.carter@example.com', phone: '+1 908 555 0164' },
  { id: 'cus_05', name: 'Ahmed Khan', email: 'a.khan@example.com', phone: '+1 469 555 0131', company: 'Blue Ridge Freight' },
  { id: 'cus_06', name: 'Luis Ramirez', email: 'luis.r@example.com', phone: '+1 972 555 0175' },
  { id: 'cus_07', name: 'Kevin O’Brien', email: 'kobrien@example.com', phone: '+1 610 555 0108', company: 'Delaware Valley Transport' },
  { id: 'cus_08', name: 'Sarah Johnson', email: 'sarah.j@example.com', phone: '+1 817 555 0153' },
  { id: 'cus_09', name: 'Tom Becker', email: 'tbecker@example.com', phone: '+1 484 555 0196' },
  { id: 'cus_10', name: 'Priya Patel', email: 'priya.p@example.com', phone: '+1 214 555 0122', company: 'Metroplex Logistics' },
  { id: 'cus_11', name: 'Robert Lee', email: 'rlee@example.com', phone: '+1 682 555 0147' },
  { id: 'cus_12', name: 'Ana Torres', email: 'ana.torres@example.com', phone: '+1 972 555 0189' },
  { id: 'cus_13', name: 'Mike Davis', email: 'mdavis@example.com', phone: '+1 215 555 0110', company: 'Liberty Bell Freight' },
  { id: 'cus_14', name: 'Linda Nguyen', email: 'linda.n@example.com', phone: '+1 469 555 0168' },
  { id: 'cus_15', name: 'Carlos Mendoza', email: 'c.mendoza@example.com', phone: '+1 214 555 0135' },
  { id: 'cus_16', name: 'James Wilson', email: 'jwilson@example.com', phone: '+1 267 555 0177' },
]

const statusCycle: ReservationStatus[] = ['confirmed', 'confirmed', 'pending', 'confirmed']

/** Check-in offsets (hours from now) — spread over the next ~day and a half. */
const checkInOffsets = [3.5, 1.25, 5, 7.5, 2, 9, 4.25, 11, 6, 13, 15.5, 18, 20, 23.5, 26, 30]

export const mockReservations: Reservation[] = mockSpaces
  .filter((space) => space.status === 'reserved')
  .map((space, index) => {
    const checkInHours = checkInOffsets[index % checkInOffsets.length]
    const nights = index % 5 === 0 ? 2 : 1
    const vehicleType: VehicleType = space.vehicleTypes[index % space.vehicleTypes.length]
    return {
      id: `res_${1042 + index}`,
      code: `SP-${1042 + index}`,
      locationId: space.locationId,
      spaceId: space.id,
      spaceNumber: space.number,
      customer: mockCustomers[index % mockCustomers.length],
      vehicleType,
      checkIn: hoursFromNow(checkInHours),
      checkOut: hoursFromNow(checkInHours + 14 + (nights - 1) * 24),
      status: statusCycle[index % statusCycle.length],
      total: space.price * nights,
      currency: 'USD' as const,
    }
  })
