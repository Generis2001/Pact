import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'muted'

const variants: Record<Variant, string> = {
  default:  'bg-[rgba(18,45,69,0.08)] text-[var(--ink)]',
  success:  'bg-[rgba(26,128,71,0.10)] text-[var(--success)]',
  warning:  'bg-[rgba(180,83,9,0.10)]  text-[var(--warning)]',
  danger:   'bg-[rgba(186,43,76,0.10)] text-[var(--danger)]',
  muted:    'bg-[var(--surface-muted)] text-[var(--muted)]',
}

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}
