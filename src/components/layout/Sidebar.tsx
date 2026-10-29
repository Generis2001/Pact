import { cn } from '@/lib/utils'
import {
  Shield, GitBranch, Send, Clock, Lock, LayoutDashboard,
} from 'lucide-react'
import type { Tab } from '@/components/layout/Shell'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard className="size-4" /> },
  { id: 'escrow',      label: 'Escrow',       icon: <Shield className="size-4" /> },
  { id: 'conditional', label: 'Conditional',  icon: <GitBranch className="size-4" /> },
  { id: 'batch',       label: 'Batch Payout', icon: <Send className="size-4" /> },
  { id: 'scheduled',   label: 'Scheduled',    icon: <Clock className="size-4" /> },
  { id: 'vesting',     label: 'Vesting',      icon: <Lock className="size-4" /> },
]

export function Sidebar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <aside
      className="flex flex-col w-52 shrink-0 h-full py-5 px-3"
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-7">
        <div
          className="size-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 0 12px rgba(0,230,118,0.35)' }}
        >
          <span className="display text-xs font-black" style={{ color: 'var(--accent-fg)' }}>P</span>
        </div>
        <div>
          <span className="display text-sm font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Pact</span>
          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--muted)' }}>Programmable payments</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={cn(
              'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full',
              active === item.id
                ? 'text-[var(--accent)]'
                : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface)]'
            )}
            style={active === item.id ? { background: 'var(--accent-dim)' } : {}}
          >
            {/* Active indicator bar */}
            {active === item.id && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-4 px-2">
        <p className="text-[10px]" style={{ color: 'var(--subtle)' }}>Arc Mainnet · USDC</p>
      </div>
    </aside>
  )
}
