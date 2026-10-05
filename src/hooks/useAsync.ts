import { useCallback, useEffect, useState, type DependencyList } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: Error }

export type AsyncResult<T> = AsyncState<T> & { retry: () => void }

/**
 * Runs an async service call whenever `deps` change and exposes its state.
 * Stale responses (from a previous location/period) are ignored.
 * Previous data is kept while reloading to avoid layout jumps.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: undefined, error: undefined })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ status: 'loading', data: prev.data, error: undefined }))
    fn().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data, error: undefined })
      },
      (error: unknown) => {
        if (!cancelled)
          setState((prev) => ({
            status: 'error',
            data: prev.data,
            error: error instanceof Error ? error : new Error(String(error)),
          }))
      },
    )
    return () => {
      cancelled = true
    }
    // `fn` is intentionally excluded: callers pass an inline function and control re-runs via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
