import { afterAll, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { encodeAbiParameters, encodeEventTopics, parseAbi, type Hex } from 'viem'

const scheduledAddress = '0x1111111111111111111111111111111111111111'
const vestingAddress = '0x2222222222222222222222222222222222222222'
const payer = '0x3333333333333333333333333333333333333333'
const recipient = '0x4444444444444444444444444444444444444444'
const originalEnv = { ...process.env }

const scheduledAbi = parseAbi([
  'event ScheduleCreated(uint256 indexed scheduleId, address indexed payer, address indexed recipient, uint256 amount, uint256 startTime, uint256 endTime, uint256 intervalSeconds, uint256 maxExecutions, string description)',
])
const vestingAbi = parseAbi([
  'event ScheduleCreated(uint256 indexed vestingId, address indexed grantor, address indexed beneficiary, uint256 totalAmount, uint256 startTime, uint256 endTime, uint256 cliffTime, uint8 vestingType, uint256 intervalSeconds, bool revocable)',
])

function logFor(address: Hex, block: bigint) {
  const scheduled = address === scheduledAddress
  const abi = scheduled ? scheduledAbi : vestingAbi
  const event = abi[0]
  const topics = scheduled
    ? encodeEventTopics({ abi: scheduledAbi, eventName: 'ScheduleCreated', args: { scheduleId: 1n, payer, recipient } })
    : encodeEventTopics({ abi: vestingAbi, eventName: 'ScheduleCreated', args: { vestingId: 2n, grantor: payer, beneficiary: recipient } })
  const data = scheduled
    ? encodeAbiParameters(event.inputs.filter((input) => !('indexed' in input && input.indexed)), [5000n, 1n, 1000n, 60n, 3n, 'Retainer'])
    : encodeAbiParameters(event.inputs.filter((input) => !('indexed' in input && input.indexed)), [10000n, 1n, 1000n, 0n, 0, 60n, true])
  return {
    address,
    blockNumber: `0x${block.toString(16)}`,
    blockHash: `0x${'a'.repeat(64)}`,
    transactionHash: `0x${(scheduled ? 'b' : 'c').repeat(64)}`,
    transactionIndex: '0x0',
    logIndex: scheduled ? '0x0' : '0x1',
    removed: false,
    topics,
    data,
  }
}

let head = 100n
let failVesting = false
let dueChecks = 0
let includeCompletion = false
const ranges: string[] = []

const fetchMock = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(async (_input: URL | RequestInfo, init?: RequestInit) => {
  const request = JSON.parse(String(init?.body)) as {
    id: number
    method: string
    params: [{ address: Hex; fromBlock: string; toBlock: string }]
  }
  let result: unknown
  if (request.method === 'eth_blockNumber') {
    result = `0x${head.toString(16)}`
  } else if (request.method === 'eth_getLogs') {
    const filter = request.params[0]
    ranges.push(`${filter.address}:${filter.fromBlock}:${filter.toBlock}`)
    if (failVesting && filter.address === vestingAddress) {
      return Response.json({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'Temporary RPC failure' } })
    }
    const logs = [logFor(filter.address, head)]
    if (includeCompletion && filter.address === scheduledAddress) {
      const abi = parseAbi(['event ScheduleCompleted(uint256 indexed scheduleId, uint256 refundedAmount)'])
      logs.push({ ...logFor(filter.address, head), logIndex: '0x2',
        topics: encodeEventTopics({ abi, eventName: 'ScheduleCompleted', args: { scheduleId: 1n } }),
        data: encodeAbiParameters([{ type: 'uint256' }], [123n]) })
    }
    result = logs
  } else if (request.method === 'eth_call') {
    dueChecks++
    result = encodeAbiParameters([{ type: 'bool' }], [true])
  } else {
    throw new Error(`Unexpected RPC method: ${request.method}`)
  }
  return Response.json({ jsonrpc: '2.0', id: request.id, result })
}, { preconnect: globalThis.fetch.preconnect }))

let backend: typeof import('./index')
function request(path: string) {
  return backend.handleRequest(new Request(`http://pact.local${path}`))
}

beforeAll(async () => {
  for (const key of ['VITE_ESCROW_MANAGER', 'VITE_CONDITIONAL_PAYOUT', 'VITE_BATCH_PAYOUT']) {
    process.env[key] = ''
  }
  process.env.VITE_SCHEDULED_PAYOUT = scheduledAddress
  process.env.VITE_VESTING_VAULT = vestingAddress
  process.env.ARC_RPC_URL = 'https://pact-rpc.invalid'
  backend = await import('./index')
})

afterAll(() => {
  fetchMock.mockRestore()
  process.env = originalEnv
})

describe('backend event indexing', () => {
  test('decodes contract logs, returns address matches, and discovers due schedules', async () => {
    await backend.poll()
    const health = await request('/health').json()
    expect(health).toEqual({ ok: true, lastIndexedBlock: '100', events: 2 })

    const scheduled = await request('/events?contract=ScheduledPayout').json()
    expect(scheduled[0].eventName).toBe('ScheduleCreated')
    expect(scheduled[0].args).toMatchObject({ scheduleId: '1', amount: '5000', description: 'Retainer' })

    const vesting = await request('/events?contract=VestingVault').json()
    expect(vesting[0].args).toMatchObject({ vestingId: '2', grantor: payer, beneficiary: recipient, revocable: true })
    expect(await request(`/events/address?address=${recipient}`).json()).toHaveLength(2)
    expect(dueChecks).toBe(1)
  })

  test('retries a failed range without skipping logs or duplicating a partially indexed batch', async () => {
    head = 101n
    failVesting = true
    const errors = spyOn(console, 'error').mockImplementation(() => {})
    try {
      await backend.poll()
      expect(await request('/health').json()).toEqual({ ok: true, lastIndexedBlock: '100', events: 2 })
      failVesting = false
      await backend.poll()
      expect(await request('/health').json()).toEqual({ ok: true, lastIndexedBlock: '101', events: 4 })
      expect(ranges.filter((range) => range === `${scheduledAddress}:0x65:0x65`)).toHaveLength(2)
    } finally {
      errors.mockRestore()
    }
  })

  test('checks due schedules even when the head has not changed', async () => {
    const previousChecks = dueChecks
    const previousQueries = ranges.length
    await backend.poll()
    expect(dueChecks).toBe(previousChecks + 1)
    expect(ranges).toHaveLength(previousQueries)
  })

  test('rejects invalid event limits and honors valid limits', async () => {
    for (const limit of ['0', '-1', 'abc', '1.5']) {
      expect(request(`/events?limit=${limit}`).status).toBe(400)
    }
    expect(await request('/events?limit=1').json()).toHaveLength(1)
    expect(request('/events/address').status).toBe(400)
  })

  test('indexes completed schedules with the exact unused funding refund', async () => {
    includeCompletion = true
    head = 102n
    await backend.poll()
    const events = await request('/events?contract=ScheduledPayout').json()
    expect(events.find((event: { eventName: string }) => event.eventName === 'ScheduleCompleted').args)
      .toEqual({ scheduleId: '1', refundedAmount: '123' })
  })
})
