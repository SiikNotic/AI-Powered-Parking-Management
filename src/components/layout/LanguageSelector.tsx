import { Check, Languages } from 'lucide-react'
import { MenuItem, Popover } from '@/components/ui/Popover'
import { locales, useI18n, type Locale } from '@/i18n'
import { cn } from '@/lib/cn'

export function LanguageSelector() {
  const { t, locale, setLocale } = useI18n()

  return (
    <Popover
      label={t('topbar.language')}
      panelClassName="min-w-44"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${t('topbar.language')}: ${locales[locale].label}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
        >
          <Languages aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
          <span className="hidden sm:inline">{locales[locale].short}</span>
        </button>
      )}
    >
      {(close) =>
        (Object.keys(locales) as Locale[]).map((code) => (
          <MenuItem
            key={code}
            checked={code === locale}
            onSelect={() => {
              setLocale(code)
              close()
            }}
          >
            <span lang={code} className="flex-1">
              {locales[code].label}
            </span>
            <Check aria-hidden className={cn('size-4 text-brand', code !== locale && 'invisible')} />
          </MenuItem>
        ))
      }
    </Popover>
  )
}
