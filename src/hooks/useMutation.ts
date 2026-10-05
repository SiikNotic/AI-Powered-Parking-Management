import { useCallback, useState } from 'react'
import { useToast } from '@/context/toast'
import { useI18n, type TranslationKey } from '@/i18n'
import { ServiceError } from '@/services'

/** Translated message for any error thrown by a service. */
export function useErrorMessage() {
  const { t } = useI18n()
  return useCallback(
    (error: unknown) => (error instanceof ServiceError ? t(`errors.${error.code}` as TranslationKey) : t('errors.generic')),
    [t],
  )
}

/**
 * Runs a write operation with a pending flag, shows a success toast and
 * turns service errors into translated messages.
 */
export function useMutation<Args extends unknown[], R>(action: (...args: Args) => Promise<R>) {
  const toast = useToast()
  const message = useErrorMessage()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (args: Args, successMessage?: string): Promise<R | undefined> => {
      setPending(true)
      setError(null)
      try {
        const result = await action(...args)
        if (successMessage) toast.show(successMessage)
        return result
      } catch (err) {
        const text = message(err)
        setError(text)
        toast.show(text, 'error')
        return undefined
      } finally {
        setPending(false)
      }
    },
    [action, message, toast],
  )

  return { run, pending, error, clearError: () => setError(null) }
}
