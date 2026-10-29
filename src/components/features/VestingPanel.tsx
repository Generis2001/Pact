import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { Card, InnerCard, CardLabel } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TxButton } from '@/components/ui/TxButton'
import { Badge } from '@/components/ui/Badge'
import { ExternalLink, Download, XCircle } from 'lucide-react'
import {
  VESTING_VAULT_ABI, ERC20_ABI, USDC_ADDRESS, CONTRACT_ADDRESSES, ARC_CHAIN_ID,
  VestingType, VESTING_TYPE_LABELS,
} from '@/lib/contracts'
import { isValidAddress, parseUsdc, formatUsdc, formatAddress, formatTimestamp, parseOnchainError } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

export function VestingPanel() {
  const { address } = useAccount()
  const [beneficiary, setBeneficiary] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [cliffTime, setCliffTime] = useState('')
  const [vestingType, setVestingType] = useState<number>(VestingType.LINEAR)
  const [intervalSeconds, setIntervalSeconds] = useState('')
  const [revocable, setRevocable] = useState(false)
  const [viewId, setViewId] = useState('')


  const { writeContract: approve, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: create, data: createHash, isPending: isCreating } = useWriteContract()
  const { isLoading: isConfirmingCreate, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash })

  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract()
  const { isLoading: isConfirmingClaim } = useWaitForTransactionReceipt({ hash: claimHash })

  const { writeContract: revoke, data: revokeHash, isPending: isRevoking } = useWriteContract()
  const { isLoading: isConfirmingRevoke } = useWaitForTransactionReceipt({ hash: revokeHash })

  const { data: beneficiaryIds } = useReadContract({
    address: CONTRACT_ADDRESSES.VestingVault,
    abi: VESTING_VAULT_ABI,
    functionName: 'getBeneficiarySchedules',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESSES.VestingVault },
  })

  const { data: grantorIds } = useReadContract({
    address: CONTRACT_ADDRESSES.VestingVault,
    abi: VESTING_VAULT_ABI,
    functionName: 'getGrantorSchedules',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESSES.VestingVault },
  })

  const { data: viewSchedule } = useReadContract({
    address: CONTRACT_ADDRESSES.VestingVault,
    abi: VESTING_VAULT_ABI,
    functionName: 'getSchedule',
    args: viewId ? [BigInt(viewId)] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!viewId && !isNaN(Number(viewId)) },
  })

  const { data: claimable } = useReadContract({
    address: CONTRACT_ADDRESSES.VestingVault,
    abi: VESTING_VAULT_ABI,
    functionName: 'claimableAmount',
    args: viewId ? [BigInt(viewId)] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!viewId && !isNaN(Number(viewId)), refetchInterval: 10000 },
  })

  const parsedTotal = totalAmount ? parseUsdc(totalAmount) : 0n
  const notDeployed = !CONTRACT_ADDRESSES.VestingVault

  function handleApprove() {
    if (!CONTRACT_ADDRESSES.VestingVault) return
    approve({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.VestingVault, parsedTotal] })
  }

  function handleCreate() {
    if (!isValidAddress(beneficiary)) { toast.error('Invalid beneficiary'); return }
    if (parsedTotal === 0n) { toast.error('Amount required'); return }
    if (!startTime || !endTime) { toast.error('Start and end time required'); return }

    const startTs = BigInt(Math.floor(new Date(startTime).getTime() / 1000))
    const endTs = BigInt(Math.floor(new Date(endTime).getTime() / 1000))
    const cliffTs = cliffTime ? BigInt(Math.floor(new Date(cliffTime).getTime() / 1000)) : startTs
    const intervalSec = intervalSeconds ? BigInt(intervalSeconds) : 0n

    create({
      address: CONTRACT_ADDRESSES.VestingVault,
      abi: VESTING_VAULT_ABI,
      functionName: 'createSchedule',
      args: [beneficiary as `0x${string}`, parsedTotal, startTs, endTs, cliffTs, vestingType, intervalSec, revocable],
    }, {
      onSuccess: () => toast.success('Vesting schedule created!'),
      onError: (e) => toast.error(parseOnchainError(e)),
    })
  }

  const vestingProgress = viewSchedule
    ? Number((viewSchedule.claimedAmount * 10000n) / (viewSchedule.totalAmount || 1n)) / 100
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Vesting Vault</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Linear, cliff, or periodic USDC vesting. Grantor deposits upfront; beneficiary claims as tokens vest.
        </p>
      </div>

      {notDeployed && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contract not deployed</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Set VITE_VESTING_VAULT in .env after deploying.</p>
        </div>
      )}

      <Card>
        <CardLabel>Create Vesting Schedule</CardLabel>
        <div className="mt-4 space-y-3">
          <Input label="Beneficiary" value={beneficiary} onChange={setBeneficiary} placeholder="0x…"
            error={beneficiary && !isValidAddress(beneficiary) ? 'Invalid address' : undefined} />
          <Input label="Total amount (USDC)" value={totalAmount} onChange={setTotalAmount} placeholder="0.00" inputMode="decimal" />

          {/* Vesting type */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Vesting type</p>
            <div className="flex gap-2">
              {[VestingType.LINEAR, VestingType.CLIFF, VestingType.PERIODIC].map((vt) => (
                <button key={vt} onClick={() => setVestingType(vt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${vestingType === (vt as number) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--ink-2)]'}`}>
                  {VESTING_TYPE_LABELS[vt]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input label="Start time" type="datetime-local" value={startTime} onChange={setStartTime} />
            <Input label="End time" type="datetime-local" value={endTime} onChange={setEndTime} />
          </div>

          {(vestingType as VestingType) === VestingType.CLIFF && (
            <Input label="Cliff time" type="datetime-local" value={cliffTime} onChange={setCliffTime}
              hint="No tokens vest before this date" />
          )}

          {(vestingType as VestingType) === VestingType.PERIODIC && (
            <Input label="Interval (seconds)" value={intervalSeconds} onChange={setIntervalSeconds}
              placeholder="e.g. 2592000 for monthly" inputMode="numeric" />
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="revocable" checked={revocable} onChange={(e) => setRevocable(e.target.checked)}
              className="size-4 rounded" />
            <label htmlFor="revocable" className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Revocable (grantor can cancel and reclaim unvested tokens)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleApprove} loading={isApproving} disabled={!address || parsedTotal === 0n}>
              {approved ? 'Approved' : 'Approve USDC'}
            </Button>
            <TxButton label="Create Schedule" onClick={handleCreate} isPending={isCreating}
              isConfirming={isConfirmingCreate} isSuccess={createSuccess} disabled={!approved} />
          </div>
          {createHash && (
            <a href={buildTxExplorerUrl(ARC_CHAIN_ID, createHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-hover)' }}>
              <ExternalLink className="size-3" /> View transaction
            </a>
          )}
        </div>
      </Card>

      {/* View & claim */}
      <Card>
        <CardLabel>Look Up / Claim Schedule</CardLabel>
        <div className="mt-3">
          <Input value={viewId} onChange={setViewId} placeholder="Vesting ID" inputMode="numeric" />
          {viewSchedule && (
            <InnerCard className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={viewSchedule.revokedAt > 0n ? 'danger' : 'success'}>
                  {viewSchedule.revokedAt > 0n ? 'Revoked' : VESTING_TYPE_LABELS[viewSchedule.vestingType]}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Grantor: <span className="mono">{formatAddress(viewSchedule.grantor)}</span>
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  <span>Claimed: {formatUsdc(viewSchedule.claimedAmount)} USDC</span>
                  <span>Total: {formatUsdc(viewSchedule.totalAmount)} USDC</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(vestingProgress, 100)}%`, background: 'var(--success)' }}
                  />
                </div>
                <p className="text-xs mt-1 tabular-nums" style={{ color: 'var(--muted)' }}>{vestingProgress.toFixed(1)}% vested</p>
              </div>

              <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
                <p>Beneficiary: <span className="mono">{formatAddress(viewSchedule.beneficiary)}</span></p>
                <p>Start: {formatTimestamp(viewSchedule.startTime)}</p>
                <p>End: {formatTimestamp(viewSchedule.endTime)}</p>
                {viewSchedule.cliffTime > viewSchedule.startTime && (
                  <p>Cliff: {formatTimestamp(viewSchedule.cliffTime)}</p>
                )}
                {viewSchedule.revokedAt > 0n && (
                  <p>Revoked at: {formatTimestamp(viewSchedule.revokedAt)}</p>
                )}
              </div>

              {claimable !== undefined && claimable > 0n && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(26,128,71,0.08)', border: '1px solid rgba(26,128,71,0.15)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                    Claimable now: {formatUsdc(claimable)} USDC
                  </p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {claimable !== undefined && claimable > 0n && address === viewSchedule.beneficiary && (
                  <Button size="sm" onClick={() => claim({
                    address: CONTRACT_ADDRESSES.VestingVault, abi: VESTING_VAULT_ABI,
                    functionName: 'claimVested', args: [BigInt(viewId)],
                  })} loading={isClaiming || isConfirmingClaim}>
                    <Download className="size-3.5" /> Claim {formatUsdc(claimable)} USDC
                  </Button>
                )}
                {viewSchedule.revocable && viewSchedule.revokedAt === 0n && address === viewSchedule.grantor && (
                  <Button size="sm" variant="danger" onClick={() => revoke({
                    address: CONTRACT_ADDRESSES.VestingVault, abi: VESTING_VAULT_ABI,
                    functionName: 'revokeSchedule', args: [BigInt(viewId)],
                  })} loading={isRevoking || isConfirmingRevoke}>
                    <XCircle className="size-3.5" /> Revoke Schedule
                  </Button>
                )}
              </div>
            </InnerCard>
          )}
        </div>
      </Card>

      {/* User schedules */}
      {((beneficiaryIds && beneficiaryIds.length > 0) || (grantorIds && grantorIds.length > 0)) && (
        <Card>
          <CardLabel>Your Vesting Schedules</CardLabel>
          <div className="mt-3 space-y-1">
            {beneficiaryIds && beneficiaryIds.length > 0 && (
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--subtle)' }}>As beneficiary</p>
            )}
            {beneficiaryIds?.slice().reverse().slice(0, 5).map((id) => (
              <VestingRow key={`b-${id}`} id={id} />
            ))}
            {grantorIds && grantorIds.length > 0 && (
              <p className="text-xs font-semibold mt-3 mb-2" style={{ color: 'var(--subtle)' }}>As grantor</p>
            )}
            {grantorIds?.slice().reverse().slice(0, 5).map((id) => (
              <VestingRow key={`g-${id}`} id={id} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function VestingRow({ id }: { id: bigint }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESSES.VestingVault,
    abi: VESTING_VAULT_ABI,
    functionName: 'getSchedule',
    args: [id],
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!CONTRACT_ADDRESSES.VestingVault },
  })
  if (!data) return null
  const progress = Number((data.claimedAmount * 100n) / (data.totalAmount || 1n))
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--surface-muted)]">
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>#{id.toString()}</span>
        <Badge variant={data.revokedAt > 0n ? 'danger' : 'default'}>{VESTING_TYPE_LABELS[data.vestingType]}</Badge>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--success)' }} />
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
          {formatUsdc(data.totalAmount)} USDC
        </span>
      </div>
    </div>
  )
}
