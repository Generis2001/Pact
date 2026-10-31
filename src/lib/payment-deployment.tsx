import { createContext, useContext, useState, type ReactNode } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { CONTRACT_ADDRESSES, ORIGINAL_CONTRACT_ADDRESSES } from './contracts'
import { formatAddress } from './utils'

export type UpgradedContract = 'EscrowManager' | 'ConditionalPayout' | 'ScheduledPayout'
type Deployment = { address: `0x${string}`; legacy: boolean }
const DeploymentContext = createContext<Deployment | null>(null)

export function usePaymentDeployment(name: UpgradedContract): Deployment {
  return useContext(DeploymentContext) ?? { address: CONTRACT_ADDRESSES[name], legacy: false }
}

/** Switching deployments remounts forms so IDs, receipts, and allowances cannot cross contracts. */
export function PaymentDeployment({ name, children }: { name: UpgradedContract; children: ReactNode }) {
  const [selected, setSelected] = useState<'current' | 'original'>('current')
  const current = CONTRACT_ADDRESSES[name]
  const original = ORIGINAL_CONTRACT_ADDRESSES[name]
  const hasReplacement = current.toLowerCase() !== original.toLowerCase()
  const legacy = hasReplacement && selected === 'original'
  const address = legacy ? original : current
  const mutations = useIsMutating({ mutationKey: ['writeContract'] })
  const confirmations = useIsFetching({ queryKey: ['waitForTransactionReceipt'] })
  return (
    <DeploymentContext.Provider value={{ address, legacy }}>
      {hasReplacement && <div className="mx-auto mb-5 max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-4">
        <label className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
          Agreement version
          <select aria-label="Agreement version" value={selected} disabled={mutations + confirmations > 0} onChange={(event) => setSelected(event.target.value as 'current' | 'original')}
            className="rounded-xl border border-[var(--border)] bg-white p-2 text-sm">
            <option value="current">Current agreements</option>
            <option value="original">Existing agreements (original)</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-[var(--muted)]">{legacy ? 'Manage agreements created before the update. Create new payments under Current agreements.' : 'Create new payments here. Choose Existing agreements to manage payments created before the update.'}</p>
        {legacy && name === 'EscrowManager' && <p role="alert" className="mt-2 text-xs text-[var(--warning)]">The original escrow has a settlement defect. Review previously resolved milestones before approving a refund or dispute payment.</p>}
        <a href={`https://explorer.arc.io/address/${address}`} target="_blank" rel="noreferrer" className="mono mt-2 inline-block text-xs text-[var(--accent)]">{formatAddress(address)}</a>
      </div>}
      <div key={address}>{children}</div>
    </DeploymentContext.Provider>
  )
}
