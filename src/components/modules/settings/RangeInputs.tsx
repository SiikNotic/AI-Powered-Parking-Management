import { useId } from 'react'
import { TextInput } from '@/components/ui/Form'
import { useI18n } from '@/i18n'
import type { RangeDraft } from './range'

/** Min/max pair for a target range, labelled as one group. */
export function RangeInputs({ label, value, onChange, error }: { label: string; value: RangeDraft; onChange: (v: RangeDraft) => void; error?: string }) {
  const { t } = useI18n()
  const id = useId()
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-xs font-semibold text-text-secondary">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(['min', 'max'] as const).map((k) => (
          <label key={k} className="flex min-w-0 items-center gap-2">
            <span className="w-8 shrink-0 text-[0.6875rem] text-text-muted">{t(`pages.settings.species.fields.${k}`)}</span>
            <TextInput inputMode="decimal" value={value[k]} aria-invalid={error ? true : undefined} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-crit-ink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
