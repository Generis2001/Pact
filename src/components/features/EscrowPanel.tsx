import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { Card, InnerCard, CardLabel } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TxButton } from '@/components/ui/TxButton'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import {
  ESCROW_MANAGER_ABI, CONTRACT_ADDRESSES, ERC20_ABI, USDC_ADDRESS,
  ARC_CHAIN_ID, ESCROW_STATE_LABELS, EscrowState,
} from '@/lib/contracts'
import {
  isValidAddress, parseUsdc, formatUsdc, formatAddress,
  formatTimestamp, parseOnchainError,
} from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

type MilestoneInput = { amount: string; deadline: string; description: string }

const STATE_VARIANT: Record<number, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  0: 'muted', 1: 'default', 2: 'success', 3: 'warning', 4: 'danger', 5: 'success',
}

export function EscrowPanel() {
  const { address } = useAccount()
  const [beneficiary, setBeneficiary] = useState('')
  const [arbiter, setArbiter] = useState('')
  const [deadline, setDeadline] = useState('')
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { amount: '', deadline: '', description: '' },
  ])
  const [viewId, setViewId] = useState('')
  const [expandedId, setExpandedId] = useState<bigint | null>(null)

  // Approval for USDC
  const { writeContract: approve, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash })

  // Create escrow
  const { writeContract: createEscrow, data: createHash, isPending: isCreating, error: createError } = useWriteContract()
  const { isLoading: isConfirmingCreate, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash })

  // Fund escrow
  const { writeContract: fundEscrow, data: fundHash, isPending: isFunding } = useWriteContract()
  const { isLoading: isConfirmingFund } = useWaitForTransactionReceipt({ hash: fundHash })

  // Approve milestone
  const { writeContract: approveMilestone, data: milestoneHash, isPending: isApprovingMilestone } = useWriteContract()
  const { isLoading: isConfirmingMilestone } = useWaitForTransactionReceipt({ hash: milestoneHash })

  // Dispute
  const { writeContract: dispute, data: disputeHash, isPending: isDisputing } = useWriteContract()
  const { isLoading: isConfirmingDispute } = useWaitForTransactionReceipt({ hash: disputeHash })

  // Refund
  const { writeContract: claimRefund, data: refundHash, isPending: isRefunding } = useWriteContract()
  const { isLoading: isConfirmingRefund } = useWaitForTransactionReceipt({ hash: refundHash })

  // Read
  const { data: userEscrowIds, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowManager,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'getUserEscrows',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESSES.EscrowManager },
  })

  const { data: viewEscrow } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowManager,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'getEscrow',
    args: viewId ? [BigInt(viewId)] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!viewId && !isNaN(Number(viewId)) },
  })

  const totalAmount = milestones.reduce((s, m) => {
    try { return s + parseUsdc(m.amount || '0') } catch { return s }
  }, 0n)

  function addMilestone() {
    if (milestones.length >= 20) return
    setMilestones([...milestones, { amount: '', deadline: '', description: '' }])
  }

  function removeMilestone(i: number) {
    if (milestones.length <= 1) return
    setMilestones(milestones.filter((_, idx) => idx !== i))
  }

  function updateMilestone(i: number, field: keyof MilestoneInput, value: string) {
    setMilestones(milestones.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function handleApprove() {
    if (!CONTRACT_ADDRESSES.EscrowManager) return
    approve({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.EscrowManager, totalAmount],
    })
  }

  function handleCreate() {
    if (!isValidAddress(beneficiary)) { toast.error('Invalid beneficiary address'); return }
    if (!isValidAddress(arbiter)) { toast.error('Invalid arbiter address'); return }
    if (!deadline) { toast.error('Deadline required'); return }
    if (milestones.some((m) => !m.amount || Number(m.amount) <= 0)) { toast.error('All milestone amounts required'); return }

    const deadlineTs = BigInt(Math.floor(new Date(deadline).getTime() / 1000))

    const milestoneTuples = milestones.map((m) => ({
      amount: parseUsdc(m.amount),
      deadline: m.deadline ? BigInt(Math.floor(new Date(m.deadline).getTime() / 1000)) : 0n,
      description: m.description,
    }))

    createEscrow({
      address: CONTRACT_ADDRESSES.EscrowManager,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'createEscrow',
      args: [beneficiary as `0x${string}`, arbiter as `0x${string}`, deadlineTs, milestoneTuples],
    }, {
      onSuccess: () => { toast.success('Escrow created!'); void refetchIds() },
      onError: (e) => toast.error(parseOnchainError(e)),
    })
  }

  const notDeployed = !CONTRACT_ADDRESSES.EscrowManager

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>Escrow</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Lock USDC until milestones are met. Both depositor and arbiter must approve each milestone.
        </p>
      </div>

      {notDeployed && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contract not deployed yet</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Set VITE_ESCROW_MANAGER in .env after deploying.</p>
        </div>
      )}

      {/* Create form */}
      <Card>
        <CardLabel>Create Escrow</CardLabel>
        <div className="mt-4 space-y-3">
          <Input label="Beneficiary address" value={beneficiary} onChange={setBeneficiary}
            placeholder="0x…" error={beneficiary && !isValidAddress(beneficiary) ? 'Invalid address' : undefined} />
          <Input label="Arbiter address" value={arbiter} onChange={setArbiter}
            placeholder="0x…" error={arbiter && !isValidAddress(arbiter) ? 'Invalid address' : undefined} />
          <Input label="Escrow deadline" type="datetime-local" value={deadline} onChange={setDeadline} />

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Milestones</span>
              <Button variant="ghost" size="sm" onClick={addMilestone} disabled={milestones.length >= 20}>
                <Plus className="size-3" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <InnerCard key={i}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input label={`Amount (USDC)`} value={m.amount} onChange={(v) => updateMilestone(i, 'amount', v)}
                        placeholder="0.00" inputMode="decimal" />
                      <Input label="Milestone deadline (optional)" type="datetime-local"
                        value={m.deadline} onChange={(v) => updateMilestone(i, 'deadline', v)} />
                      <Input label="Description" value={m.description} onChange={(v) => updateMilestone(i, 'description', v)}
                        placeholder="Deliverable description…" />
                    </div>
                    {milestones.length > 1 && (
                      <button onClick={() => removeMilestone(i)} className="mt-6 p-1.5 rounded-lg hover:bg-[var(--surface-muted)]">
                        <Trash2 className="size-3.5" style={{ color: 'var(--danger)' }} />
                      </button>
                    )}
                  </div>
                </InnerCard>
              ))}
            </div>
          </div>

          {totalAmount > 0n && (
            <InnerCard>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Total to lock</p>
              <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatUsdc(totalAmount)} <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
              </p>
            </InnerCard>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleApprove} loading={isApproving} disabled={!address || totalAmount === 0n}>
              {approved ? 'Approved' : 'Approve USDC'}
            </Button>
            <TxButton label="Create Escrow" onClick={handleCreate} isPending={isCreating} isConfirming={isConfirmingCreate} isSuccess={createSuccess} disabled={!approved} />
          </div>
          {createHash && (
            <a href={buildTxExplorerUrl(ARC_CHAIN_ID, createHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-hover)' }}>
              <ExternalLink className="size-3" /> View transaction
            </a>
          )}
          {createError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{parseOnchainError(createError)}</p>}
        </div>
      </Card>

      {/* View escrow */}
      <Card>
        <CardLabel>Look Up Escrow</CardLabel>
        <div className="mt-3 flex gap-2">
          <Input value={viewId} onChange={setViewId} placeholder="Escrow ID" className="flex-1" />
        </div>
        {viewEscrow && (
          <InnerCard className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={STATE_VARIANT[viewEscrow.state]}>{ESCROW_STATE_LABELS[viewEscrow.state]}</Badge>
              <span className="mono text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                {formatUsdc(viewEscrow.totalAmount)} USDC
              </span>
            </div>
            <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
              <p>Depositor: <span className="mono">{formatAddress(viewEscrow.depositor)}</span></p>
              <p>Beneficiary: <span className="mono">{formatAddress(viewEscrow.beneficiary)}</span></p>
              <p>Arbiter: <span className="mono">{formatAddress(viewEscrow.arbiter)}</span></p>
              <p>Deadline: {formatTimestamp(viewEscrow.deadline)}</p>
            </div>
            {(viewEscrow.state as EscrowState) === EscrowState.CREATED && address === viewEscrow.depositor && (
              <Button size="sm" onClick={() => fundEscrow({
                address: CONTRACT_ADDRESSES.EscrowManager, abi: ESCROW_MANAGER_ABI,
                functionName: 'fundEscrow', args: [BigInt(viewId)],
              })} loading={isFunding || isConfirmingFund}>
                Fund Escrow
              </Button>
            )}
            {(viewEscrow.state as EscrowState) === EscrowState.FUNDED && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => dispute({
                  address: CONTRACT_ADDRESSES.EscrowManager, abi: ESCROW_MANAGER_ABI,
                  functionName: 'initiateDispute', args: [BigInt(viewId)],
                })} variant="danger" loading={isDisputing || isConfirmingDispute}>
                  Dispute
                </Button>
              </div>
            )}
            {(viewEscrow.state as EscrowState) === EscrowState.FUNDED && address === viewEscrow.depositor && (
              <Button size="sm" variant="secondary" onClick={() => claimRefund({
                address: CONTRACT_ADDRESSES.EscrowManager, abi: ESCROW_MANAGER_ABI,
                functionName: 'claimRefund', args: [BigInt(viewId)],
              })} loading={isRefunding || isConfirmingRefund}>
                Claim Refund (after deadline)
              </Button>
            )}
          </InnerCard>
        )}
      </Card>

      {/* User escrow list */}
      {userEscrowIds && userEscrowIds.length > 0 && (
        <Card>
          <CardLabel>Your Escrows</CardLabel>
          <div className="mt-3 space-y-2">
            {[...userEscrowIds].reverse().slice(0, 10).map((id) => (
              <EscrowRow key={id.toString()} id={id} expanded={expandedId === id}
                onToggle={() => setExpandedId(expandedId === id ? null : id)}
                onApprove={(milestoneIdx) => approveMilestone({
                  address: CONTRACT_ADDRESSES.EscrowManager, abi: ESCROW_MANAGER_ABI,
                  functionName: 'approveMilestone', args: [id, milestoneIdx],
                })}
                isApprovingMilestone={isApprovingMilestone || isConfirmingMilestone}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function EscrowRow({ id, expanded, onToggle, onApprove, isApprovingMilestone }: {
  id: bigint
  expanded: boolean
  onToggle: () => void
  onApprove: (idx: bigint) => void
  isApprovingMilestone: boolean
}) {
  const { data: esc } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowManager,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'getEscrow',
    args: [id],
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!CONTRACT_ADDRESSES.EscrowManager },
  })
  const { data: milestones } = useReadContract({
    address: CONTRACT_ADDRESSES.EscrowManager,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'getMilestones',
    args: [id],
    chainId: ARC_CHAIN_ID,
    query: { enabled: expanded && !!CONTRACT_ADDRESSES.EscrowManager },
  })

  if (!esc) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-muted)]"
        onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>#{id.toString()}</span>
          <Badge variant={STATE_VARIANT[esc.state]}>{ESCROW_STATE_LABELS[esc.state]}</Badge>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatUsdc(esc.totalAmount)} USDC
          </span>
        </div>
        {expanded ? <ChevronUp className="size-4" style={{ color: 'var(--subtle)' }} /> : <ChevronDown className="size-4" style={{ color: 'var(--subtle)' }} />}
      </button>
      {expanded && milestones && (
        <div className="px-4 pb-4 space-y-2">
          {milestones.map((m, i) => (
            <InnerCard key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{m.description || `Milestone ${i + 1}`}</p>
                  <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{formatUsdc(m.amount)} USDC</p>
                </div>
                {m.state === 0 && (esc.state as EscrowState) === EscrowState.FUNDED && (
                  <Button size="sm" onClick={() => onApprove(BigInt(i))} loading={isApprovingMilestone}>
                    Approve
                  </Button>
                )}
                {m.state !== 0 && (
                  <Badge variant={m.state === 1 ? 'success' : m.state === 4 ? 'danger' : 'muted'}>
                    {['New', 'Released', 'Refunded', 'Disputed', 'Resolved'][m.state]}
                  </Badge>
                )}
              </div>
            </InnerCard>
          ))}
        </div>
      )}
    </div>
  )
}
