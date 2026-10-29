/**
 * Pact Backend Server
 * - Indexes onchain events from all five contracts
 * - Monitors due scheduled payouts for operator action
 * - Exposes a REST API for the frontend to query indexed state
 *
 * Run: bun run server/index.ts
 * The Vite dev server proxies /api/* to http://localhost:3001 (see vite.config.ts)
 */

import { createPublicClient, defineChain, http, parseAbi, type AbiEvent } from 'viem'

const PORT = parseInt(process.env.SERVER_PORT ?? '3001')

// ---------------------------------------------------------------------------
// Chain + RPC
// ---------------------------------------------------------------------------
const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
})
const rpcUrl = process.env.ARC_RPC_URL ?? arcMainnet.rpcUrls.default.http[0]
const client = createPublicClient({ chain: arcMainnet, transport: http(rpcUrl), cacheTime: 0 })

// ---------------------------------------------------------------------------
// Contract addresses from env (set after deploy)
// ---------------------------------------------------------------------------
const ADDR = {
  EscrowManager:     (process.env.VITE_ESCROW_MANAGER     ?? '') as `0x${string}`,
  ConditionalPayout: (process.env.VITE_CONDITIONAL_PAYOUT ?? '') as `0x${string}`,
  BatchPayout:       (process.env.VITE_BATCH_PAYOUT        ?? '') as `0x${string}`,
  ScheduledPayout:   (process.env.VITE_SCHEDULED_PAYOUT    ?? '') as `0x${string}`,
  VestingVault:      (process.env.VITE_VESTING_VAULT       ?? '') as `0x${string}`,
}

const isDeployed = (addr: string) => addr && addr.length > 2

// ---------------------------------------------------------------------------
// In-memory event store (replace with PostgreSQL for production)
// ---------------------------------------------------------------------------
type IndexedEvent = {
  blockNumber: bigint
  txHash: string
  contractName: string
  eventName: string
  args: Record<string, unknown>
  timestamp: number
}

const eventStore: IndexedEvent[] = []
let lastIndexedBlock = 0n
let hasIndexed = false

// ---------------------------------------------------------------------------
// ABIs (event-only, minimal)
// ---------------------------------------------------------------------------
const ESCROW_EVENTS = parseAbi([
  'event EscrowCreated(uint256 indexed escrowId, address indexed depositor, address indexed beneficiary, address arbiter, uint256 amount, uint256 deadline, string description)',
  'event EscrowFunded(uint256 indexed escrowId, address indexed depositor, uint256 amount)',
  'event Released(uint256 indexed escrowId, address indexed beneficiary, uint256 amount)',
  'event Refunded(uint256 indexed escrowId, uint256 amount)',
  'event Disputed(uint256 indexed escrowId, address indexed caller)',
  'event Resolved(uint256 indexed escrowId, bool releasedToBeneficiary, uint256 amount)',
  'event MilestoneReleased(uint256 indexed escrowId, uint256 milestoneIndex, uint256 amount)',
  'event MilestoneDisputed(uint256 indexed escrowId, uint256 milestoneIndex)',
  'event MilestoneResolved(uint256 indexed escrowId, uint256 milestoneIndex, bool releasedToBeneficiary, uint256 amount)',
])

const CONDITIONAL_EVENTS = parseAbi([
  'event AgreementCreated(uint256 indexed agreementId, address indexed payer, address indexed recipient, address approver, uint256 amount, uint256 conditionDeadline, string conditionDescription, string metadataURI)',
  'event AgreementFunded(uint256 indexed agreementId, address indexed payer, uint256 amount)',
  'event ConditionApproved(uint256 indexed agreementId, address indexed approver, address indexed recipient, uint256 amount)',
  'event AgreementCancelled(uint256 indexed agreementId)',
  'event AgreementExpired(uint256 indexed agreementId, uint256 amountRefunded)',
])

