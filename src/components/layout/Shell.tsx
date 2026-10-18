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
import { ERC20_ABI, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from '@/lib/contracts'
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
    chainId: ARC_TESTNET_CHAIN_ID,
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
    <div className="min-h-dvh flex" style={{ background: 'var(--bg-gradient)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar active={tab} onNav={(t) => { setTab(t); setMobileOpen(false) }} />
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex flex-col" style={{ background: 'var(--surface-strong)' }}>
            <Sidebar active={tab} onNav={(t) => { setTab(t); setMobileOpen(false) }} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 py-3"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            className="md:hidden p-1.5 rounded-lg"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {address && balance !== undefined && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold tabular-nums"
                style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
              >
                <TokenUSDC variant="branded" size={16} />
                {formatUsdc(balance)} USDC
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
