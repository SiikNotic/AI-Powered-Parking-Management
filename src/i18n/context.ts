import { createContext, useContext } from 'react'
import en, { type Translations } from './locales/en'
import es from './locales/es'

export const locales = {
  en: { label: 'English', short: 'EN', intl: 'en-US', messages: en },
  es: { label: 'Español', short: 'ES', intl: 'es-US', messages: es },
} as const satisfies Record<string, { label: string; short: string; intl: string; messages: Translations }>

export type Locale = keyof typeof locales

/** Dotted paths to every leaf string, e.g. "dashboard.kpi.available". */
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type TranslationKey = Leaves<Translations>
export type TranslationParams = Record<string, string | number | undefined>

export interface I18nContextValue {
  locale: Locale
  intlLocale: string
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
}

export const LOCALE_STORAGE_KEY = 'mushroom-farm.locale'

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && stored in locales) return stored as Locale
  } catch {
    /* storage unavailable — fall through */
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function lookup(messages: Translations, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
