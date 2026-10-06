import { Download } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { dateInputRange, toDateInput } from '@/components/modules/expenses/periods'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Form'
import { addDays } from '@/domain/time'
import { useFormat } from '@/hooks/useFormat'
import { useI18n } from '@/i18n'
import { downloadCsv } from '@/lib/csv'
import type { DateRange } from '@/types'

export type Cell = string | number
export interface ReportTable {
  header: string[]
  rows: Cell[][]
  summary?: string
}

interface ReportCardProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  /** `asOf` reports (stock valuation) only use the end date. */
  mode?: 'range' | 'asOf'
  filename: string
  build: (range: DateRange) => ReportTable
  /** Extra controls next to the dates (e.g. a view switch). */
  controls?: ReactNode
}

const PREVIEW_ROWS = 5

/** One exportable report: date range, row count, preview and CSV download. */
export function ReportCard({ id, title, description, icon, mode = 'range', filename, build, controls }: ReportCardProps) {
  const { t } = useI18n()
  const fmt = useFormat()
  const [today] = useState(() => toDateInput(new Date()))
  const [from, setFrom] = useState(() => toDateInput(addDays(new Date(), -29)))
  const [to, setTo] = useState(today)
  const invalid = !to || (mode === 'range' && (!from || from > to))
  const table = invalid ? null : build(dateInputRange(mode === 'asOf' ? '1970-01-01' : from, to))
  const count = table?.rows.length ?? 0

  const download = () => {
    if (!table) return
    downloadCsv(`${filename}-${mode === 'range' ? `${from}-` : ''}${to}.csv`, table.header, table.rows)
  }

  return (
    <Card labelledBy={id} className="flex flex-col">
      <CardHeader id={id} title={title} subtitle={description} icon={icon} />
      <div className="flex flex-wrap items-end gap-3">
        {mode === 'range' && (
          <Field label={t('pages.reports.from')} className="w-[calc(50%-0.375rem)] sm:w-40">
            {(p) => <TextInput {...p} type="date" max={to || today} value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={invalid || undefined} />}
          </Field>
        )}
        <Field label={mode === 'asOf' ? t('pages.reports.asOf') : t('pages.reports.to')} className="w-[calc(50%-0.375rem)] sm:w-40">
          {(p) => <TextInput {...p} type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={invalid || undefined} />}
        </Field>
        {controls}
      </div>
      {invalid && (
        <p role="alert" className="mt-2 text-xs font-medium text-crit-ink">
          {t('pages.reports.invalidRange')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted" aria-live="polite">
          <span className="font-semibold text-text-secondary">{t('pages.reports.rows', { count: fmt.number(count) })}</span>
          {table?.summary && <span> · {table.summary}</span>}
        </p>
        <Button size="sm" variant="primary" onClick={download} disabled={!count}>
          <Download aria-hidden className="size-3.5" />
          {t('pages.reports.download')}
        </Button>
      </div>

      <div className="mt-3 flex-1">
        {table && count > 0 ? (
          <>
            <div className="scrollbar-thin tile max-w-full overflow-x-auto rounded-xl" role="region" tabIndex={0} aria-label={t('pages.reports.previewLabel', { report: title, count: Math.min(PREVIEW_ROWS, count) })}>
              <table className="w-full border-separate border-spacing-0 text-left text-[0.75rem]">
                <thead>
                  <tr>
                    {table.header.map((h) => (
                      <th key={h} scope="col" className="whitespace-nowrap border-b border-border px-2.5 py-2 font-semibold text-text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className={`max-w-56 truncate whitespace-nowrap px-2.5 py-1.5 text-text-secondary ${typeof cell === 'number' ? 'tabular text-right' : ''} ${i < Math.min(PREVIEW_ROWS, count) - 1 ? 'border-b border-border' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {count > PREVIEW_ROWS && <p className="mt-2 text-[0.6875rem] text-text-muted">{t('pages.reports.previewMore')}</p>}
          </>
        ) : (
          !invalid && <p className="tile rounded-xl px-3 py-6 text-center text-xs text-text-muted">{t('pages.reports.empty')}</p>
        )}
      </div>
    </Card>
  )
}
