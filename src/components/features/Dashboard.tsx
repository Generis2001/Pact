import { useAccount, useReadContract } from 'wagmi'
import { Card, CardLabel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Shield, GitBranch, Send, Clock, Lock, ArrowRight, Zap, Globe } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import type { Tab } from '@/components/layout/Shell'
import { CONTRACT_ADDRESSES, ERC20_ABI, USDC_ADDRESS, ARC_CHAIN_ID } from '@/lib/contracts'
import { formatUsdc } from '@/lib/utils'

const MODULES = [
  {
    id: 'escrow' as Tab,
    icon: <Shield className="size-5" />,
    label: 'Escrow',
    desc: 'Lock USDC until conditions are met. Milestones, approvals, and dispute resolution.',
    accent: '#38bdf8',
    accentDim: 'rgba(56,189,248,0.08)',
  },
  {
    id: 'conditional' as Tab,
    icon: <GitBranch className="size-5" />,
    label: 'Conditional Payout',
    desc: 'Release funds when an authorized oracle or approver confirms a condition.',
    accent: '#a78bfa',
    accentDim: 'rgba(167,139,250,0.08)',
  },
  {
    id: 'batch' as Tab,
    icon: <Send className="size-5" />,
    label: 'Batch Payout',
    desc: 'Send USDC to hundreds of recipients in one transaction with CSV import.',
    accent: '#00e676',
    accentDim: 'rgba(0,230,118,0.08)',
  },
  {
    id: 'scheduled' as Tab,
    icon: <Clock className="size-5" />,
    label: 'Scheduled Payout',
    desc: 'Daily, weekly, or monthly recurring USDC payments with funding pools.',
    accent: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.08)',
  },
  {
    id: 'vesting' as Tab,
    icon: <Lock className="size-5" />,
    label: 'Vesting',
    desc: 'Linear, cliff, or periodic USDC vesting schedules with optional revocation.',
    accent: '#f4506c',
    accentDim: 'rgba(244,80,108,0.08)',
  },
]

const anyDeployed = Object.values(CONTRACT_ADDRESSES).some((a) => a && a.length > 2)

export function Dashboard({ onNav }: { onNav: (t: Tab) => void }) {
  const { address, isConnected } = useAccount()

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header row ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Programmable, non-custodial USDC payments on Arc
          </p>
        </div>
        <Badge variant="success" dot>Arc Mainnet</Badge>
      </div>

      {/* ── Stat strip ───────────────────────────────────────── */}
      {isConnected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Wallet Balance',
              value: balance !== undefined ? `${formatUsdc(balance)} USDC` : '—',
              icon: <TokenUSDC variant="branded" size={16} />,
              accent: true,
            },
            { label: 'Chain', value: 'Arc', icon: <Globe className="size-4" style={{ color: 'var(--muted)' }} />, accent: false },
            { label: 'Gas Token', value: 'USDC', icon: <Zap className="size-4" style={{ color: 'var(--warning)' }} />, accent: false },
            { label: 'Finality', value: '< 1s', icon: <Zap className="size-4" style={{ color: 'var(--accent)' }} />, accent: false },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3 flex flex-col gap-1"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-1.5">
                {s.icon}
                <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>{s.label}</span>
              </div>
              <span
                className="display text-lg font-bold tabular-nums"
                style={{ color: s.accent ? 'var(--accent)' : 'var(--ink)' }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Deployment notice ────────────────────────────────── */}
      {!anyDeployed && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.22)' }}
        >
          <Zap className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contracts not yet deployed</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
              Run the deploy commands (see <span className="mono">docs/deploy.md</span>) and set the{' '}
              <span className="mono">VITE_*</span> environment variables.
            </p>
          </div>
        </div>
      )}

      {/* ── Module grid ──────────────────────────────────────── */}
      <div>
        <CardLabel>Modules</CardLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onNav(m.id)}
              className="text-left group rounded-2xl transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = m.accent }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="size-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: m.accentDim, color: m.accent }}
                  >
                    {m.icon}
                  </div>
                  <ArrowRight
                    className="size-3.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: m.accent }}
                  />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{m.label}</h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Network details ──────────────────────────────────── */}
      <Card>
        <CardLabel>Network</CardLabel>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
          {[
            { k: 'Chain', v: 'Arc Mainnet' },
            { k: 'Chain ID', v: '5042' },
            { k: 'Gas Token', v: 'USDC' },
            { k: 'USDC Decimals', v: '6' },
            { k: 'Finality', v: '< 1 second' },
            { k: 'USDC', v: '0x3600…0000' },
          ].map(({ k, v }) => (
            <div key={k}>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{k}</p>
              <p className="text-sm font-semibold mono" style={{ color: 'var(--ink)' }}>{v}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
