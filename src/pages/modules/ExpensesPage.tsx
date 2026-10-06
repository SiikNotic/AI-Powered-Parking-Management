import { Download, Lock, Plus, Receipt, Undo2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { financeRange, toDateInput, type FinancePeriod } from '@/components/modules/expenses/periods'
import { Delta } from '@/components/dashboard/shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FormGrid, Select, Textarea, TextInput } from '@/components/ui/Form'
import { HorizontalBars } from '@/components/ui/HorizontalBars'
import { Modal } from '@/components/ui/Modal'
import { PageHeader, PageShell } from '@/components/ui/PageHeader'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { FilterSelect, SearchInput, Toolbar } from '@/components/ui/Toolbar'
import { useSession } from '@/context/session'
import { INVENTORY_PURCHASE_CATEGORIES, isInventoryPurchase } from '@/domain/finance'
import { inRange, previousRange } from '@/domain/time'
import { useCommand } from '@/hooks/useCommand'
import { useFarmData } from '@/hooks/useFarmData'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { downloadCsv } from '@/lib/csv'
import { toNumber } from '@/lib/number'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types'

const CATEGORIES: ExpenseCategory[] = ['substrate', 'spawn', 'electricity', 'water', 'rent', 'labor', 'packaging', 'transportation', 'equipment', 'maintenance', 'marketing', 'insurance', 'other']
const PAYMENT_METHODS: PaymentMethod[] = ['card', 'cash', 'transfer', 'invoice']
const PERIODS: FinancePeriod[] = ['thisMonth', 'lastMonth', '30d', '90d', 'thisYear', 'all']

const sum = (list: Expense[]) => list.reduce((s, e) => s + e.amount, 0)

export function ExpensesPage() {
  const { t } = useI18n()
  const fmt = useFormat()
  const { can } = useSession()
  const { data, status, retry } = useFarmData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [period, setPeriod] = useState<FinancePeriod>('30d')
  const [adding, setAdding] = useState(false)
  const [correcting, setCorrecting] = useState<Expense | null>(null)
  // Finance roles (owner, manager, accounting) read and write expenses — same as RLS.
  const allowed = can('finance.view')

  const range = useMemo(() => financeRange(period), [period])
  const expenses = useMemo(() => data?.expenses ?? [], [data])
  const correctedIds = useMemo(() => new Set(expenses.flatMap((e) => (e.correctsId ? [e.correctsId] : []))), [expenses])
  const inPeriod = useMemo(() => (range ? expenses.filter((e) => inRange(e.date, range)) : expenses), [expenses, range])
  const previous = useMemo(() => {
    if (!range) return null
    const prev = previousRange(range)
    return expenses.filter((e) => inRange(e.date, prev))
  }, [expenses, range])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inPeriod.filter((e) => (!category || e.category === category) && (!q || e.description.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q)))
  }, [inPeriod, query, category])

  const byCategory = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>()
    for (const e of inPeriod) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
    return [...totals.entries()].filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1])
  }, [inPeriod])

  if (!allowed) {
    return (
      <PageShell>
        <PageHeader title={t('pages.expenses.title')} />
        <Card>
          <EmptyState icon={Lock} title={t('pages.expenses.noAccess.title')} description={t('pages.expenses.noAccess.description')} />
        </Card>
      </PageShell>
    )
  }
  if (status === 'error' && !data) return <ErrorState onRetry={retry} />

  const total = sum(inPeriod)
  const inventory = sum(inPeriod.filter(isInventoryPurchase))
  const operating = total - inventory
  const largest = byCategory[0]
  const periodLabel = t(`pages.expenses.periods.${period}`)
  const categoryLabel = (c: ExpenseCategory) => t(`labels.expenseCategory.${c}`)

  const exportCsv = () => {
    downloadCsv(
      `${t('pages.expenses.csv.filename')}-${toDateInput(new Date())}.csv`,
      [
        t('pages.expenses.columns.date'),
        t('pages.expenses.columns.category'),
        t('pages.expenses.csv.type'),
        t('pages.expenses.columns.description'),
        t('pages.expenses.columns.vendor'),
        t('pages.expenses.columns.payment'),
        t('pages.expenses.columns.amount'),
        t('pages.expenses.csv.correctionOf'),
      ],
      [...rows]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => [
          toDateInput(new Date(e.date)),
          categoryLabel(e.category),
          isInventoryPurchase(e) ? t('pages.expenses.csv.inventory') : t('pages.expenses.csv.operating'),
          e.description,
          e.vendor,
          t(`labels.paymentMethod.${e.paymentMethod}`),
          e.amount.toFixed(2),
          e.correctsId ?? '',
        ]),
    )
  }

  const describe = (e: Expense) => (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="min-w-0 truncate font-medium text-text">{e.description}</span>
      {e.correctsId && (
        <Badge tone="warning" icon={<Undo2 aria-hidden className="size-3" />}>
          {t('pages.expenses.correction')}
        </Badge>
      )}
      {correctedIds.has(e.id) && <Badge tone="offline">{t('pages.expenses.corrected')}</Badge>}
    </span>
  )

  const columns: Column<Expense>[] = [
    { key: 'date', header: t('pages.expenses.columns.date'), cell: (e) => <span className="whitespace-nowrap">{fmt.dayMonth(e.date)}</span>, sort: (e) => e.date },
    { key: 'description', header: t('pages.expenses.columns.description'), cell: describe, sort: (e) => e.description, className: 'max-w-[22rem]', hideOnMobile: true },
    { key: 'category', header: t('pages.expenses.columns.category'), cell: (e) => <Badge tone={isInventoryPurchase(e) ? 'info' : 'neutral'}>{categoryLabel(e.category)}</Badge>, sort: (e) => categoryLabel(e.category) },
    { key: 'vendor', header: t('pages.expenses.columns.vendor'), cell: (e) => e.vendor || '—', sort: (e) => e.vendor },
    { key: 'payment', header: t('pages.expenses.columns.payment'), cell: (e) => t(`labels.paymentMethod.${e.paymentMethod}`), hideOnMobile: true },
    {
      key: 'amount',
      header: t('pages.expenses.columns.amount'),
      align: 'right',
      cell: (e) => <span className={e.amount < 0 ? 'font-semibold text-warn-ink' : 'font-semibold text-text'}>{fmt.exactCurrency(e.amount)}</span>,
      sort: (e) => e.amount,
    },
    {
      key: 'actions',
      header: t('table.actions'),
      align: 'right',
      cell: (e) =>
        !e.correctsId && !correctedIds.has(e.id) ? (
          <Button size="sm" variant="ghost" onClick={() => setCorrecting(e)} aria-label={`${t('pages.expenses.correct')}: ${e.description}`}>
            <Undo2 aria-hidden className="size-3.5" />
            {t('pages.expenses.correct')}
          </Button>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={t('pages.expenses.title')}
        description={t('pages.expenses.subtitle')}
        actions={
          data ? (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus aria-hidden className="size-4" />
              {t('pages.expenses.add')}
            </Button>
          ) : undefined
        }
      />
      {!data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-card" />
        </>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t('pages.expenses.stats.total')}
              value={fmt.currency(total)}
              icon={<Receipt aria-hidden className="size-3.5" />}
              hint={previous ? <Delta current={total} previous={sum(previous)} inverse /> : t('pages.expenses.stats.allTime')}
            />
            <StatCard label={t('pages.expenses.stats.operating')} value={fmt.currency(operating)} hint={t('pages.expenses.stats.operatingHint')} />
            <StatCard label={t('pages.expenses.stats.inventory')} value={fmt.currency(inventory)} hint={t('pages.expenses.stats.inventoryHint')} />
            <StatCard label={t('pages.expenses.stats.largest')} value={largest ? categoryLabel(largest[0]) : '—'} hint={largest ? fmt.currency(largest[1]) : undefined} />
          </StatGrid>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card labelledBy="expenses-list">
              <CardHeader
                id="expenses-list"
                title={t('pages.expenses.listTitle')}
                subtitle={t('pages.expenses.count', { count: fmt.number(rows.length) })}
                action={
                  <Button size="sm" onClick={exportCsv} disabled={!rows.length}>
                    <Download aria-hidden className="size-3.5" />
                    {t('table.exportCsv')}
                  </Button>
                }
              />
              <Toolbar className="mb-4">
                <SearchInput value={query} onChange={setQuery} placeholder={t('pages.expenses.searchPlaceholder')} />
                <FilterSelect label={t('pages.expenses.category')} value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))} />
                <div className="w-full sm:w-auto sm:min-w-44">
                  <Select aria-label={t('pages.expenses.period')} value={period} onChange={(e) => setPeriod(e.target.value as FinancePeriod)}>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {t(`pages.expenses.periods.${p}`)}
                      </option>
                    ))}
                  </Select>
                </div>
              </Toolbar>
              <DataTable
                rows={rows}
                columns={columns}
                rowKey={(e) => e.id}
                label={t('pages.expenses.listTitle')}
                mobileTitle={(e) => (
                  <span className="flex items-start justify-between gap-2">
                    {describe(e)}
                    <span className="shrink-0 text-xs font-normal text-text-muted">{fmt.dayMonth(e.date)}</span>
                  </span>
                )}
                emptyTitle={expenses.length ? t('table.noMatches') : t('table.empty')}
                initialSort={{ key: 'date', dir: 'desc' }}
              />
            </Card>
            <Card labelledBy="expenses-breakdown" className="self-start">
              <CardHeader id="expenses-breakdown" title={t('pages.expenses.breakdown.title')} subtitle={t('pages.expenses.breakdown.subtitle', { period: periodLabel })} />
              {byCategory.length ? (
                <HorizontalBars
                  label={t('pages.expenses.breakdown.title')}
                  barClassName="bg-accent"
                  items={byCategory.map(([c, v]) => ({
                    key: c,
                    label: INVENTORY_PURCHASE_CATEGORIES.includes(c) ? t('pages.expenses.breakdown.inventoryTag', { category: categoryLabel(c) }) : categoryLabel(c),
                    value: v,
                    formatted: fmt.currency(v),
                  }))}
                />
              ) : (
                <EmptyState title={t('pages.expenses.breakdown.empty')} />
              )}
            </Card>
          </div>
        </>
      )}
      {adding && data && <ExpenseForm onClose={() => setAdding(false)} />}
      {correcting && <CorrectionForm expense={correcting} onClose={() => setCorrecting(null)} />}
    </PageShell>
  )
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { data } = useFarmData()
  const add = useCommand('addExpense')
  const [today] = useState(() => toDateInput(new Date()))
  const [form, setForm] = useState({ date: today, category: 'electricity' as ExpenseCategory, description: '', amount: '', supplierId: '', vendor: '', paymentMethod: 'card' as PaymentMethod })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))
  const suppliers = data?.suppliers ?? []

  const chooseSupplier = (id: string) => {
    const supplier = suppliers.find((s) => s.id === id)
    setForm((f) => ({ ...f, supplierId: id, vendor: supplier ? supplier.name : '' }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = toNumber(form.amount)
    const next: Record<string, string> = {}
    if (!form.date || form.date > today) next.date = t('pages.expenses.errors.date')
    if (!form.description.trim()) next.description = t('pages.expenses.errors.description')
    if (!(amount > 0)) next.amount = t('pages.expenses.errors.amount')
    if (!form.vendor.trim()) next.vendor = t('pages.expenses.errors.vendor')
    setErrors(next)
    if (Object.keys(next).length) return
    // Today keeps the current time; past days are stored at local noon so they never shift a day.
    const date = form.date === today ? new Date().toISOString() : new Date(`${form.date}T12:00:00`).toISOString()
    const result = await add.run(
      [{ date, category: form.category, description: form.description.trim(), amount: Math.round(amount * 100) / 100, vendor: form.vendor.trim(), paymentMethod: form.paymentMethod, supplierId: form.supplierId || null }],
      t('pages.expenses.saved'),
    )
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pages.expenses.addTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="expense-form" disabled={add.pending}>
            {add.pending ? t('form.saving') : t('form.save')}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} noValidate className="space-y-4">
        <FormGrid>
          <Field label={t('pages.expenses.fields.date')} error={errors.date}>
            {(p) => <TextInput {...p} type="date" max={today} value={form.date} onChange={(e) => set('date', e.target.value)} />}
          </Field>
          <Field label={t('pages.expenses.fields.category')}>
            {(p) => (
              <Select {...p} value={form.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`labels.expenseCategory.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.expenses.fields.description')} error={errors.description} className="sm:col-span-2">
            {(p) => <TextInput {...p} value={form.description} maxLength={200} onChange={(e) => set('description', e.target.value)} />}
          </Field>
          <Field label={t('pages.expenses.fields.amount')} error={errors.amount}>
            {(p) => <TextInput {...p} inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} />}
          </Field>
          <Field label={t('pages.expenses.fields.paymentMethod')}>
            {(p) => (
              <Select {...p} value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`labels.paymentMethod.${m}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.expenses.fields.supplier')} optional>
            {(p) => (
              <Select {...p} value={form.supplierId} onChange={(e) => chooseSupplier(e.target.value)}>
                <option value="">{t('pages.expenses.fields.noSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('pages.expenses.fields.vendor')} error={errors.vendor} hint={form.supplierId ? t('pages.expenses.fields.vendorHint') : undefined}>
            {(p) => <TextInput {...p} value={form.vendor} readOnly={Boolean(form.supplierId)} maxLength={120} onChange={(e) => set('vendor', e.target.value)} />}
          </Field>
        </FormGrid>
        {INVENTORY_PURCHASE_CATEGORIES.includes(form.category) && <p className="tile rounded-xl px-3 py-2 text-xs text-text-secondary">{t('pages.expenses.inventoryNote')}</p>}
      </form>
    </Modal>
  )
}

function CorrectionForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const { t } = useI18n()
  const fmt = useFormat()
  const correct = useCommand('correctExpense')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError(t('pages.expenses.errors.reason'))
      return
    }
    setError(undefined)
    const result = await correct.run([expense.id, reason.trim()], t('pages.expenses.correctedToast'))
    if (result.ok) onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t('pages.expenses.correctTitle')}
      description={t('pages.expenses.correctExplain')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="correct-expense-form" disabled={correct.pending}>
            {correct.pending ? t('form.saving') : t('pages.expenses.correctSubmit')}
          </Button>
        </>
      }
    >
      <form id="correct-expense-form" onSubmit={submit} noValidate className="space-y-4">
        <dl className="tile grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl p-3 text-sm">
          <div className="col-span-2 min-w-0">
            <dt className="text-[0.6875rem] text-text-muted">{t('pages.expenses.columns.description')}</dt>
            <dd className="truncate font-medium text-text">{expense.description}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[0.6875rem] text-text-muted">{t('pages.expenses.columns.date')}</dt>
            <dd className="text-text-secondary">{fmt.dayMonth(expense.date)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[0.6875rem] text-text-muted">{t('pages.expenses.columns.amount')}</dt>
            <dd className="tabular text-text-secondary">
              {fmt.exactCurrency(expense.amount)} → {fmt.exactCurrency(-expense.amount)}
            </dd>
          </div>
        </dl>
        <Field label={t('form.reason')} error={error} hint={t('pages.expenses.correctReasonHint')}>
          {(p) => <Textarea {...p} value={reason} maxLength={200} onChange={(e) => (setReason(e.target.value), setError(undefined))} />}
        </Field>
      </form>
    </Modal>
  )
}
