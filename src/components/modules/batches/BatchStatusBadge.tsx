import { Ban, CheckCircle2, Circle, CircleDot, Clock, Scissors, Sprout, XCircle, type LucideIcon } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { useI18n } from '@/i18n'
import type { BatchStatus } from '@/types'

const STYLE: Record<BatchStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  PLANNED: { tone: 'neutral', icon: Circle },
  INOCULATED: { tone: 'info', icon: CircleDot },
  COLONIZING: { tone: 'info', icon: Clock },
  FRUITING: { tone: 'brand', icon: Sprout },
  READY_TO_HARVEST: { tone: 'warning', icon: Scissors },
  HARVESTED: { tone: 'success', icon: Scissors },
  COMPLETED: { tone: 'success', icon: CheckCircle2 },
  FAILED: { tone: 'danger', icon: XCircle },
  DISCARDED: { tone: 'offline', icon: Ban },
}

/** Batch status with an icon so the state never depends on colour alone. */
export function BatchStatusBadge({ status, className }: { status: BatchStatus; className?: string }) {
  const { t } = useI18n()
  const { tone, icon: Icon } = STYLE[status]
  return (
    <Badge tone={tone} icon={<Icon aria-hidden className="size-3" />} className={className}>
      {t(`batch.status.${status}`)}
    </Badge>
  )
}
