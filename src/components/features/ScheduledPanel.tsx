import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { Card, InnerCard, CardLabel } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TxButton } from '@/components/ui/TxButton'
import { Badge } from '@/components/ui/Badge'
import { ExternalLink, Play, XCircle } from 'lucide-react'
import {
  SCHEDULED_PAYOUT_ABI, ERC20_ABI, USDC_ADDRESS, CONTRACT_ADDRESSES, ARC_TESTNET_CHAIN_ID,
} from '@/lib/contracts'
import { isValidAddress, parseUsdc, formatUsdc, formatAddress, formatTimestamp, formatDuration, parseOnchainError } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

const INTERVALS = [
  { label: 'Daily', seconds: 86400 },
  { label: 'Weekly', seconds: 604800 },
  { label: 'Monthly (30d)', seconds: 2592000 },
  { label: 'Custom', seconds: 0 },
]

export function ScheduledPanel() {
  const { address } = useAccount()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [intervalPreset, setIntervalPreset] = useState(86400)
  const [customInterval, setCustomInterval] = useState('')
  const [maxExecutions, setMaxExecutions] = useState('')
  const [description, setDescription] = useState('')
  const [fundAmount, setFundAmount] = useState('')
  const [fundId, setFundId] = useState('')
  const [executeId, setExecuteId] = useState('')
  const [cancelId, setCancelId] = useState('')
  const [viewId, setViewId] = useState('')

  const { writeContract: approve, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: create, data: createHash, isPending: isCreating } = useWriteContract()
  const { isLoading: isConfirmingCreate, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash })

  const { writeContract: fund, data: fundHash, isPending: isFunding } = useWriteContract()
  const { isLoading: isConfirmingFund, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash })

  const { writeContract: execute, data: execHash, isPending: isExecuting } = useWriteContract()
  const { isLoading: isConfirmingExec, isSuccess: execSuccess } = useWaitForTransactionReceipt({ hash: execHash })

  const { writeContract: cancel, data: cancelHash, isPending: isCancelling } = useWriteContract()
  const { isLoading: isConfirmingCancel } = useWaitForTransactionReceipt({ hash: cancelHash })

  const { data: payerIds, refetch: refetchIds } = useReadContract({
    address: CONTRACT_ADDRESSES.ScheduledPayout,
    abi: SCHEDULED_PAYOUT_ABI,
    functionName: 'getPayerSchedules',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESSES.ScheduledPayout },
  })

  const { data: viewSchedule } = useReadContract({
    address: CONTRACT_ADDRESSES.ScheduledPayout,
    abi: SCHEDULED_PAYOUT_ABI,
    functionName: 'getSchedule',
    args: viewId ? [BigInt(viewId)] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!viewId && !isNaN(Number(viewId)) },
  })

  const { data: viewBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.ScheduledPayout,
    abi: SCHEDULED_PAYOUT_ABI,
    functionName: 'getBalance',
    args: viewId ? [BigInt(viewId)] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!viewId && !isNaN(Number(viewId)) },
  })

  const { data: isDue } = useReadContract({
    address: CONTRACT_ADDRESSES.ScheduledPayout,
    abi: SCHEDULED_PAYOUT_ABI,
    functionName: 'isDue',
    args: executeId ? [BigInt(executeId)] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!executeId && !isNaN(Number(executeId)) },
  })

  const intervalSeconds = intervalPreset === 0 ? BigInt(customInterval || '0') : BigInt(intervalPreset)
  const parsedFundAmount = fundAmount ? parseUsdc(fundAmount) : 0n
  const notDeployed = !CONTRACT_ADDRESSES.ScheduledPayout

  function handleApprove() {
    if (!CONTRACT_ADDRESSES.ScheduledPayout) return
    approve({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.ScheduledPayout, parsedFundAmount] })
  }

  function handleCreate() {
    if (!isValidAddress(recipient)) { toast.error('Invalid recipient'); return }
    if (!amount || parseUsdc(amount) === 0n) { toast.error('Amount required'); return }
    if (intervalSeconds === 0n) { toast.error('Interval required'); return }

    const now = Math.floor(Date.now() / 1000)
    const startTs = startTime ? BigInt(Math.floor(new Date(startTime).getTime() / 1000)) : BigInt(now)
    const endTs = endTime ? BigInt(Math.floor(new Date(endTime).getTime() / 1000)) : 0n
    const maxExec = maxExecutions ? BigInt(maxExecutions) : 0n

    create({
      address: CONTRACT_ADDRESSES.ScheduledPayout,
      abi: SCHEDULED_PAYOUT_ABI,
      functionName: 'createSchedule',
      args: [recipient as `0x${string}`, parseUsdc(amount), startTs, endTs, intervalSeconds, maxExec, description],
    }, {
      onSuccess: () => { toast.success('Schedule created!'); refetchIds() },
      onError: (e) => toast.error(parseOnchainError(e)),
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>Scheduled Payout</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Recurring or one-time USDC payments. Fund a pool and payments execute automatically when due.
        </p>
      </div>

      {notDeployed && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contract not deployed</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Set VITE_SCHEDULED_PAYOUT in .env after deploying.</p>
        </div>
      )}

      <Card>
        <CardLabel>Create Schedule</CardLabel>
        <div className="mt-4 space-y-3">
          <Input label="Recipient" value={recipient} onChange={setRecipient} placeholder="0x…"
            error={recipient && !isValidAddress(recipient) ? 'Invalid address' : undefined} />
          <Input label="Amount per period (USDC)" value={amount} onChange={setAmount} placeholder="0.00" inputMode="decimal" />

          {/* Interval */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Payment interval</p>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map((p) => (
                <button key={p.label} onClick={() => setIntervalPreset(p.seconds)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${intervalPreset === p.seconds ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--ink-2)]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {intervalPreset === 0 && (
              <Input className="mt-2" value={customInterval} onChange={setCustomInterval}
                placeholder="Interval in seconds (min 86400)" inputMode="numeric" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input label="Start time (optional)" type="datetime-local" value={startTime} onChange={setStartTime} />
            <Input label="End time (optional)" type="datetime-local" value={endTime} onChange={setEndTime} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Max executions (0 = unlimited)" value={maxExecutions} onChange={setMaxExecutions} placeholder="0" inputMode="numeric" />
            <Input label="Description" value={description} onChange={setDescription} placeholder="Payroll, subscription…" />
          </div>

          <TxButton label="Create Schedule" onClick={handleCreate} isPending={isCreating}
            isConfirming={isConfirmingCreate} isSuccess={createSuccess} />
          {createHash && (
            <a href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, createHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-hover)' }}>
              <ExternalLink className="size-3" /> View transaction
            </a>
          )}
        </div>
      </Card>

      {/* Fund a schedule */}
      <Card>
        <CardLabel>Fund Schedule</CardLabel>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Schedule ID" value={fundId} onChange={setFundId} placeholder="ID" inputMode="numeric" />
            <Input label="Fund amount (USDC)" value={fundAmount} onChange={setFundAmount} placeholder="0.00" inputMode="decimal" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleApprove} loading={isApproving} disabled={!address || parsedFundAmount === 0n}>
              {approved ? 'Approved' : 'Approve USDC'}
            </Button>
            <TxButton label="Fund" onClick={() => fund({
              address: CONTRACT_ADDRESSES.ScheduledPayout, abi: SCHEDULED_PAYOUT_ABI,
              functionName: 'fundSchedule', args: [BigInt(fundId || '0'), parsedFundAmount],
            })} isPending={isFunding} isConfirming={isConfirmingFund} isSuccess={fundSuccess} disabled={!approved || !fundId} />
          </div>
        </div>
      </Card>

      {/* Execute / cancel */}
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <CardLabel>Execute Schedule</CardLabel>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Permissionless — anyone can trigger when due.</p>
            <Input value={executeId} onChange={setExecuteId} placeholder="Schedule ID" inputMode="numeric" />
            {executeId && isDue !== undefined && (
              <Badge variant={isDue ? 'success' : 'muted'} className="mt-2">{isDue ? 'Due now' : 'Not due yet'}</Badge>
            )}
            <TxButton label={<span className="flex items-center gap-2"><Play className="size-3.5" />Execute</span> as unknown as string}
              onClick={() => execute({
                address: CONTRACT_ADDRESSES.ScheduledPayout, abi: SCHEDULED_PAYOUT_ABI,
                functionName: 'executeSchedule', args: [BigInt(executeId || '0')],
              })} isPending={isExecuting} isConfirming={isConfirmingExec} isSuccess={execSuccess}
              disabled={!executeId || !isDue} className="mt-2" />
          </div>
          <div>
            <CardLabel>Cancel Schedule</CardLabel>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Refunds remaining balance to payer.</p>
            <Input value={cancelId} onChange={setCancelId} placeholder="Schedule ID" inputMode="numeric" />
            <Button variant="danger" className="mt-2 w-full" onClick={() => cancel({
              address: CONTRACT_ADDRESSES.ScheduledPayout, abi: SCHEDULED_PAYOUT_ABI,
              functionName: 'cancelSchedule', args: [BigInt(cancelId || '0')],
            })} loading={isCancelling || isConfirmingCancel} disabled={!cancelId}>
              <XCircle className="size-3.5" /> Cancel
            </Button>
          </div>
        </div>
      </Card>

      {/* View schedule */}
      <Card>
        <CardLabel>Look Up Schedule</CardLabel>
        <div className="mt-3">
          <Input value={viewId} onChange={setViewId} placeholder="Schedule ID" inputMode="numeric" />
          {viewSchedule && (
            <InnerCard className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={viewSchedule.active ? 'success' : 'muted'}>{viewSchedule.active ? 'Active' : 'Inactive'}</Badge>
                <span className="text-xs mono tabular-nums" style={{ color: 'var(--subtle)' }}>
                  Balance: {viewBalance !== undefined ? formatUsdc(viewBalance) : '…'} USDC
                </span>
              </div>
              <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
                <p>Recipient: <span className="mono">{formatAddress(viewSchedule.recipient)}</span></p>
                <p>Amount: <span className="tabular-nums font-semibold">{formatUsdc(viewSchedule.amount)} USDC</span></p>
                <p>Interval: {formatDuration(viewSchedule.intervalSeconds)}</p>
                <p>Executions: {viewSchedule.executionCount.toString()}{viewSchedule.maxExecutions > 0n ? ` / ${viewSchedule.maxExecutions}` : ''}</p>
                <p>Total paid: {formatUsdc(viewSchedule.totalPaid)} USDC</p>
                {viewSchedule.lastExecuted > 0n && <p>Last executed: {formatTimestamp(viewSchedule.lastExecuted)}</p>}
                {viewSchedule.description && <p>Description: {viewSchedule.description}</p>}
              </div>
            </InnerCard>
          )}
        </div>
      </Card>

      {/* Payer schedule list */}
      {payerIds && payerIds.length > 0 && (
        <Card>
          <CardLabel>Your Schedules ({payerIds.length})</CardLabel>
          <div className="mt-3 space-y-1">
            {[...payerIds].reverse().slice(0, 8).map((id) => (
              <ScheduleRow key={id.toString()} id={id} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ScheduleRow({ id }: { id: bigint }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESSES.ScheduledPayout,
    abi: SCHEDULED_PAYOUT_ABI,
    functionName: 'getSchedule',
    args: [id],
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!CONTRACT_ADDRESSES.ScheduledPayout },
  })
  if (!data) return null
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--surface-muted)]">
      <div className="flex items-center gap-2">
        <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>#{id.toString()}</span>
        <Badge variant={data.active ? 'success' : 'muted'}>{data.active ? 'Active' : 'Inactive'}</Badge>
        {data.description && <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{data.description}</span>}
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
        {formatUsdc(data.amount)} USDC / {formatDuration(data.intervalSeconds)}
      </span>
    </div>
  )
}
