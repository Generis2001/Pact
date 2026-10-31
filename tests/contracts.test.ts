import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { decodeFunctionResult, encodeFunctionResult, type Abi } from 'viem'
import { ESCROW_MANAGER_ABI, CONDITIONAL_PAYOUT_ABI, BATCH_PAYOUT_ABI, SCHEDULED_PAYOUT_ABI, VESTING_VAULT_ABI } from '../src/lib/contracts'

const compiledAbi = (name: string): Abi => {
  const artifact = JSON.parse(readFileSync(new URL(`../contracts/out/${name}.sol/${name}.json`, import.meta.url), 'utf8')) as { abi: Abi }
  return artifact.abi
}

test('frontend return tuples and event signatures match the compiled contracts', () => {
  for (const [name, abi] of Object.entries({ EscrowManager: ESCROW_MANAGER_ABI, ConditionalPayout: CONDITIONAL_PAYOUT_ABI, BatchPayout: BATCH_PAYOUT_ABI, ScheduledPayout: SCHEDULED_PAYOUT_ABI, VestingVault: VESTING_VAULT_ABI })) {
    expect(abi as Abi).toEqual(compiledAbi(name))
  }
})

test('escrow reads decode a dynamic tuple containing real milestone strings', () => {
  const milestones = [{ amount: 17n, deadline: 0n, description: 'Deliver prototype — verified', state: 0 }]
  const result = {
    depositor: '0x0986Bfd653985c9Fa60a464784264444B542BfD7',
    beneficiary: '0x0986Bfd653985c9Fa60a464784264444B542BfD7',
    arbiter: '0xEf315EfaA7B03dC410578A163ef0b84362509970',
    totalAmount: 17n, releasedAmount: 0n, deadline: 123456n, state: 1,
    depositorApproved: false, arbiterApproved: false, milestones,
  } as const
  const data = encodeFunctionResult({ abi: compiledAbi('EscrowManager'), functionName: 'getEscrow', result })
  expect(decodeFunctionResult({ abi: ESCROW_MANAGER_ABI, functionName: 'getEscrow', data })).toEqual(result)
  const milestoneData = encodeFunctionResult({ abi: compiledAbi('EscrowManager'), functionName: 'getMilestones', result: milestones })
  expect(decodeFunctionResult({ abi: ESCROW_MANAGER_ABI, functionName: 'getMilestones', data: milestoneData })).toEqual(milestones)
})
