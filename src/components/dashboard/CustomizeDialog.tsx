import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { WidgetId, WidgetPreference } from '@/services'

interface CustomizeDialogProps {
  open: boolean
  onClose: () => void
  layout: WidgetPreference[]
  allowed: (id: WidgetId) => boolean
  onChange: (layout: WidgetPreference[]) => void
  onReset: () => void
}

/** Show/hide and reorder dashboard widgets (saved per user). */
export function CustomizeDialog({ open, onClose, layout, allowed, onChange, onReset }: CustomizeDialogProps) {
  const { t } = useI18n()
  const move = (index: number, delta: number) => {
    const next = [...layout]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('customize.title')}
      description={t('customize.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onReset}>
            <RotateCcw aria-hidden className="size-4" />
            {t('customize.reset')}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t('common.done')}
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-border rounded-xl border border-border">
        {layout.map((w, i) => {
          const permitted = allowed(w.id)
          const id = `widget-${w.id}`
          return (
            <li key={w.id} className={cn('flex items-center gap-3 px-3 py-2.5', !permitted && 'opacity-60')}>
              <input
                id={id}
                type="checkbox"
                checked={w.visible && permitted}
                disabled={!permitted}
                onChange={(e) => onChange(layout.map((x) => (x.id === w.id ? { ...x, visible: e.target.checked } : x)))}
                className="size-4 shrink-0 accent-[var(--brand)]"
              />
              <label htmlFor={id} className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text">{t(`widgets.${w.id}.name`)}</span>
                <span className="block text-xs text-text-muted">{permitted ? t(`widgets.${w.id}.description`) : t('customize.notForRole')}</span>
              </label>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={t('customize.moveUp', { widget: t(`widgets.${w.id}.name`) })}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover disabled:opacity-30"
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={i === layout.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t('customize.moveDown', { widget: t(`widgets.${w.id}.name`) })}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover disabled:opacity-30"
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
