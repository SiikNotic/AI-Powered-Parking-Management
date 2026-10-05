import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { useTheme } from '@/context/theme'
import { useI18n } from '@/i18n'

export function ThemeToggle() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')
  return (
    <IconButton label={t('topbar.theme.toggle', { mode: next.toLowerCase() })} onClick={toggleTheme}>
      {theme === 'dark' ? (
        <Sun aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
      ) : (
        <Moon aria-hidden className="size-[1.125rem]" strokeWidth={1.9} />
      )}
    </IconButton>
  )
}
