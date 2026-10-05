import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'signature' | 'danger'
type Size = 'sm' | 'md'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-text-inverse hover:opacity-90',
  secondary: 'bg-surface-hover text-text border border-glass-border hover:border-border-strong hover:bg-surface-raised',
  ghost: 'text-text-secondary hover:text-text hover:bg-surface-hover',
  danger: 'bg-occupied text-white hover:brightness-110',
  signature: 'bg-signature text-white shadow-[0_6px_18px_-6px_rgba(236,79,143,0.55)] hover:brightness-105',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}

interface LinkButtonProps extends LinkProps {
  variant?: Variant
  size?: Size
}

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : undefined)} {...props} />
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, className, type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors',
        'hover:bg-surface-hover hover:text-text',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
