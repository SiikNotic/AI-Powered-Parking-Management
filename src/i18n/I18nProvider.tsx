import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectLocale, I18nContext, interpolate, locales, LOCALE_STORAGE_KEY, lookup, type I18nContextValue, type Locale } from './context'
import en from './locales/en'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const { messages, intl } = locales[locale]
    return {
      locale,
      intlLocale: intl,
      setLocale,
      t: (key, params) => interpolate(lookup(messages, key) ?? lookup(en, key) ?? key, params),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
