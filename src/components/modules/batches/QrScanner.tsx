import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/i18n'

interface QrScannerProps {
  open: boolean
  onClose: () => void
  /** Called with the scanned text (batch code or batch URL). */
  onScan: (text: string) => void
}

/** Extract a batch code from raw QR text (plain code or app deep link). */
export function extractBatchCode(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    const code = u.hash.match(/[?&]code=([^&]+)/)?.[1]
    if (code) return decodeURIComponent(code)
  } catch {
    /* not a URL — treat as a raw code */
  }
  return /^[A-Za-z0-9-]+$/.test(t) && t.length <= 32 ? t : null
}

/** Camera QR scanner. On success calls onScan and closes. */
export function QrScanner({ open, onClose, onScan }: QrScannerProps) {
  const { t } = useI18n()
  const regionId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!open) return
    setError(null)
    setStarting(true)
    let cancelled = false
    const scanner = new Html5Qrcode(regionId.current)
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (cancelled) return
          cancelled = true
          const code = extractBatchCode(text)
          scanner.stop().catch(() => undefined)
          if (code) onScanRef.current(code)
          else setError(t('pages.batches.scan.notBatch'))
          onClose()
        },
        () => undefined,
      )
      .catch(() => {
        if (!cancelled) setError(t('pages.batches.scan.cameraError'))
        setStarting(false)
      })
      .finally(() => {
        if (!cancelled) setStarting(false)
      })
    return () => {
      cancelled = true
      scanner.stop().catch(() => undefined)
      scannerRef.current = null
    }
  }, [open, onClose, t])

  return (
    <Modal open={open} onClose={onClose} title={t('pages.batches.scan.title')} description={t('pages.batches.scan.hint')}>
      <div className="space-y-3">
        <div id={regionId.current} className="overflow-hidden rounded-xl border border-border bg-ink" />
        {starting && <p className="text-sm text-text-secondary">{t('pages.batches.scan.starting')}</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button variant="secondary" onClick={onClose} className="w-full">
          <X aria-hidden className="size-4" />
          {t('form.cancel')}
        </Button>
      </div>
    </Modal>
  )
}

export function ScanButton({ onScan, className }: { onScan: (code: string) => void; className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className={className}>
        <Camera aria-hidden className="size-4" />
        {t('pages.batches.scan.button')}
      </Button>
      <QrScanner open={open} onClose={() => setOpen(false)} onScan={onScan} />
    </>
  )
}
