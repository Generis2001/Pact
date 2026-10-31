import { decodeFunctionData, formatUnits, parseUnits, type Abi, type Address, type Hex } from 'viem'
import {
  CONTRACT_ADDRESSES, ORIGINAL_CONTRACT_ADDRESSES, USDC_ADDRESS,
  ESCROW_MANAGER_ABI, CONDITIONAL_PAYOUT_ABI, BATCH_PAYOUT_ABI, SCHEDULED_PAYOUT_ABI, VESTING_VAULT_ABI, ERC20_ABI,
} from './contracts'

export const HISTORY_API = 'https://explorer.arc.io/api/v2'
export const HISTORY_STREAMS = ['transactions', 'token-transfers', 'internal-transactions'] as const
export type HistoryStream = typeof HISTORY_STREAMS[number]
export type HistoryCursor = Record<string, string | number | boolean>
export type HistoryFeature = 'escrow' | 'conditional' | 'batch' | 'scheduled' | 'vesting' | 'other'
export const HISTORY_LABELS: Record<HistoryFeature, string> = {
  escrow: 'Escrow', conditional: 'Conditional Payout', batch: 'Batch Payout',
  scheduled: 'Scheduled Payout', vesting: 'Vesting', other: 'Other Arc activity',
}
type ExplorerAddress = { hash: string }
export type ExplorerItem = {
  hash?: string; transaction_hash?: string; block_number?: number | null; timestamp?: string | null
  from?: ExplorerAddress | null; to?: ExplorerAddress | null; created_contract?: ExplorerAddress | null
  status?: string | null; result?: string; success?: boolean; error?: string | null
  raw_input?: string; method?: string | null; value?: string; fee?: { value: string }
  log_index?: number; index?: number
  token?: { address_hash: string; symbol?: string | null; decimals?: string | null; type?: string }
  total?: { value?: string; decimals?: string | null; token_id?: string }
}
export type HistoryPage = { items: ExplorerItem[]; next_page_params: HistoryCursor | null }

