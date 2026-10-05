import { Cctv, CameraOff, Pencil, Plus, Trash2, Wifi, WifiOff, Wrench } from 'lucide-react'
import { useState } from 'react'
import { CameraForm } from '@/components/forms/CameraForm'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { RowMenu } from '@/components/ui/RowMenu'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { cameraService } from '@/services'
import type { Camera, CameraInput, CameraStatus } from '@/types'

const tone: Record<CameraStatus, BadgeTone> = { online: 'success', offline: 'danger', maintenance: 'warning' }
const statusIcon = { online: Wifi, offline: WifiOff, maintenance: Wrench }

type Dialog = { kind: 'create' } | { kind: 'edit'; camera: Camera } | { kind: 'delete'; camera: Camera } | null

export function CamerasPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { selectedLocation, locations, activeLocation } = useSession()
  const cameras = useAsync(() => cameraService.list(selectedLocation), [selectedLocation], ['cameras'])
  const [dialog, setDialog] = useState<Dialog>(null)

  const create = useMutation((input: CameraInput) => cameraService.create(input))
  const update = useMutation((id: string, input: CameraInput) => cameraService.update(id, input))
  const setStatus = useMutation((id: string, status: CameraStatus) => cameraService.setStatus(id, status))
  const remove = useMutation((id: string) => cameraService.delete(id))

  const allLocations = locations.data ?? []
  const nameOf = (id: string) => allLocations.find((l) => l.id === id)?.name ?? ''
  const data = cameras.data
  const counts = (status: CameraStatus) => data?.filter((c) => c.status === status).length ?? 0

  return (
    <PageContainer>
      <PageHeader
        description={t('camerasPage.description')}
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} disabled={!allLocations.length}>
            <Plus aria-hidden className="size-4" />
            {t('camerasPage.add')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {(['online', 'offline', 'maintenance'] as const).map((s) => {
            const Icon = statusIcon[s]
            return (
              <Badge key={s} tone={tone[s]} className="px-2.5 py-1 text-xs" icon={<Icon aria-hidden className="size-3.5" />}>
                {t(`camerasPage.status.${s}`)} · {counts(s)}
              </Badge>
            )
          })}
          <p className="text-xs text-text-muted">{t('camerasPage.streamNote')}</p>
        </div>
      </PageHeader>

      {cameras.status === 'error' ? (
        <ErrorState onRetry={cameras.retry} className="glass rounded-card" />
      ) : !data ? (
        <LoadingState className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-64 rounded-card" />)}
        </LoadingState>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Cctv}
          title={t('camerasPage.empty')}
          description={t('camerasPage.emptyDescription')}
          className="glass rounded-card py-20"
          action={
            allLocations.length ? (
              <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
                {t('camerasPage.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((camera) => {
            const online = camera.status === 'online'
            return (
              <li key={camera.id} className="glass flex flex-col overflow-hidden rounded-card">
                {/* Feed placeholder: shows connection state until video streaming is connected */}
                <div
                  className={cn(
                    'relative flex aspect-video items-center justify-center bg-gradient-to-br',
                    online ? 'from-[#1d2140] via-[#232a52] to-[#3b2f5c]' : 'from-[#1b1b22] to-[#2a2a33]',
                  )}
                >
                  <div aria-hidden className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_4px)]" />
                  {online ? (
                    <Cctv aria-hidden className="size-10 text-white/40" />
                  ) : (
                    <CameraOff aria-hidden className="size-10 text-white/30" />
                  )}
                  <span
                    className={cn(
                      'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide',
                      online ? 'bg-black/40 text-white' : camera.status === 'offline' ? 'bg-occupied text-white' : 'bg-maintenance text-white',
                    )}
                  >
                    {online && <span aria-hidden className="size-1.5 rounded-full bg-available [animation:live-pulse_2s_ease-out_infinite]" />}
                    {t(`camerasPage.feed.${camera.status}`)}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-white/80">{camera.resolution}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-text">{camera.name}</h2>
                      <p className="truncate text-xs text-text-muted">{camera.coverage}</p>
                    </div>
                    <RowMenu
                      name={camera.name}
                      actions={[
                        ...(['online', 'offline', 'maintenance'] as const)
                          .filter((s) => s !== camera.status)
                          .map((s) => ({
                            label: t(`camerasPage.setStatus.${s}`),
                            icon: statusIcon[s],
                            onSelect: () => setStatus.run([camera.id, s], t('toasts.updated', { item: t('entities.camera') })),
                          })),
                        { label: t('common.edit'), icon: Pencil, onSelect: () => setDialog({ kind: 'edit', camera }) },
                        { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', camera }) },
                      ]}
                    />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-text-secondary">
                    <Badge tone={tone[camera.status]}>{t(`camerasPage.status.${camera.status}`)}</Badge>
                    <span className="truncate">
                      {!activeLocation && `${nameOf(camera.locationId)} · `}
                      {t('camerasPage.lastSeen', { time: fmt.relative(camera.lastSeenAt) })}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <CameraForm
          camera={dialog.kind === 'edit' ? dialog.camera : undefined}
          locations={allLocations}
          defaultLocationId={activeLocation?.id}
          pending={create.pending || update.pending}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            const result =
              dialog.kind === 'edit'
                ? await update.run([dialog.camera.id, input], t('toasts.updated', { item: t('entities.camera') }))
                : await create.run([input], t('toasts.created', { item: t('entities.camera') }))
            if (result) setDialog(null)
          }}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? t('camerasPage.deleteTitle', { name: dialog.camera.name }) : ''}
        message={t('camerasPage.deleteMessage')}
        confirmLabel={t('common.delete')}
        pending={remove.pending}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return
          await remove.run([dialog.camera.id], t('toasts.deleted', { item: t('entities.camera') }))
          setDialog(null)
        }}
      />
    </PageContainer>
  )
}
