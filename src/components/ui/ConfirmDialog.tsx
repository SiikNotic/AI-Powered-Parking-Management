import { useI18n } from '@/i18n'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirmation step for destructive actions (built into the page; no browser confirm()). */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, pending, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? t('common.working') : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Modal>
  )
}