/** Public indexed pagination; no wallet signature or session-only storage. */
export async function fetchHistoryPage(address: Address, stream: HistoryStream, cursor: HistoryCursor | null, signal?: AbortSignal): Promise<HistoryPage> {
  const url = new URL(`${HISTORY_API}/addresses/${address}/${stream}`)
  for (const [key, value] of Object.entries(cursor ?? {})) url.searchParams.set(key, String(value))
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 20_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Arc explorer could not load ${stream.replace(/-/g, ' ')} (${response.status}). Please retry.`)
    // Cloudflare or HTML failures must never appear as an empty wallet history.
    const data = await response.json() as HistoryPage
    if (!Array.isArray(data.items) || !('next_page_params' in data)) throw new Error('Arc explorer returned an unexpected history response. Please retry.')
    return data
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('Arc explorer took too long to respond. Please retry.')
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

const modules: { name: keyof typeof CONTRACT_ADDRESSES; feature: HistoryFeature; abi: Abi }[] = [
  { name: 'EscrowManager', feature: 'escrow', abi: ESCROW_MANAGER_ABI },
  { name: 'ConditionalPayout', feature: 'conditional', abi: CONDITIONAL_PAYOUT_ABI },
  { name: 'BatchPayout', feature: 'batch', abi: BATCH_PAYOUT_ABI },
  { name: 'ScheduledPayout', feature: 'scheduled', abi: SCHEDULED_PAYOUT_ABI },
  { name: 'VestingVault', feature: 'vesting', abi: VESTING_VAULT_ABI },
]
const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
const moduleAt = (address?: string | null) => modules.find((m) => same(address, CONTRACT_ADDRESSES[m.name]) || same(address, ORIGINAL_CONTRACT_ADDRESSES[m.name]))
const actions: Record<string, string> = {
  createEscrow: 'Create escrow', fundEscrow: 'Fund escrow', approveRelease: 'Approve escrow release',
  approveMilestone: 'Approve milestone', disputeMilestone: 'Dispute milestone', resolveMilestone: 'Resolve milestone',
  initiateDispute: 'Open dispute', resolveDispute: 'Resolve dispute', claimRefund: 'Claim refund',
  createAgreement: 'Create agreement', fundAgreement: 'Fund agreement', approveCondition: 'Approve condition',
  releasePayment: 'Release payment', cancelAgreement: 'Cancel agreement', claimExpired: 'Claim expired agreement',
  executeBatch: 'Batch payout', createSchedule: 'Create schedule', fundSchedule: 'Fund schedule',
  executeSchedule: 'Scheduled payout', cancelSchedule: 'Cancel schedule', withdrawExcessFunds: 'Withdraw schedule funds',
  createVesting: 'Create vesting', claim: 'Claim vesting', revoke: 'Revoke vesting',
  claimVested: 'Claim vesting', revokeSchedule: 'Revoke vesting', claimExpiry: 'Claim expired agreement',
}
export type HistoryTransfer = {
  key: string; from: string; to: string; amount: string; asset: string; token?: string; direction: 'Received' | 'Sent' | 'Self'
}
export type HistoryRecord = {
  hash: Hex; timestamp?: string | null; block?: number | null; status: 'Successful' | 'Failed' | 'Pending' | 'Unknown'
  from?: string; to?: string; feature: HistoryFeature; action: string; detail?: string; fee?: string
  transfers: HistoryTransfer[]; transaction?: ExplorerItem
}

function amount(value?: string, decimals?: string | null): string {
  if (!value || !/^\d+$/.test(value) || decimals == null || !/^\d+$/.test(decimals)) return 'Unknown amount'
  const precision = Number(decimals)
  if (precision > 80) return 'Unknown amount'
  return formatUnits(BigInt(value), precision)
}

function describe(transaction: ExplorerItem) {
  const target = transaction.to?.hash ?? transaction.created_contract?.hash
  const module = moduleAt(target)
  let feature = module?.feature ?? 'other'
  let action = transaction.created_contract ? 'Deploy contract' : transaction.raw_input === '0x' ? 'Transfer USDC' : 'Contract interaction'
  let detail: string | undefined
  try {
    const abi = module?.abi ?? (same(target, USDC_ADDRESS) ? ERC20_ABI : undefined)
    if (abi && transaction.raw_input) {
      const { functionName, args } = decodeFunctionData({ abi, data: transaction.raw_input as Hex })
      action = actions[functionName] ?? functionName.replace(/([A-Z])/g, ' $1')
      if (module?.feature === 'vesting' && functionName === 'createSchedule') action = 'Create vesting'
      if (functionName === 'approve') {
        feature = moduleAt(String(args?.[0]))?.feature ?? 'other'
        action = 'Approve USDC'
        detail = typeof args?.[1] === 'bigint' ? `${args[1] === 2n ** 256n - 1n ? 'Unlimited' : formatUnits(args[1], 6)} USDC allowance` : undefined
      } else if (functionName === 'executeBatch' && Array.isArray(args?.[1])) {
        const recipients = args[1] as { recipient: Address; amount: bigint }[]
        detail = `${recipients.length} recipients · ${formatUnits(recipients.reduce((total, r) => total + r.amount, 0n), 6)} USDC`
      } else if (typeof args?.[0] === 'bigint') {
        detail = `Record #${args[0]}${functionName.includes('Milestone') ? ` · Milestone #${Number(args?.[1]) + 1}` : ''}`
      }
    } else if (transaction.method && !transaction.method.startsWith('0x')) {
      action = actions[transaction.method] ?? transaction.method.replace(/([A-Z])/g, ' $1')
    }
  } catch { /* Unverified contracts and unknown selectors are still shown. */ }
  return { feature, action, detail }
}

