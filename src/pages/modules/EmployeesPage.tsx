import { Check, Info, Minus, Plus, Power, ShieldCheck, Sprout, UserCheck, UserX, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNow } from '@/components/modules/inventory/useNow'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Checkbox, Field, FormGrid, Select, TextInput } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { ROLE_PERMISSIONS, ROLES, type Permission } from '@/domain/permissions'
import { harvestTotals, type HarvestTotals } from '@/domain/production'
import { periodRange } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n, type TranslationKey } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Employee, Member, Role, StaffRole } from '@/types'

type Section = 'staff' | 'members'
type ActiveFilter = 'active' | 'inactive'

const STAFF_ROLES: StaffRole[] = ['farm_manager', 'grower', 'harvester', 'packing', 'sales', 'delivery']
const PERMISSIONS: Permission[] = ['production.view', 'inventory.view', 'sales.view', 'finance.view', 'environment.view', 'alerts.manage', 'tasks.view', 'audit.view', 'farms.manage']
/** Roles allowed to edit staff records (same as the RLS policy). */
const WRITERS: Role[] = ['OWNER', 'FARM_MANAGER']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const permissionKey = (p: Permission) => `pages.employees.permissions.${p.replace('.', '_')}` as TranslationKey

interface StaffRow {
  employee: Employee
  harvest: HarvestTotals
}

type Draft = Omit<Employee, 'id' | 'farmId'> & { id?: string }

