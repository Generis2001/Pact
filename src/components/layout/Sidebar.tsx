import { cn } from '@/lib/utils'
import { ShieldCheck, GitBranch, ArrowRight, Clock3, LockKeyhole, ChartPie } from 'lucide-react'
import { WalletButton } from '@/components/ui/WalletButton'
import type { Tab } from './Shell'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <ChartPie strokeWidth={1.7} /> },
  { id: 'escrow', label: 'Escrow', icon: <ShieldCheck strokeWidth={1.7} /> },
  { id: 'conditional', label: 'Conditional Payout', icon: <GitBranch strokeWidth={1.7} /> },
  { id: 'batch', label: 'Batch Payout', icon: <ArrowRight strokeWidth={1.7} /> },
  { id: 'scheduled', label: 'Scheduled Payout', icon: <Clock3 strokeWidth={1.7} /> },
  { id: 'vesting', label: 'Vesting', icon: <LockKeyhole strokeWidth={1.7} /> },
]
export function Sidebar({ active, onNav }: { active: Tab; onNav: (t: Tab) => void }) {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-[#f0f2f5] bg-white px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-black text-2xl font-medium text-white">P</span>
        <span className="display text-[32px] text-black">Pact</span>
      </div>
      <WalletButton className="mb-6 w-full" />
      <nav aria-label="Main navigation" className="flex flex-col gap-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNav(item.id)}
            aria-current={active === item.id ? 'page' : undefined}
            className={cn(
              'flex min-h-[54px] w-full items-center gap-4 rounded-xl px-4 text-left text-base font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
              active === item.id ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface)]',
            )}
          >
            <span className="nav-icon [&>svg]:size-[22px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <p className="mt-auto px-4 pb-2 pt-10 text-xs text-[var(--muted)]">Programmable payments on Arc</p>
    </aside>
  )
}
