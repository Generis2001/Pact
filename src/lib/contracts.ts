/**
 * Contract ABIs and addresses for Pact platform.
 * Addresses are populated after deployment; see AGENTS.md.
 * Import from onchain-facts for USDC address — never hardcode.
 */
import { getUsdc } from '@/onchain-facts'
import { resolveDeploymentAddress } from './deployments'
export { ORIGINAL_CONTRACT_ADDRESSES, DEFAULT_CONTRACT_ADDRESSES } from './deployments'

export const ARC_CHAIN_ID = 5042
export const ARC_MAINNET_CHAIN_ID = 5042
export const ARC_TESTNET_CHAIN_ID = 5042002

export const USDC_ADDRESS = (getUsdc(ARC_CHAIN_ID)?.address ?? '0x3600000000000000000000000000000000000000') as `0x${string}`

export const CONTRACT_ADDRESSES = {
  EscrowManager: resolveDeploymentAddress('EscrowManager', import.meta.env.VITE_ESCROW_MANAGER),
  ConditionalPayout: resolveDeploymentAddress('ConditionalPayout', import.meta.env.VITE_CONDITIONAL_PAYOUT),
  BatchPayout: resolveDeploymentAddress('BatchPayout', import.meta.env.VITE_BATCH_PAYOUT),
  ScheduledPayout: resolveDeploymentAddress('ScheduledPayout', import.meta.env.VITE_SCHEDULED_PAYOUT),
  VestingVault: resolveDeploymentAddress('VestingVault', import.meta.env.VITE_VESTING_VAULT),
} as const

// Keep tuple layouts, events, and custom errors identical to Solidity.
export {
  ESCROW_MANAGER_ABI, CONDITIONAL_PAYOUT_ABI, BATCH_PAYOUT_ABI,
  SCHEDULED_PAYOUT_ABI, VESTING_VAULT_ABI,
} from './contract-abis'

export const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

// State enums matching Solidity
export enum EscrowState { CREATED, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }
export enum MilestoneState { NEW, RELEASED, REFUNDED, DISPUTED, RESOLVED }
export enum AgreementState { PENDING, ACTIVE, RELEASED, CANCELLED, EXPIRED }
export enum VestingType { LINEAR, CLIFF, PERIODIC }
export enum ScheduleState { ACTIVE, CANCELLED, COMPLETED }
export enum VestingState { ACTIVE, REVOKED, COMPLETED }

export const SCHEDULE_STATE_LABELS: Record<number, string> = {
  0: 'Active', 1: 'Cancelled', 2: 'Completed',
}
export const VESTING_STATE_LABELS: Record<number, string> = {
  0: 'Active', 1: 'Revoked', 2: 'Completed',
}

export const ESCROW_STATE_LABELS: Record<number, string> = {
  0: 'Created', 1: 'Funded', 2: 'Released', 3: 'Refunded', 4: 'Disputed', 5: 'Resolved',
}
export const AGREEMENT_STATE_LABELS: Record<number, string> = {
  0: 'Pending', 1: 'Active', 2: 'Released', 3: 'Cancelled', 4: 'Expired',
}
export const VESTING_TYPE_LABELS: Record<number, string> = {
  0: 'Linear', 1: 'Cliff', 2: 'Periodic',
}
