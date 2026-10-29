'use client'
import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Sidebar } from './Sidebar'
import { Dashboard } from '@/components/features/Dashboard'
import { EscrowPanel } from '@/components/features/EscrowPanel'
import { ConditionalPanel } from '@/components/features/ConditionalPanel'
import { BatchPanel } from '@/components/features/BatchPanel'
import { ScheduledPanel } from '@/components/features/ScheduledPanel'
import { VestingPanel } from '@/components/features/VestingPanel'
import { TokenUSDC } from '@web3icons/react'
import { Menu, X } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { ERC20_ABI, USDC_ADDRESS, ARC_CHAIN_ID } from '@/lib/contracts'
import { formatUsdc } from '@/lib/utils'

export type Tab = 'dashboard' | 'escrow' | 'conditional' | 'batch' | 'scheduled' | 'vesting'

export function Shell() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { address } = useAccount()

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  const PANELS: Record<Tab, React.ReactNode> = {
    dashboard:   <Dashboard onNav={setTab} />,
    escrow:      <EscrowPanel />,
    conditional: <ConditionalPanel />,
    batch:       <BatchPanel />,
    scheduled:   <ScheduledPanel />,
    vesting:     <VestingPanel />,
  }

  return (
    <div className="min-h-dvh flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex min-h-dvh sticky top-0">
        <Sidebar active={tab} onNav={(t) => { setTab(t); setMobileOpen(false) }} />
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex flex-col min-h-dvh">
            <Sidebar active={tab} onNav={(t) => { setTab(t); setMobileOpen(false) }} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 py-3"
          style={{
            background: 'rgba(13,15,18,0.80)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Mobile menu */}
          <button
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ink-2)' }}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Mobile logo */}
          <span className="display text-sm font-bold md:hidden" style={{ color: 'var(--ink)' }}>Pact</span>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Balance chip */}
            {address && balance !== undefined && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold mono"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              >
                <TokenUSDC variant="branded" size={15} />
                <span style={{ color: 'var(--accent)' }}>{formatUsdc(balance)}</span>
                <span style={{ color: 'var(--muted)', fontSize: '11px', fontFamily: 'inherit' }}>USDC</span>
              </div>
            )}
            <ConnectKitButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {PANELS[tab]}
        </main>
      </div>
    </div>
  )
}
