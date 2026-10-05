import { cn } from '@/lib/cn'

interface AvatarProps {
  name: string
  className?: string
}

/** Initials avatar — replaced by the profile photo once Supabase Storage is connected. */
export function Avatar({ name, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-[0.6875rem] font-semibold text-brand-ink ring-2 ring-surface-raised',
        className,
      )}
    >
      {initials}
    </span>
  )
}