const BATCH_EVENTS = parseAbi([
  'event BatchExecuted(bytes32 indexed paymentSetId, address indexed payer, uint256 recipientCount, uint256 totalAmount)',
  'event PaymentSent(bytes32 indexed paymentSetId, address indexed recipient, uint256 amount)',
])

const SCHEDULED_EVENTS = parseAbi([
  'event ScheduleCreated(uint256 indexed scheduleId, address indexed payer, address indexed recipient, uint256 amount, uint256 startTime, uint256 endTime, uint256 intervalSeconds, uint256 maxExecutions, string description)',
  'event ScheduleFunded(uint256 indexed scheduleId, address indexed payer, uint256 fundAmount, uint256 newBalance)',
  'event ScheduleExecuted(uint256 indexed scheduleId, address indexed caller, address indexed recipient, uint256 amount, uint256 executionCount, uint256 totalPaid)',
  'event ScheduleCancelled(uint256 indexed scheduleId, uint256 refundedAmount)',
  'event FundsWithdrawn(uint256 indexed scheduleId, uint256 amount, uint256 remainingBalance)',
])

const VESTING_EVENTS = parseAbi([
  'event ScheduleCreated(uint256 indexed vestingId, address indexed grantor, address indexed beneficiary, uint256 totalAmount, uint256 startTime, uint256 endTime, uint256 cliffTime, uint8 vestingType, uint256 intervalSeconds, bool revocable)',
  'event VestingClaimed(uint256 indexed vestingId, address indexed beneficiary, uint256 amountClaimed, uint256 totalClaimed)',
  'event ScheduleRevoked(uint256 indexed vestingId, address indexed grantor, uint256 unvestedRefunded, uint256 revokedAt)',
])

// ---------------------------------------------------------------------------
// Scheduled payout executor ABI
// ---------------------------------------------------------------------------
const EXECUTE_ABI = parseAbi([
  'function executeSchedule(uint256 scheduleId) external',
  'function getPayerSchedules(address payer) external view returns (uint256[])',
  'function isDue(uint256 scheduleId) external view returns (bool)',
  'function getSchedule(uint256 scheduleId) external view returns (address payer, address recipient, uint256 amount, uint256 startTime, uint256 endTime, uint256 intervalSeconds, uint256 lastExecuted, uint256 totalPaid, uint256 maxExecutions, uint256 executionCount, bool active, string description)',
])

// ---------------------------------------------------------------------------
// Indexer
// ---------------------------------------------------------------------------
async function indexEvents(fromBlock: bigint, toBlock: bigint) {
  const contracts: { name: string; addr: `0x${string}`; abi: readonly AbiEvent[] }[] = []

  if (isDeployed(ADDR.EscrowManager))
    contracts.push({ name: 'EscrowManager', addr: ADDR.EscrowManager, abi: ESCROW_EVENTS })
  if (isDeployed(ADDR.ConditionalPayout))
    contracts.push({ name: 'ConditionalPayout', addr: ADDR.ConditionalPayout, abi: CONDITIONAL_EVENTS })
  if (isDeployed(ADDR.BatchPayout))
    contracts.push({ name: 'BatchPayout', addr: ADDR.BatchPayout, abi: BATCH_EVENTS })
  if (isDeployed(ADDR.ScheduledPayout))
    contracts.push({ name: 'ScheduledPayout', addr: ADDR.ScheduledPayout, abi: SCHEDULED_EVENTS })
  if (isDeployed(ADDR.VestingVault))
    contracts.push({ name: 'VestingVault', addr: ADDR.VestingVault, abi: VESTING_EVENTS })

  const indexedEvents: IndexedEvent[] = []
  for (const contract of contracts) {
    const logs = await client.getLogs({
      address: contract.addr,
      events: contract.abi,
      strict: true,
      fromBlock,
      toBlock,
    })
    for (const log of logs) {
      indexedEvents.push({
        blockNumber: log.blockNumber ?? 0n,
        txHash: log.transactionHash ?? '',
        contractName: contract.name,
        eventName: log.eventName,
        args: log.args as Record<string, unknown>,
        timestamp: Date.now(),
      })
    }
  }

  eventStore.push(...indexedEvents)
  lastIndexedBlock = toBlock
  hasIndexed = true
}