/** Union all indexed activity by hash. Preserve distinct logs, including equal-value batch transfers. */
export function mergeHistory(wallet: Address, streams: Partial<Record<HistoryStream, ExplorerItem[]>>): HistoryRecord[] {
  const records = new Map<string, HistoryRecord>()
  for (const stream of HISTORY_STREAMS) {
    for (const item of streams[stream] ?? []) {
      const hash = item.hash ?? item.transaction_hash
      if (!hash || !/^0x[\da-f]{64}$/i.test(hash)) continue
      const key = hash.toLowerCase()
      let record = records.get(key)
      if (!record) {
        record = { hash: hash as Hex, timestamp: item.timestamp, block: item.block_number, status: 'Unknown',
          feature: 'other', action: 'Wallet activity', transfers: [] }
        records.set(key, record)
      }
      if (stream === 'transactions') {
        record.transaction = item
        record.from = item.from?.hash
        record.to = item.to?.hash ?? item.created_contract?.hash
        record.timestamp = item.timestamp
        record.block = item.block_number
        record.status = item.status === 'ok' ? 'Successful' : item.status === 'error' ? 'Failed'
          : item.block_number == null ? 'Pending' : 'Unknown'
        Object.assign(record, describe(item))
        record.fee = item.fee?.value ? amount(item.fee.value, '18') : undefined
      } else if (stream === 'internal-transactions' && !record.transaction) {
        // A failed internal call can be caught by a successful outer transaction.
        record.status = item.success === true ? 'Successful' : 'Unknown'
        record.from = item.from?.hash
        record.to = item.to?.hash ?? item.created_contract?.hash
        Object.assign(record, describe(item))
      }
      if (stream === 'internal-transactions' && item.success === false && !record.transaction) record.action = 'Failed internal call'
      if (stream === 'token-transfers' && record.status === 'Unknown') record.status = 'Successful'
      const isToken = stream === 'token-transfers'
      // Zero-value calls are not payments. Arc's native/USDC views are reconciled below.
      if ((isToken || (item.value && item.value !== '0')) && item.from?.hash && item.to?.hash) {
        const direction = same(item.from.hash, wallet) && same(item.to.hash, wallet) ? 'Self' : same(item.to.hash, wallet) ? 'Received' : 'Sent'
        const transferKey = `${stream}:${isToken ? item.log_index : stream === 'internal-transactions' ? item.index : 'native'}`
        if (!record.transfers.some((t) => t.key === transferKey)) {
          const nft = item.token?.type === 'ERC-721' || item.token?.type === 'ERC-1155'
          record.transfers.push({ key: transferKey, from: item.from.hash, to: item.to.hash, direction,
            amount: isToken ? (nft ? `Token #${item.total?.token_id ?? '?'}` : amount(item.total?.value, item.total?.decimals ?? item.token?.decimals)) : amount(item.value, '18'),
            asset: isToken ? (item.token?.symbol || 'Token') : 'USDC', token: item.token?.address_hash })
        }
        if (record.feature === 'other' && !(stream === 'internal-transactions' && item.success === false)) {
          const paymentModule = moduleAt(item.from.hash) ?? moduleAt(item.to.hash)
          if (paymentModule) {
            record.feature = paymentModule.feature
            record.action = direction === 'Received' ? 'Received payout / refund' : 'Payment funding'
          } else if (!record.transaction) record.action = direction === 'Received' ? 'Received transfer' : 'Transfer'
        }
      }
    }
  }
  for (const record of records.values()) {
    // Arc exposes its native USDC movement as an ERC20 log too. Keep the precise
    // native amount once, removing at most one matching log per native movement.
    const mirroredLogs = new Set<string>()
    for (const native of record.transfers.filter((t) => !t.token && t.amount !== 'Unknown amount')) {
      const mirror = record.transfers.find((t) => same(t.token, USDC_ADDRESS) && !mirroredLogs.has(t.key)
        && same(t.from, native.from) && same(t.to, native.to) && t.amount !== 'Unknown amount'
        && parseUnits(t.amount, 6) === parseUnits(native.amount, 18) / 10n ** 12n)
      if (mirror) mirroredLogs.add(mirror.key)
    }
    record.transfers = record.transfers.filter((t) => !mirroredLogs.has(t.key))
  }
  return [...records.values()].sort((a, b) => (b.block ?? Number.MAX_SAFE_INTEGER) - (a.block ?? Number.MAX_SAFE_INTEGER)
    || (Date.parse(b.timestamp ?? '') || 0) - (Date.parse(a.timestamp ?? '') || 0) || a.hash.localeCompare(b.hash))
}
