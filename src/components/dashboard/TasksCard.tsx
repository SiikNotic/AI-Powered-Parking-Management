import { CircleCheck, Circle, CircleDot, ListChecks } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { DashboardSnapshot } from '@/services'
import type { TaskPriority } from '@/types'

const priorityTone: Record<TaskPriority, BadgeTone> = { URGENT: 'danger', HIGH: 'warning', MEDIUM: 'neutral', LOW: 'neutral' }

export function TasksCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const open = snapshot.tasks.filter((x) => x.status !== 'COMPLETED').length

  return (
    <Card labelledBy="tasks-title">
      <CardHeader id="tasks-title" icon={<ListChecks aria-hidden className="size-4" />} title={t('tasks.title')} subtitle={t('tasks.subtitle', { count: open })} />
      <ul className="divide-y divide-border">
        {snapshot.tasks.map((task) => {
          const Icon = task.status === 'COMPLETED' ? CircleCheck : task.status === 'IN_PROGRESS' ? CircleDot : Circle
          const late = task.status !== 'COMPLETED' && task.dueAt < snapshot.generatedAt
          return (
            <li key={task.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', task.status === 'COMPLETED' ? 'text-ok' : task.status === 'IN_PROGRESS' ? 'text-accent' : 'text-text-muted')} />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[0.8125rem] font-medium', task.status === 'COMPLETED' ? 'text-text-muted line-through' : 'text-text')}>{task.title}</p>
                <p className="mt-0.5 text-[0.6875rem] text-text-muted">
                  <span className="sr-only">{t(`tasks.status.${task.status}`)} · </span>
                  {task.assigneeName} · <span className={late ? 'font-semibold text-crit-ink' : ''}>{late ? t('tasks.late', { time: fmt.dayMonthTime(task.dueAt) }) : t('tasks.due', { time: fmt.dayMonthTime(task.dueAt) })}</span>
                </p>
              </div>
              {task.status !== 'COMPLETED' && <Badge tone={priorityTone[task.priority]}>{t(`tasks.priority.${task.priority}`)}</Badge>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