export function EmployeesPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { user } = useSession()
  const { data, status, retry } = useFarmData()
  const now = useNow()
  const canEdit = WRITERS.includes(user.role)
  const [section, setSection] = useState<Section>('staff')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<StaffRole | ''>('')
  const [active, setActive] = useState<ActiveFilter | ''>('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const toggle = useCommand('saveEmployee')

  const allRows = useMemo<StaffRow[]>(() => {
    if (!data) return []
    const range = periodRange('30d', now)
    return data.employees.map((employee) => ({ employee, harvest: harvestTotals(data.harvests.filter((h) => h.employeeId === employee.id), range) }))
  }, [data, now])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter(
      ({ employee: e }) =>
        (!role || e.role === role) && (!active || e.active === (active === 'active')) && (!q || [e.name, e.phone, e.email].some((v) => v.toLowerCase().includes(q))),
    )
  }, [allRows, query, role, active])

  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const activeCount = allRows.filter((r) => r.employee.active).length
  const totalNet = allRows.reduce((s, r) => s + r.harvest.net, 0)
  const totalFlushes = allRows.reduce((s, r) => s + r.harvest.flushes, 0)
  const top = allRows.reduce<StaffRow | null>((best, r) => (r.harvest.net > (best?.harvest.net ?? 0) ? r : best), null)

  const setEmployeeActive = (e: Employee, next: boolean) =>
    toggle.run([{ ...e, active: next }], t(next ? 'pages.employees.activated' : 'pages.employees.deactivated', { name: e.name }))

  const columns: Column<StaffRow>[] = [
    { key: 'name', header: t('pages.employees.columns.name'), cell: (r) => <span className="font-medium text-text">{r.employee.name}</span>, sort: (r) => r.employee.name },
    { key: 'role', header: t('pages.employees.columns.role'), cell: (r) => t(`labels.staffRole.${r.employee.role}`), sort: (r) => r.employee.role },
    { key: 'phone', header: t('pages.employees.columns.phone'), cell: (r) => r.employee.phone || '—', hideOnMobile: true },
    { key: 'email', header: t('pages.employees.columns.email'), cell: (r) => <span className="block max-w-56 truncate">{r.employee.email || '—'}</span>, hideOnMobile: true },
    {
      key: 'harvest',
      header: t('pages.employees.columns.harvest'),
      align: 'right',
      cell: (r) => (r.harvest.flushes ? t('pages.employees.harvestCell', { lb: fmt.pounds(r.harvest.net), count: r.harvest.flushes }) : '—'),
      sort: (r) => r.harvest.net,
    },
    {
      key: 'status',
      header: t('pages.employees.columns.status'),
      cell: (r) =>
        r.employee.active ? (
          <Badge tone="success" icon={<UserCheck aria-hidden className="size-3" />}>
            {t('labels.active')}
          </Badge>
        ) : (
          <Badge tone="offline" icon={<UserX aria-hidden className="size-3" />}>
            {t('labels.inactive')}
          </Badge>
        ),
      sort: (r) => (r.employee.active ? 0 : 1),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: t('pages.employees.columns.actions'),
            align: 'right' as const,
            cell: (r: StaffRow) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={toggle.pending}
                aria-label={`${t(r.employee.active ? 'pages.employees.deactivate' : 'pages.employees.activate')}: ${r.employee.name}`}
                onClick={(ev) => {
                  ev.stopPropagation()
                  void setEmployeeActive(r.employee, !r.employee.active)
                }}
                onKeyDown={(ev) => ev.stopPropagation()}
              >
                <Power aria-hidden className="size-3.5" />
                {t(r.employee.active ? 'pages.employees.deactivate' : 'pages.employees.activate')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.employees.title')}
        description={t('pages.employees.subtitle')}
        actions={
          canEdit && data && section === 'staff' ? (
            <Button variant="primary" onClick={() => setDraft({ name: '', role: 'harvester', phone: '', email: '', active: true })}>
              <Plus aria-hidden className="size-4" />
              {t('pages.employees.new')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <>
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t('pages.employees.stats.active')}
              value={fmt.number(activeCount)}
              hint={t('pages.employees.stats.activeHint', { count: allRows.length - activeCount })}
              icon={<Users aria-hidden className="size-3.5" />}
            />
            <StatCard label={t('pages.employees.stats.harvest')} value={fmt.pounds(totalNet)} hint={t('pages.employees.stats.harvestHint', { count: totalFlushes })} icon={<Sprout aria-hidden className="size-3.5" />} />
            <StatCard label={t('pages.employees.stats.top')} value={top ? <span className="text-lg">{top.employee.name}</span> : '—'} hint={top ? fmt.pounds(top.harvest.net) : t('pages.employees.stats.none')} />
            <StatCard label={t('pages.employees.stats.members')} value={fmt.number(data.members.length)} icon={<ShieldCheck aria-hidden className="size-3.5" />} />
          </StatGrid>

          <SegmentedControl
            label={t('pages.employees.sections.label')}
            value={section}
            onChange={setSection}
            options={[
              { value: 'staff', label: t('pages.employees.sections.staff') },
              { value: 'members', label: t('pages.employees.sections.members') },
            ]}
            className="self-start"
          />

          {section === 'staff' ? (
            <Card>
              <Toolbar className="mb-3">
                <SearchInput value={query} onChange={setQuery} placeholder={t('pages.employees.searchPlaceholder')} />
                <FilterSelect label={t('pages.employees.filters.role')} value={role} onChange={setRole} options={STAFF_ROLES.map((r) => ({ value: r, label: t(`labels.staffRole.${r}`) }))} />
                <FilterSelect
                  label={t('pages.employees.filters.status')}
                  value={active}
                  onChange={setActive}
                  options={[
                    { value: 'active', label: t('labels.active') },
                    { value: 'inactive', label: t('labels.inactive') },
                  ]}
                />
              </Toolbar>
              <p className="mb-4 text-xs text-text-muted">{t('pages.employees.neverDeleted')}</p>
              <DataTable
                rows={rows}
                columns={columns}
                rowKey={(r) => r.employee.id}
                label={t('pages.employees.sections.staff')}
                onRowClick={canEdit ? (r) => setDraft({ ...r.employee }) : undefined}
                emptyTitle={allRows.length ? t('table.noMatches') : t('table.empty')}
                initialSort={{ key: 'name', dir: 'asc' }}
              />
            </Card>
          ) : (
            <>
              <MembersCard members={data.members} />
              <PermissionMatrix currentRole={user.role} />
            </>
          )}
        </>
      )}
      {draft && <EmployeeForm draft={draft} onClose={() => setDraft(null)} />}
    </PageShell>
  )
}

function MembersCard({ members }: { members: Member[] }) {
  const { t } = useI18n()
  const { user } = useSession()
  const setRole = useCommand('setMemberRole')
  const isOwner = user.role === 'OWNER'

  const columns: Column<Member>[] = [
    {
      key: 'member',
      header: t('pages.employees.members.columns.member'),
      cell: (m) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-text">{m.name}</span>
          {m.userId === user.id && <Badge tone="brand">{t('pages.employees.members.you')}</Badge>}
        </span>
      ),
      sort: (m) => m.name,
    },
    { key: 'email', header: t('pages.employees.members.columns.email'), cell: (m) => <span className="block max-w-64 truncate">{m.email}</span>, sort: (m) => m.email },
    {
      key: 'role',
      header: t('pages.employees.members.columns.role'),
      cell: (m) =>
        isOwner && m.userId !== user.id ? (
          <Select
            aria-label={t('pages.employees.members.roleFor', { name: m.name })}
            value={m.role}
            disabled={setRole.pending}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => void setRole.run([m.userId, e.target.value as Role], t('pages.employees.members.roleSaved'))}
            className="h-8 w-auto min-w-36 py-0 text-xs"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        ) : (
          <Badge>{t(`roles.${m.role}`)}</Badge>
        ),
      sort: (m) => ROLES.indexOf(m.role),
    },
  ]

  return (
    <Card labelledBy="members-title">
      <CardHeader id="members-title" title={t('pages.employees.members.title')} subtitle={isOwner ? t('pages.employees.members.subtitle') : t('pages.employees.members.ownerOnly')} />
      <DataTable rows={members} columns={columns} rowKey={(m) => m.userId} label={t('pages.employees.members.title')} initialSort={{ key: 'role', dir: 'asc' }} />
      <p className="mt-4 flex items-start gap-2 text-xs text-text-muted">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        {t('pages.employees.members.inviteHint')}
      </p>
    </Card>
  )
}

