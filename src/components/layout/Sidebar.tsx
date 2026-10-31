import { cn } from '@/lib/utils'
import { ShieldCheck, GitBranch, ArrowRight, Clock3, LockKeyhole, ChartPie, History } from 'lucide-react'
import { WalletButton } from '@/components/ui/WalletButton'
import { PactLogo } from '@/components/ui/PactLogo'
import type { Tab } from './Shell'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <ChartPie strokeWidth={1.7} /> },
  { id: 'escrow', label: 'Escrow', icon: <ShieldCheck strokeWidth={1.7} /> },
  { id: 'conditional', label: 'Conditional Payout', icon: <GitBranch strokeWidth={1.7} /> },
  { id: 'batch', label: 'Batch Payout', icon: <ArrowRight strokeWidth={1.7} /> },
  { id: 'scheduled', label: 'Scheduled Payout', icon: <Clock3 strokeWidth={1.7} /> },
  { id: 'vesting', label: 'Vesting', icon: <LockKeyhole strokeWidth={1.7} /> },
  { id: 'history', label: 'Transaction History', icon: <History strokeWidth={1.7} /> },
]
export function Sidebar({ active, onNav, connected }: { active: Tab; onNav: (t: Tab) => void; connected: boolean }) {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-[#f0f2f5] bg-white px-4 py-6">
      <div className="mb-8 flex items-center px-3">
        <PactLogo className="h-[52px] w-auto" />
      </div>
      <WalletButton className="mb-6 w-full" />
      <nav aria-label="Main navigation" className="flex flex-col gap-2">
        {NAV.filter((item) => item.id !== 'history' || connected).map((item) => (
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
