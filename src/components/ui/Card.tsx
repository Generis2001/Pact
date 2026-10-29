import { cn } from '@/lib/utils'

export function Card({ children, className, onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn('rounded-2xl p-5', className, onClick && 'cursor-pointer')}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={onClick ? (e) => { (e.currentTarget).style.borderColor = 'var(--border-strong)' } : undefined}
      onMouseLeave={onClick ? (e) => { (e.currentTarget).style.borderColor = 'var(--border)' } : undefined}
    >
      {children}
    </div>
  )
}

/** Slightly elevated inner section, e.g. inside a Card */
export function InnerCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-xl p-4', className)}
      style={{
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}

/** Section label — small uppercase muted */
export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}

/** Stat metric inside a card */
export function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
      <span
        className="display text-2xl font-bold tabular-nums"
        style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}
      >
        {value}
      </span>
    </div>
  )
}