function PermissionMatrix({ currentRole }: { currentRole: Role }) {
  const { t } = useI18n()
  return (
    <Card labelledBy="matrix-title">
      <CardHeader id="matrix-title" title={t('pages.employees.matrix.title')} subtitle={t('pages.employees.matrix.subtitle')} />
      <div className="scrollbar-thin -mx-1 overflow-x-auto px-1" role="region" aria-labelledby="matrix-title" tabIndex={0}>
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-left text-[0.8125rem]">
          <thead>
            <tr>
              <th scope="col" className="eyebrow sticky left-0 z-[1] border-b border-border bg-surface-solid px-2 pb-2.5 font-semibold">
                {t('pages.employees.matrix.permission')}
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className={cn('eyebrow border-b border-border px-2 pb-2.5 text-center font-semibold', r === currentRole && 'text-brand-ink')}>
                  {t(`roles.${r}`)}
                  {r === currentRole && <span className="block text-[0.625rem] normal-case tracking-normal">({t('pages.employees.matrix.yourRole')})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <th scope="row" className="sticky left-0 z-[1] border-b border-border bg-surface-solid px-2 py-2 font-normal text-text">
                  {t(permissionKey(p))}
                </th>
                {ROLES.map((r) => {
                  const allowed = ROLE_PERMISSIONS[r].includes(p)
                  return (
                    <td key={r} className={cn('border-b border-border px-2 py-2 text-center', r === currentRole && 'bg-brand-soft/40')}>
                      {allowed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-text">
                          <Check aria-hidden className="size-3.5 text-ok" />
                          {t('pages.employees.matrix.yes')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <Minus aria-hidden className="size-3.5" />
                          <span className="sr-only">{t('pages.employees.matrix.no')}</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function EmployeeForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { t } = useI18n()
  const save = useCommand('saveEmployee')
  const [form, setForm] = useState(draft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim()
    const next: Record<string, string> = {}
    if (!name) next.name = t('pages.employees.errors.name')
    if (email && !EMAIL.test(email)) next.email = t('pages.employees.errors.email')
    setErrors(next)
    if (Object.keys(next).length) return
    const result = await save.run([{ ...form, name, email, phone: form.phone.trim() }], t('pages.employees.saved'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.id ? t('pages.employees.editTitle') : t('pages.employees.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="employee-form" disabled={save.pending}>
            {save.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.employees.fields.name')} error={errors.name}>
            {(p) => <TextInput {...p} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoComplete="name" />}
          </Field>
          <Field label={t('pages.employees.fields.role')}>
            {(p) => (
              <Select {...p} value={form.role} onChange={(e) => set('role', e.target.value as StaffRole)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`labels.staffRole.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.employees.fields.phone')} optional>
            {(p) => <TextInput {...p} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />}
          </Field>
          <Field label={t('pages.employees.fields.email')} error={errors.email} optional>
            {(p) => <TextInput {...p} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />}
          </Field>
        </FormGrid>
        <Checkbox label={t('pages.employees.fields.active')} checked={form.active} onChange={(e) => set('active', e.target.checked)} />
      </form>
    </Modal>
  )
}
