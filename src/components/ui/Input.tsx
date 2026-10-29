import { cn } from '@/lib/utils'

export function Input({
  label, value, onChange, placeholder, type = 'text', error, hint,
  disabled, className, inputMode,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors',
          'placeholder:text-[var(--subtle)] disabled:opacity-50',
          error
            ? 'border-[var(--danger)] focus:border-[var(--danger)]'
            : 'border-[var(--border)] focus:border-[var(--accent)]',
        )}
        style={{ background: 'var(--bg-overlay)', color: 'var(--ink)' }}
      />
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--subtle)' }}>{hint}</p>}
    </div>
  )
}

export function Textarea({
  label, value, onChange, placeholder, rows = 3, error, disabled, className,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  error?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors resize-none',
          'placeholder:text-[var(--subtle)] disabled:opacity-50',
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--accent)]',
        )}
        style={{ background: 'var(--bg-overlay)', color: 'var(--ink)' }}
      />
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
