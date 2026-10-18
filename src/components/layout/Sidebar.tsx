import { cn } from '@/lib/utils'
import {
  Shield, GitBranch, Send, Clock, Lock, LayoutDashboard,
} from 'lucide-react'
import type { Tab } from '@/components/layout/Shell'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: <LayoutDashboard className="size-4" /> },
  { id: 'escrow',     label: 'Escrow',       icon: <Shield className="size-4" /> },
  { id: 'conditional', label: 'Conditional', icon: <GitBranch className="size-4" /> },
  { id: 'batch',      label: 'Batch Payout', icon: <Send className="size-4" /> },
  { id: 'scheduled',  label: 'Scheduled',    icon: <Clock className="size-4" /> },
  { id: 'vesting',    label: 'Vesting',      icon: <Lock className="size-4" /> },
]

export function Sidebar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <aside className="flex flex-col w-56 shrink-0 gap-1 py-6 px-3">
      <div className="mb-6 px-2">
        <span className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>Pact</span>
        <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>Programmable payments</p>
      </div>

      {NAV.map((item) => (
        <button
          key={item.id}
          onClick={() => onNav(item.id)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left',
            active === item.id
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--ink-2)] hover:bg-[var(--surface-muted)]'
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </aside>
  )
}
