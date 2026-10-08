import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import type { ProductionBatch } from '@/types'

/** Deep link that opens this batch when scanned with a phone camera. */
export function batchQrUrl(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/batches?code=${encodeURIComponent(code)}`
}

interface BatchQrProps {
  batch: ProductionBatch
  speciesName?: string
  locationCode?: string | null
}

/**
 * Printable QR label for a batch. Stick it on the bag/rack: scanning it opens
 * the batch in the app so the location (e.g. A-1A) can be confirmed on the spot.
 */
export function BatchQr({ batch, speciesName, locationCode }: BatchQrProps) {
  const { t } = useI18n()
  const printRef = useRef<HTMLDivElement>(null)
  const url = batchQrUrl(batch.code)

  const print = () => {
    const node = printRef.current
    if (!node) return
    const w = window.open('', '_blank', 'width=420,height=560')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>${batch.code}</title><style>
      body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .label{border:2px solid #111;border-radius:12px;padding:24px;text-align:center}
      .code{font-size:28px;font-weight:800;letter-spacing:1px;margin:12px 0 4px}
      .meta{font-size:14px;color:#444;margin:2px 0}
    </style></head><body><div class="label">${node.innerHTML}</div>
    <script>onload=()=>{print();}</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="flex items-start gap-4">
      <div ref={printRef} className="rounded-xl border border-border bg-white p-3">
        <QRCodeSVG value={url} size={120} level="M" aria-label={t('pages.batches.qr.label', { code: batch.code })} />
        <div className="code mt-2 text-center font-display text-lg font-bold tracking-wide text-ink">{batch.code}</div>
        {speciesName && <div className="meta text-center text-xs text-text-secondary">{speciesName}</div>}
        {locationCode && <div className="meta text-center text-xs font-semibold text-text-secondary">📍 {locationCode}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm text-text-secondary">{t('pages.batches.qr.hint')}</p>
        <Button size="sm" variant="secondary" onClick={print} className="self-start">
          <Printer aria-hidden className="size-4" />
          {t('pages.batches.qr.print')}
        </Button>
      </div>
    </div>
  )
}
