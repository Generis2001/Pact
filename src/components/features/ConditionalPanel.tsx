import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { useTransactionReceipt, useUsdcAllowance, useChainTimestamp } from '@/lib/use-transaction'
import { Card, InnerCard, CardLabel } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { TxButton } from '@/components/ui/TxButton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ExternalLink } from 'lucide-react'
import {
  CONDITIONAL_PAYOUT_ABI, ERC20_ABI, USDC_ADDRESS, CONTRACT_ADDRESSES,
  ARC_CHAIN_ID, AGREEMENT_STATE_LABELS, AgreementState,
} from '@/lib/contracts'
import { isValidAddress, readUsdcInput, parseRecordId, parseTimestampInput, isSameAddress, formatUsdc, formatAddress, formatTimestamp, parseOnchainError } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

const STATE_VARIANT: Record<number, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  0: 'muted', 1: 'default', 2: 'success', 3: 'warning', 4: 'danger',
}

export function ConditionalPanel() {
  const { address } = useAccount()
  const now = useChainTimestamp()
  const [recipient, setRecipient] = useState('')
  const [approver, setApprover] = useState('')
  const [amount, setAmount] = useState('')
  const [conditionDeadline, setConditionDeadline] = useState('')
  const [conditionDesc, setConditionDesc] = useState('')
  const [metadataURI, setMetadataURI] = useState('')
  const [viewId, setViewId] = useState('')
  const viewRecordId = parseRecordId(viewId)

  const { writeContract: approve, data: approveHash, isPending: isRequestingApproval } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isApproving } = useTransactionReceipt(approveHash)

  const { writeContract: create, data: createHash, isPending: isCreating, error: createError } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isConfirmingCreate, isSuccess: createSuccess } = useTransactionReceipt(createHash, 'Conditional created.')

  const { writeContract: fund, data: fundHash, isPending: isFunding } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isConfirmingFund } = useTransactionReceipt(fundHash)

  const { writeContract: approveCondition, data: acHash, isPending: isAC } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isConfirmingAC } = useTransactionReceipt(acHash)

  const { writeContract: cancel, data: cancelHash, isPending: isCancelling } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isConfirmingCancel } = useTransactionReceipt(cancelHash)

  const { writeContract: claimExpiry, data: expiryHash, isPending: isExpiring } = useWriteContract({ mutation: { onError: (error) => toast.error(parseOnchainError(error)) } })
  const { isLoading: isConfirmingExpiry } = useTransactionReceipt(expiryHash)

  const { data: userIds } = useReadContract({
    address: CONTRACT_ADDRESSES.ConditionalPayout,
    abi: CONDITIONAL_PAYOUT_ABI,
    functionName: 'getUserAgreements',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESSES.ConditionalPayout },
  })

  const { data: viewAgreement } = useReadContract({
    address: CONTRACT_ADDRESSES.ConditionalPayout,
    abi: CONDITIONAL_PAYOUT_ABI,
    functionName: 'getAgreement',
    args: viewRecordId ? [viewRecordId] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!viewRecordId },
  })

  const parsedAmount = readUsdcInput(amount)
  const { data: allowance = 0n } = useUsdcAllowance(CONTRACT_ADDRESSES.ConditionalPayout)
  const notDeployed = !CONTRACT_ADDRESSES.ConditionalPayout

  function handleApproveUSDC(amount: bigint) {
    if (!CONTRACT_ADDRESSES.ConditionalPayout || amount <= 0n) return
    approve({
      chainId: ARC_CHAIN_ID,
      address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
      args: [CONTRACT_ADDRESSES.ConditionalPayout, amount],
    })
  }

  function handleCreate() {
    if (!isValidAddress(recipient)) { toast.error('Invalid recipient'); return }
    if (!isValidAddress(approver)) { toast.error('Invalid approver'); return }
    if (!amount || parsedAmount === 0n) { toast.error('Amount required'); return }
    if (!conditionDeadline) { toast.error('Condition deadline required'); return }

    const deadlineTs = parseTimestampInput(conditionDeadline)
    if (!deadlineTs || deadlineTs <= now) { toast.error('The condition deadline must be in the future.'); return }

    create({
      chainId: ARC_CHAIN_ID,
      address: CONTRACT_ADDRESSES.ConditionalPayout,
      abi: CONDITIONAL_PAYOUT_ABI,
      functionName: 'createAgreement',
      args: [recipient as `0x${string}`, approver as `0x${string}`, parsedAmount, deadlineTs, conditionDesc, metadataURI],
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Conditional Payout</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Release USDC when an authorized oracle or approver confirms a condition is met.
        </p>
      </div>

      {notDeployed && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contract not deployed</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Set VITE_CONDITIONAL_PAYOUT in .env after deploying.</p>
        </div>
      )}

      <Card>
        <CardLabel>Create Agreement</CardLabel>
        <div className="mt-4 space-y-3">
          <Input label="Recipient" value={recipient} onChange={setRecipient} placeholder="0x…"
            error={recipient && !isValidAddress(recipient) ? 'Invalid address' : undefined} />
          <Input label="Approver (oracle address)" value={approver} onChange={setApprover} placeholder="0x…"
            error={approver && !isValidAddress(approver) ? 'Invalid address' : undefined} />
          <Input label="Amount (USDC)" value={amount} onChange={setAmount} placeholder="0.00" inputMode="decimal" />
          <Input label="Condition deadline" type="datetime-local" value={conditionDeadline} onChange={setConditionDeadline} />
          <Textarea label="Condition description" value={conditionDesc} onChange={setConditionDesc}
            placeholder="Describe the condition that must be met…" rows={2} />
          <Input label="Metadata URI (optional)" value={metadataURI} onChange={setMetadataURI} placeholder="ipfs://…" />

          <TxButton label="Create Agreement" onClick={handleCreate} isPending={isCreating}
            isConfirming={isConfirmingCreate} isSuccess={createSuccess} disabled={parsedAmount === 0n} />
          {createHash && (
            <a href={buildTxExplorerUrl(ARC_CHAIN_ID, createHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-hover)' }}>
              <ExternalLink className="size-3" /> View transaction
            </a>
          )}
          {createError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{parseOnchainError(createError)}</p>}
        </div>
      </Card>

      {/* Look up */}
      <Card>
        <CardLabel>Look Up Agreement</CardLabel>
        <div className="mt-3 flex gap-2">
          <Input value={viewId} onChange={setViewId} placeholder="Agreement ID" className="flex-1" />
        </div>
        {viewAgreement && (
          <InnerCard className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={STATE_VARIANT[viewAgreement.state]}>{AGREEMENT_STATE_LABELS[viewAgreement.state]}</Badge>
              <span className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatUsdc(viewAgreement.amount)} USDC
              </span>
            </div>
            <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
              <p>Payer: <span className="mono">{formatAddress(viewAgreement.payer)}</span></p>
              <p>Recipient: <span className="mono">{formatAddress(viewAgreement.recipient)}</span></p>
              <p>Approver: <span className="mono">{formatAddress(viewAgreement.approver)}</span></p>
              <p>Condition deadline: {formatTimestamp(viewAgreement.conditionDeadline)}</p>
              {viewAgreement.conditionDescription && <p>Condition: {viewAgreement.conditionDescription}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(viewAgreement.state as AgreementState) === AgreementState.PENDING && isSameAddress(address, viewAgreement.payer) && (
                <>
                  {now <= viewAgreement.conditionDeadline && (allowance < viewAgreement.amount ? (
                    <Button size="sm" onClick={() => handleApproveUSDC(viewAgreement.amount)} loading={isApproving || isRequestingApproval}>Approve USDC to Fund</Button>
                  ) : (
                  <Button size="sm" onClick={() => fund({
                    chainId: ARC_CHAIN_ID,
                    address: CONTRACT_ADDRESSES.ConditionalPayout, abi: CONDITIONAL_PAYOUT_ABI,
                    functionName: 'fundAgreement', args: [viewRecordId!],
                  })} loading={isFunding || isConfirmingFund}>
                    Fund Agreement
                  </Button>
                  ))}
                  <Button size="sm" variant="danger" onClick={() => cancel({
                    chainId: ARC_CHAIN_ID,
                    address: CONTRACT_ADDRESSES.ConditionalPayout, abi: CONDITIONAL_PAYOUT_ABI,
                    functionName: 'cancelAgreement', args: [viewRecordId!],
                  })} loading={isCancelling || isConfirmingCancel}>
                    Cancel
                  </Button>
                </>
              )}
              {(viewAgreement.state as AgreementState) === AgreementState.ACTIVE && isSameAddress(address, viewAgreement.approver) && now <= viewAgreement.conditionDeadline && (
                <Button size="sm" onClick={() => approveCondition({
                  chainId: ARC_CHAIN_ID,
                  address: CONTRACT_ADDRESSES.ConditionalPayout, abi: CONDITIONAL_PAYOUT_ABI,
                  functionName: 'approveCondition', args: [viewRecordId!],
                })} loading={isAC || isConfirmingAC}>
                  Approve Condition
                </Button>
              )}
              {(viewAgreement.state as AgreementState) === AgreementState.ACTIVE && isSameAddress(address, viewAgreement.payer) && now > viewAgreement.conditionDeadline && (
                <Button size="sm" variant="secondary" onClick={() => claimExpiry({
                  chainId: ARC_CHAIN_ID,
                  address: CONTRACT_ADDRESSES.ConditionalPayout, abi: CONDITIONAL_PAYOUT_ABI,
                  functionName: 'claimExpiry', args: [viewRecordId!],
                })} loading={isExpiring || isConfirmingExpiry}>
                  Claim Expiry (after deadline)
                </Button>
              )}
            </div>
          </InnerCard>
        )}
      </Card>

      {/* User agreements list */}
      {userIds && userIds.length > 0 && (
        <Card>
          <CardLabel>Your Agreements ({userIds.length})</CardLabel>
          <div className="mt-3 space-y-1">
            {[...userIds].reverse().slice(0, 8).map((id) => (
              <AgreementRow key={id.toString()} id={id} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function AgreementRow({ id }: { id: bigint }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESSES.ConditionalPayout,
    abi: CONDITIONAL_PAYOUT_ABI,
    functionName: 'getAgreement',
    args: [id],
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!CONTRACT_ADDRESSES.ConditionalPayout },
  })
  const STATE_VARIANT: Record<number, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
    0: 'muted', 1: 'default', 2: 'success', 3: 'warning', 4: 'danger',
  }
  if (!data) return null
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--surface-muted)]">
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>#{id.toString()}</span>
        <Badge variant={STATE_VARIANT[data.state]}>{AGREEMENT_STATE_LABELS[data.state]}</Badge>
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
        {formatUsdc(data.amount)} USDC
      </span>
    </div>
  )
}
