import { useAccount, useReadContract } from 'wagmi'
import type { Tab, PaymentTab } from '@/components/layout/Shell'
import { FeatureIllustration } from '@/components/ui/FeatureIllustration'
import { WalletButton } from '@/components/ui/WalletButton'
import { ERC20_ABI, USDC_ADDRESS, ARC_CHAIN_ID } from '@/lib/contracts'
import { formatUsdc } from '@/lib/utils'

const MODULES: { id: PaymentTab; label: string; desc: string }[] = [
  { id: 'escrow', label: 'Escrow', desc: 'Lock USDC and release funds as milestones are met.' },
  { id: 'conditional', label: 'Conditional Payout', desc: 'Release a payment when your approver confirms.' },
  { id: 'batch', label: 'Batch Payout', desc: 'Pay multiple recipients in one transaction.' },
  { id: 'scheduled', label: 'Scheduled Payout', desc: 'Set up one-time or recurring USDC payments.' },
  { id: 'vesting', label: 'Vesting', desc: 'Unlock USDC over time with a vesting schedule.' },
]

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
    <div className="mx-auto max-w-[760px] pb-16 pt-6 sm:pt-14">
      <div className="mb-10 text-center sm:mb-12">
        <h1 className="display text-2xl">{isConnected ? 'Your Pact workspace' : 'Connect to Pact'}</h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          {isConnected ? 'Manage your USDC payments, escrow, and vesting on Arc.' : 'Connect your wallet or take a look around.'}
        </p>
        {isConnected && balance !== undefined && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Available balance <span className="ml-1 font-medium text-[var(--ink)]">{formatUsdc(balance)} USDC</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7">
        {MODULES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            onClick={() => onNav(feature.id)}
            className="feature-card flex min-h-[188px] flex-col items-center justify-between px-5 pb-5 pt-7 text-center sm:px-6"
          >
            <div>
              <h2 className="text-lg font-medium">{feature.label}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{feature.desc}</p>
            </div>
            <FeatureIllustration feature={feature.id} />
          </button>
        ))}
      </div>
      {!isConnected && <WalletButton className="mx-auto mt-10 flex w-full max-w-[496px]" />}
    </div>
  )
}
