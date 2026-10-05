import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ParkingMap } from '@/components/dashboard/ParkingMap'
import { SpaceDetail } from '@/components/forms/SpaceDetail'
import { SpaceForm } from '@/components/forms/SpaceForm'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SelectInput } from '@/components/ui/Form'
import { PageContainer, PageHeader } from '@/components/ui/PageHeader'
import { RowMenu } from '@/components/ui/RowMenu'
import { SearchInput } from '@/components/ui/SearchInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States'
import { Table, Td, Th } from '@/components/ui/Table'
import { SPACE_STATUSES, statusVisuals } from '@/config/status'
import { useSession } from '@/context/session'
import { useAsync } from '@/hooks/useAsync'
import { useFormat } from '@/hooks/useFormat'
import { useMutation } from '@/hooks/useMutation'
import { useInitialQueryParam } from '@/hooks/useQueryFlag'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { parkingService } from '@/services'
import type { ParkingSpace, SpaceInput, SpaceStatus, SpaceType } from '@/types'

type View = 'map' | 'list'
type Dialog = { kind: 'create' } | { kind: 'edit'; space: ParkingSpace } | { kind: 'detail'; spaceId: string } | { kind: 'delete'; space: ParkingSpace } | null

export function ParkingSpacesPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { selectedLocation, locations, activeLocation } = useSession()
  const spaces = useAsync(() => parkingService.getSpaces(selectedLocation), [selectedLocation], ['spaces'])
  const openNew = useInitialQueryParam('new')
  const initialView = useInitialQueryParam('view')
  const openSpace = useInitialQueryParam('space')
  const [view, setView] = useState<View>(initialView === 'list' ? 'list' : 'map')
  const [status, setStatus] = useState<SpaceStatus | null>(null)
  const [type, setType] = useState<SpaceType | ''>('')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<Dialog>(
    openSpace ? { kind: 'detail', spaceId: openSpace } : openNew ? { kind: 'create' } : null,
  )

  const create = useMutation((input: SpaceInput) => parkingService.createSpace(input))
  const update = useMutation((id: string, patch: Partial<SpaceInput>) => parkingService.updateSpace(id, patch))
  const remove = useMutation((id: string) => parkingService.deleteSpace(id))

  const allLocations = locations.data ?? []
  const scopedLocations = activeLocation ? [activeLocation] : allLocations
  const data = spaces.data
  const q = search.trim().toLowerCase()
  const matches = (space: ParkingSpace) =>
    (!status || space.status === status) &&
    (!type || space.type === type) &&
    (!q || String(space.number).includes(q) || space.zone.toLowerCase() === q)
  const filtered = useMemo(() => (data ?? []).filter(matches), [data, status, type, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const types = useMemo(() => Array.from(new Set((data ?? []).map((s) => s.type))), [data])
  const hasFilters = Boolean(status || type || q)
  const detailSpace = dialog?.kind === 'detail' ? data?.find((s) => s.id === dialog.spaceId) : undefined
  const nameOf = (id: string) => allLocations.find((l) => l.id === id)?.name ?? ''
  const nextNumber = (locationId: string) => Math.max(0, ...(data ?? []).filter((s) => s.locationId === locationId).map((s) => s.number)) + 1

  return (
    <PageContainer>
      <PageHeader
        description={t('spacesPage.description')}
        actions={
          <>
            <SegmentedControl
              label={t('spacesPage.viewLabel')}
              value={view}
              onChange={setView}
              options={[
                { value: 'map', label: t('spacesPage.views.map') },
                { value: 'list', label: t('spacesPage.views.list') },
              ]}
            />
            <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} disabled={!allLocations.length}>
              <Plus aria-hidden className="size-4" />
              {t('spacesPage.add')}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            label={t('common.search')}
            placeholder={t('spacesPage.searchPlaceholder')}
            className="w-full sm:w-60"
          />
          <SelectInput
            aria-label={t('spacesPage.filterType')}
            value={type}
            onChange={(e) => setType(e.target.value as SpaceType | '')}
            className="w-full sm:w-44"
          >
            <option value="">{t('spacesPage.allTypes')}</option>
            {types.map((ty) => (
              <option key={ty} value={ty}>
                {t(`spaceType.${ty}`)}
              </option>
            ))}
          </SelectInput>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('dashboard.live.filterBy')}>
            {SPACE_STATUSES.map((s) => {
              const visual = statusVisuals[s]
              const Icon = visual.icon
              const active = status === s
              const count = (data ?? []).filter((sp) => sp.status === s).length
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(active ? null : s)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                    active ? cn(visual.badge, 'border-current') : 'border-glass-border bg-surface-hover text-text-secondary hover:bg-surface-raised',
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {t(`status.${s}`)}
                  <span className="tabular text-text-muted">{count}</span>
                </button>
              )
            })}
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus(null)
                setType('')
                setSearch('')
              }}
            >
              {t('common.clearFilters')}
            </Button>
          )}
        </div>
      </PageHeader>

      <Card>
        {spaces.status === 'error' ? (
          <ErrorState onRetry={spaces.retry} />
        ) : !data ? (
          <LoadingState>
            <Skeleton className="h-96 w-full" />
          </LoadingState>
        ) : allLocations.length === 0 ? (
          <EmptyState title={t('states.noLocationsTitle')} description={t('spacesPage.noLocations')} />
        ) : filtered.length === 0 && view === 'list' ? (
          <EmptyState title={t('common.noResults')} />
        ) : view === 'map' ? (
          <>
            <ParkingMap
              spaces={data}
              locations={scopedLocations}
              isHighlighted={hasFilters ? matches : undefined}
              onSelect={(space) => setDialog({ kind: 'detail', spaceId: space.id })}
              className="max-h-[70vh]"
            />
            <p className="mt-3 text-xs text-text-muted">{t('common.showing', { count: filtered.length })}</p>
          </>
        ) : (
          <Table label={t('spacesPage.views.list')}>
            <thead>
              <tr>
                <Th>{t('spacesPage.columns.space')}</Th>
                {!activeLocation && <Th>{t('spacesPage.columns.location')}</Th>}
                <Th>{t('spacesPage.columns.type')}</Th>
                <Th>{t('spacesPage.columns.size')}</Th>
                <Th>{t('spacesPage.columns.price')}</Th>
                <Th>{t('spacesPage.columns.status')}</Th>
                <Th>{t('spacesPage.columns.updated')}</Th>
                <Th>
                  <span className="sr-only">{t('common.actions')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((space) => (
                <tr key={space.id} className="group">
                  <Td>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'detail', spaceId: space.id })}
                      className="tabular font-semibold text-text hover:underline"
                    >
                      {t('dashboard.live.space', { number: space.number })}
                    </button>
                    <span className="block text-xs text-text-muted">{t('dashboard.live.zone', { zone: space.zone })}</span>
                  </Td>
                  {!activeLocation && <Td className="max-w-48 truncate">{nameOf(space.locationId)}</Td>}
                  <Td>{t(`spaceType.${space.type}`)}</Td>
                  <Td className="tabular whitespace-nowrap">
                    {space.length} × {space.width} ft
                  </Td>
                  <Td className="tabular whitespace-nowrap">
                    {fmt.currency(space.price)}
                    {t(`priceUnit.${space.priceUnit}`)}
                  </Td>
                  <Td>
                    <StatusBadge status={space.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{fmt.relative(space.updatedAt)}</Td>
                  <Td className="text-right">
                    <RowMenu
                      name={t('dashboard.live.space', { number: space.number })}
                      actions={[
                        { label: t('common.edit'), icon: Pencil, onSelect: () => setDialog({ kind: 'edit', space }) },
                        { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => setDialog({ kind: 'delete', space }) },
                      ]}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {detailSpace && (
        <SpaceDetail
          space={detailSpace}
          location={allLocations.find((l) => l.id === detailSpace.locationId)}
          pending={update.pending}
          onClose={() => setDialog(null)}
          onStatus={(next) => update.run([detailSpace.id, { status: next }], t('toasts.updated', { item: t('entities.space') }))}
          onEdit={() => setDialog({ kind: 'edit', space: detailSpace })}
          onDelete={() => setDialog({ kind: 'delete', space: detailSpace })}
        />
      )}

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <SpaceForm
          space={dialog.kind === 'edit' ? dialog.space : undefined}
          locations={allLocations}
          defaultLocationId={activeLocation?.id}
          nextNumber={nextNumber}
          pending={create.pending || update.pending}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            const result =
              dialog.kind === 'edit'
                ? await update.run([dialog.space.id, input], t('toasts.updated', { item: t('entities.space') }))
                : await create.run([input], t('toasts.created', { item: t('entities.space') }))
            if (result) setDialog(null)
          }}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' ? t('spacesPage.deleteTitle', { number: dialog.space.number }) : ''}
        message={t('spacesPage.deleteMessage')}
        confirmLabel={t('common.delete')}
        pending={remove.pending}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return
          await remove.run([dialog.space.id], t('toasts.deleted', { item: t('entities.space') }))
          setDialog(null)
        }}
      />
    </PageContainer>
  )
}
