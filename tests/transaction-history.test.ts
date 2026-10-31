import { expect, test } from 'bun:test'
import { encodeFunctionData, type Address, type Abi } from 'viem'
import { mergeHistory, fetchHistoryPage, type ExplorerItem, type HistoryFeature } from '../src/lib/transaction-history'
import {
  ORIGINAL_CONTRACT_ADDRESSES as addresses, DEFAULT_CONTRACT_ADDRESSES as current, USDC_ADDRESS, ERC20_ABI, ESCROW_MANAGER_ABI,
  CONDITIONAL_PAYOUT_ABI, BATCH_PAYOUT_ABI, SCHEDULED_PAYOUT_ABI, VESTING_VAULT_ABI,
} from '../src/lib/contracts'

const wallet: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const recipient: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`
const tx = (n: number, to: string, abi: Abi, functionName: string, args: unknown[]): ExplorerItem => ({
  hash: hash(n), from: { hash: wallet }, to: { hash: to }, block_number: n, status: 'ok',
  raw_input: encodeFunctionData({ abi, functionName, args }), fee: { value: '525000000000000' },
})
const transfer = (n: number, from: string, to: string, log: number): ExplorerItem => ({
  transaction_hash: hash(n), block_number: n, from: { hash: from }, to: { hash: to }, log_index: log,
  token: { address_hash: USDC_ADDRESS, decimals: '6', symbol: 'USDC' }, total: { value: '10', decimals: '6' },
})

test('classifies the original deployments for all five payment features with exact batch totals', () => {
  const items = [
    tx(1, addresses.EscrowManager, ESCROW_MANAGER_ABI, 'approveMilestone', [2n, 0n]),
    tx(2, addresses.ConditionalPayout, CONDITIONAL_PAYOUT_ABI, 'approveCondition', [2n]),
    tx(3, addresses.BatchPayout, BATCH_PAYOUT_ABI, 'executeBatch', [hash(55), [{ recipient, amount: 10n }, { recipient: wallet, amount: 1n }]]),
    tx(4, addresses.ScheduledPayout, SCHEDULED_PAYOUT_ABI, 'executeSchedule', [3n]),
    tx(5, addresses.VestingVault, VESTING_VAULT_ABI, 'revokeSchedule', [2n]),
  ]
  const records = mergeHistory(wallet, { transactions: items })
  expect(records.map((r) => r.feature)).toEqual(['vesting', 'scheduled', 'batch', 'conditional', 'escrow'])
  expect(records.find((r) => r.feature === 'batch')?.detail).toBe('2 recipients · 0.000011 USDC')
  expect(records[4].detail).toBe('Record #2 · Milestone #1')
  expect(records[0].action).toBe('Revoke vesting')
  expect(records[0].fee).toBe('0.000525')
})

test('merges repeated pages by hash and log index without losing equal-value transfers', () => {
  const transaction = tx(1, addresses.BatchPayout, BATCH_PAYOUT_ABI, 'executeBatch', [hash(55), [{ recipient: wallet, amount: 10n }, { recipient: wallet, amount: 10n }]])
  const first = transfer(1, addresses.BatchPayout, wallet, 5)
  const second = transfer(1, addresses.BatchPayout, wallet, 6)
  const records = mergeHistory(wallet, { transactions: [transaction, transaction], 'token-transfers': [first, second, first] })
  expect(records).toHaveLength(1)
  expect(records[0].transfers).toHaveLength(2)
  expect(records[0].transfers[0]).toMatchObject({ amount: '0.00001', direction: 'Received' })
})

test('replacement payments, received refunds, and approvals keep their feature classifications', () => {
  const records = mergeHistory(wallet, {
    transactions: [
      tx(1, current.EscrowManager, ESCROW_MANAGER_ABI, 'claimRefund', [1n]),
      tx(2, current.ConditionalPayout, CONDITIONAL_PAYOUT_ABI, 'approveCondition', [1n]),
      tx(3, USDC_ADDRESS, ERC20_ABI, 'approve', [current.ScheduledPayout, 35n]),
    ],
    'token-transfers': [transfer(4, current.ScheduledPayout, wallet, 1)],
  })
  expect(records.map((r) => r.feature)).toEqual(['scheduled', 'scheduled', 'conditional', 'escrow'])
  expect(records[0].action).toBe('Received payout / refund')
  expect(records[1].detail).toBe('0.000035 USDC allowance')
  expect(records[3].action).toBe('Claim refund')
})

test('includes received payouts triggered by a different wallet and ordinary Arc activity', () => {
  const items = [transfer(1, addresses.ScheduledPayout, wallet, 1), transfer(2, recipient, wallet, 1)]
  const records = mergeHistory(wallet, { 'token-transfers': items })
  expect(records[1]).toMatchObject({ feature: 'scheduled', status: 'Successful', action: 'Received payout / refund' })
  expect(records[0]).toMatchObject({ feature: 'other', action: 'Received transfer' })
})

test('USDC approvals are assigned to their Pact spender; failed and pending statuses remain distinct', () => {
  const approval = tx(1, USDC_ADDRESS, ERC20_ABI, 'approve', [addresses.ScheduledPayout, 1n])
  const failed = { ...approval, hash: hash(2), block_number: 2, status: 'error' }
  const pending = { ...approval, hash: hash(3), block_number: null, status: null }
  const records = mergeHistory(wallet, { transactions: [approval, failed, pending] })
  expect(records.map((r) => r.status)).toEqual(['Pending', 'Failed', 'Successful'])
  expect(records.every((r) => r.feature === ('scheduled' satisfies HistoryFeature))).toBe(true)
  expect(records[2].detail).toBe('0.000001 USDC allowance')
})

test('Arc native USDC and its mirrored ERC20 log are shown once with native precision', () => {
  const transaction: ExplorerItem = { hash: hash(1), block_number: 1, status: 'ok', raw_input: '0x',
    from: { hash: wallet }, to: { hash: recipient }, value: '10000000000001' }
  const record = mergeHistory(wallet, { transactions: [transaction], 'token-transfers': [transfer(1, wallet, recipient, 1)] })[0]
  expect(record.transfers).toHaveLength(1)
  expect(record.transfers[0].amount).toBe('0.000010000000000001')
})

test('internal native receipts keep 18-decimal amounts and stay isolated to the requested wallet', () => {
  const records = mergeHistory(wallet, { 'internal-transactions': [{ transaction_hash: hash(1), block_number: 1,
    from: { hash: recipient }, to: { hash: wallet }, success: true, value: '1', index: 0 }] })
  expect(records[0].transfers[0]).toMatchObject({ direction: 'Received', amount: '0.000000000000000001' })
  expect(mergeHistory(recipient, {})).toEqual([])
  const failedCall = mergeHistory(wallet, { 'internal-transactions': [{ transaction_hash: hash(2), block_number: 2,
    from: { hash: recipient }, to: { hash: wallet }, success: false, error: 'revert', value: '1', index: 0 }] })
  expect(failedCall[0]).toMatchObject({ status: 'Unknown', action: 'Failed internal call' })
})

test('history requests preserve indexed cursors and reject explorer failures instead of reporting empty history', async () => {
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return Response.json({ items: [], next_page_params: { block_number: 12, index: 2 } })
  }, { preconnect: original.preconnect })
  try {
    const page = await fetchHistoryPage(wallet, 'transactions', { block_number: 22, index: 3 })
    expect(new URL(calls[0]).searchParams.get('block_number')).toBe('22')
    expect(page.next_page_params).toEqual({ block_number: 12, index: 2 })
    globalThis.fetch = Object.assign(async () => new Response('Unavailable', { status: 403 }), { preconnect: original.preconnect })
    await expect(fetchHistoryPage(wallet, 'token-transfers', null)).rejects.toThrow('403')
    globalThis.fetch = Object.assign(async () => Response.json({ error: 'bad response' }), { preconnect: original.preconnect })
    await expect(fetchHistoryPage(wallet, 'transactions', null)).rejects.toThrow('unexpected history response')
  } finally { globalThis.fetch = original }
})
