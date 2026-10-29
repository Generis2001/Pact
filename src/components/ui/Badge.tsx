import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const variants: Record<Variant, { bg: string; color: string; dot: string }> = {
  default: { bg: 'var(--surface)',        color: 'var(--ink-2)',    dot: 'var(--muted)' },
  success: { bg: 'var(--success-dim)',    color: 'var(--success)',  dot: 'var(--success)' },
  warning: { bg: 'var(--warning-dim)',    color: 'var(--warning)',  dot: 'var(--warning)' },
  danger:  { bg: 'var(--danger-dim)',     color: 'var(--danger)',   dot: 'var(--danger)' },
  info:    { bg: 'var(--info-dim)',       color: 'var(--info)',     dot: 'var(--info)' },
  muted:   { bg: 'var(--surface-muted)', color: 'var(--muted)',    dot: 'var(--subtle)' },
}

export function Badge({ children, variant = 'default', dot = false, className }: {
  children: React.ReactNode
  variant?: Variant
  dot?: boolean
  className?: string
}) {
  const v = variants[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className
      )}
      style={{ background: v.bg, color: v.color }}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ background: v.dot }}
        />
      )}
      {children}
    </span>
  )
}
