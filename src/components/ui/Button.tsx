import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<Variant, string> = {
  primary:   'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40',
  secondary: 'bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--border)] disabled:opacity-40',
  ghost:     'bg-transparent text-[var(--ink-2)] hover:bg-[var(--surface-muted)] disabled:opacity-40',
  danger:    'bg-[rgba(186,43,76,0.10)] text-[var(--danger)] hover:bg-[rgba(186,43,76,0.18)] disabled:opacity-40',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-5 py-3.5 text-sm rounded-2xl',
}

export function Button({
  children, variant = 'primary', size = 'md', loading = false,
  className, disabled, onClick, type = 'button',
}: {
  children: React.ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'hover:scale-[1.01] active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
        'disabled:cursor-not-allowed disabled:scale-100',
        variantStyles[variant], sizeStyles[size], className
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  )
}
