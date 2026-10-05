import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { ToastContext, type ToastTone } from './toast'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const icons = { success: CheckCircle2, error: AlertTriangle, info: Info }
const iconTone = {
  success: 'text-available-ink',
  error: 'text-occupied-ink',
  info: 'text-reserved-ink',
}

/** Short confirmations after an action ("Location created"). Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[150] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm text-text shadow-pop animate-fade-in"
            >
              <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', iconTone[toast.tone])} />
              <p className="min-w-0 flex-1">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t('common.close')}
                className="-m-1 rounded-full p-1 text-text-muted hover:text-text"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