// ---------------------------------------------------------------------------
// Scheduler: check and execute due scheduled payouts
// ---------------------------------------------------------------------------
async function checkAndExecuteDueSchedules() {
  if (!isDeployed(ADDR.ScheduledPayout)) return

  // Collect all known schedule IDs from indexed events
  const scheduleIds = new Set<bigint>()
  for (const ev of eventStore) {
    if (ev.contractName === 'ScheduledPayout' && ev.args.scheduleId !== undefined) {
      scheduleIds.add(BigInt(ev.args.scheduleId as string))
    }
  }

  for (const id of scheduleIds) {
    try {
      const due = await client.readContract({
        address: ADDR.ScheduledPayout,
        abi: EXECUTE_ABI,
        functionName: 'isDue',
        args: [id],
      })
      if (due) {
        console.log(`[Scheduler] Schedule ${id} is due — logging for operator action`)
        // In production: sign and submit executeSchedule via a funded executor wallet
        // For now: emit a log so operators know to trigger it
      }
    } catch {
      // skip
    }
  }
}

// ---------------------------------------------------------------------------
// Polling loop
// ---------------------------------------------------------------------------
const BATCH_SIZE = 2000n
const POLL_MS = 15_000

let polling = false
export async function poll() {
  if (polling) return
  polling = true
  try {
    const head = await client.getBlockNumber()
    const from = !hasIndexed
      ? (head > BATCH_SIZE ? head - BATCH_SIZE : 0n)  // recent lookback on first run
      : lastIndexedBlock + 1n

    if (from > head) {
      await checkAndExecuteDueSchedules()
      return
    }

    const chunks: [bigint, bigint][] = []
    let cur = from
    while (cur <= head) {
      const end = cur + BATCH_SIZE - 1n < head ? cur + BATCH_SIZE - 1n : head
      chunks.push([cur, end])
      cur = end + 1n
    }

    for (const [f, t] of chunks) {
      await indexEvents(f, t)
    }

    await checkAndExecuteDueSchedules()

    console.log(`[Indexer] head=${head} indexed=${lastIndexedBlock} events=${eventStore.length}`)
  } catch (err) {
    console.error('[Indexer] poll error:', (err as Error).message)
  } finally {
    polling = false
  }
}

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------
export function handleRequest(req: Request): Response {
const url = new URL(req.url)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

if (req.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: cors })
}

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })

if (url.pathname === '/health') {
  return respond({ ok: true, lastIndexedBlock: lastIndexedBlock.toString(), events: eventStore.length })
}

if (url.pathname === '/events') {
  const contract = url.searchParams.get('contract')
  const requestedLimit = Number(url.searchParams.get('limit') ?? '100')
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return respond({ error: 'limit must be a positive integer' }, 400)
  }
  const limit = Math.min(requestedLimit, 500)
  const filtered = contract
    ? eventStore.filter((e) => e.contractName === contract)
    : eventStore
  return respond(filtered.slice(-limit).reverse())
}

if (url.pathname === '/events/address') {
  const addr = url.searchParams.get('address')?.toLowerCase()
  if (!addr) return respond({ error: 'address required' }, 400)
  const filtered = eventStore.filter((e) =>
    Object.values(e.args).some((v) =>
      typeof v === 'string' && v.toLowerCase() === addr
    )
  )
  return respond(filtered.slice(-100).reverse())
}

return respond({ error: 'Not found' }, 404)
}

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: handleRequest })
  console.log(`[Pact Backend] Listening on http://localhost:${PORT}`)
  console.log(`[Pact Backend] Chain: Arc Mainnet (${arcMainnet.id})`)
  void poll()
  setInterval(() => { void poll() }, POLL_MS)
}
