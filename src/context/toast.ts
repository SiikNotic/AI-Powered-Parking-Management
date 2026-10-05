import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
