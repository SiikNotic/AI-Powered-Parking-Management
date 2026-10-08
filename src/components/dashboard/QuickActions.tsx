import { Camera, Plus, Scissors } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { QrScanner, extractBatchCode } from '@/components/modules/batches/QrScanner'
import { BATCH_WRITERS, HARVEST_WRITERS } from '@/components/modules/batches/access'
import { useSession } from '@/context/session'
import { useI18n } from '@/i18n'

/**
 * Friendly one-tap shortcuts at the top of the dashboard: create a batch,
 * scan a batch QR label, or record a harvest — the three things growers do
 * most often on the floor.
 */
export function QuickActions() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user } = useSession()
  const [scanning, setScanning] = useState(false)
  const canWrite = BATCH_WRITERS.includes(user.role)
  const canHarvest = HARVEST_WRITERS.includes(user.role)

  const openScanned = (text: string) => {
    const code = extractBatchCode(text)
    navigate(code ? `/batches?code=${encodeURIComponent(code)}` : '/batches')
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canWrite && (
        <Button variant="primary" size="sm" onClick={() => navigate('/batches?new=1')}>
          <Plus aria-hidden className="size-4" />
          {t('dashboard.quick.newBatch')}
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={() => setScanning(true)}>
        <Camera aria-hidden className="size-4" />
        {t('dashboard.quick.scanQr')}
      </Button>
      {canHarvest && (
        <Button variant="secondary" size="sm" onClick={() => navigate('/harvest')}>
          <Scissors aria-hidden className="size-4" />
          {t('dashboard.quick.recordHarvest')}
        </Button>
      )}
      <QrScanner open={scanning} onClose={() => setScanning(false)} onScan={openScanned} />
    </div>
  )
}
