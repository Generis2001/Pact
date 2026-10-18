import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-3xl p-5', className)}
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(18,45,69,0.10)',
        boxShadow: '0 1px 3px rgba(18,45,69,0.06), 0 4px 16px rgba(18,45,69,0.04)',
      }}
    >
      {children}
    </div>
  )
}

export function InnerCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-2xl p-4', className)}
      style={{
        background: 'rgba(255,255,255,0.60)',
        border: '1px solid rgba(18,45,69,0.08)',
      }}
    >
      {children}
    </div>
  )
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}
