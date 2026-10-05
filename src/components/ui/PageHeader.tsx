import type { ReactNode } from 'react'

interface PageHeaderProps {
  description: string
  actions?: ReactNode
  children?: ReactNode
}

/** Intro line + primary actions + an optional filter row, under the topbar title. */
export function PageHeader({ description, actions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-secondary">{description}</p>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** Standard page wrapper (matches the dashboard gutters). */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
}
