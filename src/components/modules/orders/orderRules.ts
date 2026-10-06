/** Pure helpers shared by the Orders, Customers and Sales / POS pages. */
import type { BadgeTone } from '@/components/ui/Badge'
import { isOpen } from '@/domain/finance'
import type { Customer, CustomerType, Order, OrderStatus, PaymentMethod, Role, SaleChannel } from '@/types'

/** Roles allowed to write customers and orders (same as the RLS policy). */
export const SALES_WRITERS: Role[] = ['OWNER', 'FARM_MANAGER', 'SALES']

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
export const CHANNELS: SaleChannel[] = ['in_person', 'online', 'wholesale', 'delivery', 'pickup']
export const CUSTOMER_TYPES: CustomerType[] = ['wholesale', 'restaurant', 'retail', 'individual', 'distributor']
export const PAYMENT_TERMS: Customer['paymentTerms'][] = ['due_on_receipt', 'net_15', 'net_30']

export const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'neutral',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY: 'brand',
  OUT_FOR_DELIVERY: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'offline',
}

/** Price list factor by customer type (wholesale/distributor 80%, restaurant 90%). */
export const PRICE_FACTOR: Record<CustomerType, number> = { wholesale: 0.8, distributor: 0.8, restaurant: 0.9, retail: 1, individual: 1 }

export const round2 = (n: number) => Math.round(n * 100) / 100

export const customerPrice = (price: number, type?: CustomerType) => round2(price * (type ? PRICE_FACTOR[type] : 1))

/** Net terms are billed by invoice; everyone else pays on the spot. */
export const defaultPayment = (customer?: Customer): PaymentMethod => (customer && customer.paymentTerms !== 'due_on_receipt' ? 'invoice' : 'card')

export const isOverdue = (order: Order, now: number) => isOpen(order) && new Date(order.dueAt).getTime() < now

/** Delivered or completed invoice orders that are not paid yet. */
export const isReceivable = (order: Order) => !order.paid && order.paymentMethod === 'invoice' && (order.status === 'COMPLETED' || order.status === 'OUT_FOR_DELIVERY')
