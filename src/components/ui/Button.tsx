import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<Variant, string> = {
  primary:   'text-[var(--accent-fg)] hover:opacity-90 disabled:opacity-40',
  secondary: 'bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)] disabled:opacity-40',
  ghost:     'bg-transparent text-[var(--ink-2)] hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40',
  danger:    'bg-[var(--danger-dim)] text-[var(--danger)] hover:opacity-80 disabled:opacity-40',
  outline:   'bg-transparent border border-[var(--border-strong)] text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-lg min-h-9',
  md: 'px-5 py-2.5 text-base rounded-xl min-h-11',
  lg: 'px-6 py-3.5 text-base rounded-xl min-h-14',
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
  const isPrimary = variant === 'primary'
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
        'disabled:cursor-not-allowed',
        variantStyles[variant], sizeStyles[size], className
      )}
      style={isPrimary ? {
        background: 'var(--accent)',
      } : {}}
    >
      {loading && <Loader2 className="size-3 animate-spin" />}
      {children}
    </button>
  )
}
