import { useState, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { keccak256, toHex } from 'viem'
import { Card, InnerCard, CardLabel } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TxButton } from '@/components/ui/TxButton'
import { Plus, Trash2, Upload, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  BATCH_PAYOUT_ABI, ERC20_ABI, USDC_ADDRESS, CONTRACT_ADDRESSES, ARC_CHAIN_ID,
} from '@/lib/contracts'
import { isValidAddress, parseUsdc, formatUsdc, parseOnchainError } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

type Row = { recipient: string; amount: string; error?: string }

function validateRow(r: Row): string | undefined {
  if (!r.recipient) return 'Required'
  if (!isValidAddress(r.recipient)) return 'Invalid address'
  if (!r.amount || Number(r.amount) <= 0) return 'Invalid amount'
  return undefined
}

export function BatchPanel() {
  const { address } = useAccount()
  const [rows, setRows] = useState<Row[]>([{ recipient: '', amount: '' }])
  const [paymentSetId, setPaymentSetId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { writeContract: approve, data: approveHash } = useWriteContract()
  const { isLoading: isApproving, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: execute, data: execHash, isPending: isExecuting, error: execError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: execSuccess } = useWaitForTransactionReceipt({ hash: execHash })

  const validRows = rows.filter((r) => !validateRow(r))
  const totalAmount = validRows.reduce((s, r) => {
    try { return s + parseUsdc(r.amount) } catch { return s }
  }, 0n)

  const hasDuplicateRecipients = (() => {
    const seen = new Set<string>()
    return rows.some((r) => {
      if (!r.recipient || !isValidAddress(r.recipient)) return false
      const k = r.recipient.toLowerCase()
      if (seen.has(k)) return true
      seen.add(k)
      return false
    })
  })()

  const allValid = rows.length > 0 && rows.every((r) => !validateRow(r)) && !hasDuplicateRecipients

  function addRow() { setRows([...rows, { recipient: '', amount: '' }]) }
  function removeRow(i: number) { setRows(rows.filter((_, idx) => idx !== i)) }
  function updateRow(i: number, field: keyof Row, value: string) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      const parsed: Row[] = []
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim())
        if (parts.length >= 2) {
          parsed.push({ recipient: parts[0], amount: parts[1] })
        }
      }
      if (parsed.length === 0) { toast.error('No valid rows in CSV'); return }
      if (parsed.length > 500) { toast.error('Maximum 500 recipients'); return }
      setRows(parsed)
      toast.success(`Loaded ${parsed.length} recipients`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function autoSetId() {
    const content = rows.map((r) => `${r.recipient}:${r.amount}`).join('|')
    const id = keccak256(toHex(content + Date.now()))
    setPaymentSetId(id)
  }

  function handleApprove() {
    if (!CONTRACT_ADDRESSES.BatchPayout) return
    approve({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.BatchPayout, totalAmount] })
  }

  function handleExecute() {
    if (!allValid) { toast.error('Fix validation errors first'); return }
    if (!paymentSetId || paymentSetId.length !== 66) { toast.error('Set a valid payment set ID (bytes32 hex)'); return }

    const recipients = rows.map((r) => ({
      recipient: r.recipient as `0x${string}`,
      amount: parseUsdc(r.amount),
    }))

    execute({
      address: CONTRACT_ADDRESSES.BatchPayout,
      abi: BATCH_PAYOUT_ABI,
      functionName: 'executeBatch',
      args: [paymentSetId as `0x${string}`, recipients],
    }, {
      onSuccess: () => toast.success(`Batch of ${recipients.length} payments sent!`),
      onError: (e) => toast.error(parseOnchainError(e)),
    })
  }

  const notDeployed = !CONTRACT_ADDRESSES.BatchPayout

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Batch Payout</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Send USDC to multiple recipients in a single transaction. Import from CSV or enter manually.
        </p>
      </div>

      {notDeployed && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.18)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>Contract not deployed</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Set VITE_BATCH_PAYOUT in .env after deploying.</p>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardLabel>Recipients</CardLabel>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3" /> Import CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={addRow} disabled={rows.length >= 500}>
              <Plus className="size-3" /> Add Row
            </Button>
          </div>
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
          CSV format: address,amount (one per line, no header required)
        </p>

        {hasDuplicateRecipients && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ background: 'rgba(186,43,76,0.08)' }}>
            <AlertCircle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Duplicate recipient addresses detected</p>
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {rows.map((r, i) => {
            return (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={r.recipient} onChange={(v) => updateRow(i, 'recipient', v)}
                    placeholder="0x… address" error={r.recipient && !isValidAddress(r.recipient) ? 'Invalid' : undefined} />
                  <Input value={r.amount} onChange={(v) => updateRow(i, 'amount', v)}
                    placeholder="0.00" inputMode="decimal"
                    error={r.amount && Number(r.amount) <= 0 ? 'Invalid' : undefined} />
                </div>
                <button onClick={() => removeRow(i)} className="mt-2 p-1.5 rounded-lg hover:bg-[var(--surface-muted)]" disabled={rows.length <= 1}>
                  <Trash2 className="size-3.5" style={{ color: rows.length > 1 ? 'var(--danger)' : 'var(--subtle)' }} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <InnerCard className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Recipients</p>
              <p className="font-semibold tabular-nums">{validRows.length} valid of {rows.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Total</p>
              <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatUsdc(totalAmount)} <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
              </p>
            </div>
          </div>
        </InnerCard>
      </Card>

      {/* Payment set ID */}
      <Card>
        <CardLabel>Payment Set ID</CardLabel>
        <p className="text-xs mt-1 mb-3" style={{ color: 'var(--muted)' }}>
          Unique bytes32 identifier — prevents duplicate execution of the same batch.
        </p>
        <div className="flex gap-2">
          <Input value={paymentSetId} onChange={setPaymentSetId} placeholder="0x… (bytes32)" className="flex-1" />
          <Button variant="secondary" size="sm" onClick={autoSetId}>Auto</Button>
        </div>
        {paymentSetId && paymentSetId.length !== 66 && (
          <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Must be a 66-char 0x-prefixed hex string (bytes32)</p>
        )}
      </Card>

      {/* Actions */}
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={handleApprove} loading={isApproving} disabled={!address || !allValid || totalAmount === 0n}>
            {approved ? 'USDC Approved' : 'Approve USDC'}
          </Button>
          <TxButton label={`Send to ${validRows.length} recipients`} onClick={handleExecute}
            isPending={isExecuting} isConfirming={isConfirming} isSuccess={execSuccess}
            disabled={!approved || !allValid} />
        </div>
        {execHash && (
          <a href={buildTxExplorerUrl(ARC_CHAIN_ID, execHash)} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs mt-3" style={{ color: 'var(--accent-hover)' }}>
            <ExternalLink className="size-3" /> View transaction
          </a>
        )}
        {execSuccess && (
          <div className="flex items-center gap-2 mt-3">
            <CheckCircle2 className="size-4" style={{ color: 'var(--success)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Batch executed successfully!</p>
          </div>
        )}
        {execError && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{parseOnchainError(execError)}</p>}
      </Card>
    </div>
  )
}
