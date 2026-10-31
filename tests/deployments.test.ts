import { expect, test } from 'bun:test'
import { DEFAULT_CONTRACT_ADDRESSES, ORIGINAL_CONTRACT_ADDRESSES, resolveDeploymentAddress } from '../src/lib/deployments'

test('stale original environment bindings resolve to the current deployment', () => {
  for (const name of ['EscrowManager', 'ConditionalPayout', 'ScheduledPayout'] as const) {
    expect(DEFAULT_CONTRACT_ADDRESSES[name].toLowerCase()).not.toBe(ORIGINAL_CONTRACT_ADDRESSES[name].toLowerCase())
    expect(resolveDeploymentAddress(name)).toBe(DEFAULT_CONTRACT_ADDRESSES[name])
    expect(resolveDeploymentAddress(name, ORIGINAL_CONTRACT_ADDRESSES[name])).toBe(DEFAULT_CONTRACT_ADDRESSES[name])
    expect(resolveDeploymentAddress(name, ORIGINAL_CONTRACT_ADDRESSES[name].toLowerCase())).toBe(DEFAULT_CONTRACT_ADDRESSES[name])
  }
})

test('explicit custom deployments and disabled server bindings remain available', () => {
  const local = '0x1111111111111111111111111111111111111111'
  expect(resolveDeploymentAddress('EscrowManager', local)).toBe(local)
  expect(resolveDeploymentAddress('EscrowManager', '').length).toBe(0)
  expect(resolveDeploymentAddress('BatchPayout', ORIGINAL_CONTRACT_ADDRESSES.BatchPayout)).toBe(ORIGINAL_CONTRACT_ADDRESSES.BatchPayout)
})
