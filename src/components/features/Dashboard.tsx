import { useAccount } from 'wagmi'
import { Card, CardLabel } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Shield, GitBranch, Send, Clock, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import type { Tab } from '@/components/layout/Shell'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

const MODULES = [
  {
    id: 'escrow' as Tab,
    icon: <Shield className="size-5" />,
    label: 'Escrow',
    desc: 'Lock USDC until conditions are met. Supports milestones, mutual approvals, deadlines, and dispute resolution.',
    color: 'rgba(18,45,69,0.08)',
  },
  {
    id: 'conditional' as Tab,
    icon: <GitBranch className="size-5" />,
    label: 'Conditional Payout',
    desc: 'Release funds when an authorized oracle or approver confirms a condition is met.',
    color: 'rgba(16,97,166,0.08)',
  },
  {
    id: 'batch' as Tab,
    icon: <Send className="size-5" />,
    label: 'Batch Payout',
    desc: 'Send USDC to dozens or hundreds of recipients in one transaction with CSV import and duplicate prevention.',
    color: 'rgba(26,128,71,0.08)',
  },
  {
    id: 'scheduled' as Tab,
    icon: <Clock className="size-5" />,
    label: 'Scheduled Payout',
    desc: 'Set up daily, weekly, or monthly recurring USDC payments with funding pools and cancellation.',
    color: 'rgba(180,83,9,0.08)',
  },
  {
    id: 'vesting' as Tab,
    icon: <Lock className="size-5" />,
    label: 'Vesting',
    desc: 'Linear, cliff, or periodic USDC vesting schedules with secure claims and optional revocation.',
    color: 'rgba(186,43,76,0.08)',
  },
]

const anyDeployed = Object.values(CONTRACT_ADDRESSES).some((a) => a && a.length > 2)

export function Dashboard({ onNav }: { onNav: (t: Tab) => void }) {
  const { isConnected } = useAccount()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(18,45,69,0.08)' }}>
            <TokenUSDC variant="branded" size={28} />
          </div>
          <div>
            <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Pact
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Programmable, non-custodial USDC payments on Arc Testnet.
              Lock, release, schedule, and vest funds — fully onchain.
            </p>
            {!isConnected && (
              <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>
                Connect your wallet to get started.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Deployment notice */}
      {!anyDeployed && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contracts not yet deployed</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Run the deploy commands (see docs/deploy.md) and set the{' '}
              <span className="mono">VITE_*</span> environment variables to wire up the contracts.
            </p>
          </div>
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => onNav(m.id)}
            className="text-left group"
          >
            <Card className="h-full transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: m.color, color: 'var(--ink)' }}
                >
                  {m.icon}
                </div>
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity mt-1" style={{ color: 'var(--subtle)' }} />
              </div>
              <div className="mt-3">
                <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{m.label}</h2>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{m.desc}</p>
              </div>
              <div className="mt-3">
                <Badge variant="muted">Arc Testnet</Badge>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Network info */}
      <Card>
        <CardLabel>Network Details</CardLabel>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            { k: 'Chain', v: 'Arc Testnet' },
            { k: 'Chain ID', v: '5042002' },
            { k: 'Gas Token', v: 'USDC' },
            { k: 'USDC Decimals', v: '6' },
            { k: 'Finality', v: '< 1 second' },
            { k: 'USDC Address', v: '0x3600…0000' },
          ].map(({ k, v }) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--subtle)' }}>{k}</span>
              <span className="font-medium mono tabular-nums" style={{ color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
