import { CheckCircle2, Circle, CircleDashed, CircleDot, Clock, PackageCheck, Truck, XCircle, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/i18n'
import type { OrderStatus } from '@/types'
import { STATUS_TONE } from './orderRules'

const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  PENDING: CircleDashed,
  CONFIRMED: Circle,
  PREPARING: CircleDot,
  READY: PackageCheck,
  OUT_FOR_DELIVERY: Truck,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  const Icon = STATUS_ICON[status]
  return (
    <Badge tone={STATUS_TONE[status]} icon={<Icon aria-hidden className="size-3" />}>
      {t(`orderStatus.${status}`)}
    </Badge>
  )
}

export function PaidBadge({ paid }: { paid: boolean }) {
  const { t } = useI18n()
  return paid ? (
    <Badge tone="success" icon={<CheckCircle2 aria-hidden className="size-3" />}>
      {t('pages.orders.paid')}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<Clock aria-hidden className="size-3" />}>
      {t('pages.orders.unpaid')}
    </Badge>
  )
}
