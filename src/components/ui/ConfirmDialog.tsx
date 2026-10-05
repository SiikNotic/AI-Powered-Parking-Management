import { Button } from './Button'
import { Modal } from './Modal'
import { useI18n } from '@/i18n'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'primary', pending, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant={tone} disabled={pending} onClick={onConfirm}>
            {confirmLabel ?? t('form.confirm')}
          </Button>
        </>
      }
    >
      <span />
    </Modal>
  )
}
