/**
 * Contract ABIs and addresses for Pact platform.
 * Addresses are populated after deployment; see AGENTS.md.
 * Import from onchain-facts for USDC address — never hardcode.
 */
import { getUsdc } from '@/onchain-facts'

export const ARC_CHAIN_ID = 5042
export const ARC_MAINNET_CHAIN_ID = 5042
export const ARC_TESTNET_CHAIN_ID = 5042002

export const USDC_ADDRESS = (getUsdc(ARC_CHAIN_ID)?.address ?? '0x3600000000000000000000000000000000000000') as `0x${string}`

// ---------------------------------------------------------------------------
// Placeholder addresses — replace with deployed addresses after running deploy
// ---------------------------------------------------------------------------
export const CONTRACT_ADDRESSES = {
  EscrowManager:    (import.meta.env.VITE_ESCROW_MANAGER    ?? '0x3eF17D9Cd787030Eb68Eb6b2FC6D7F298B9B136F') as `0x${string}`,
  ConditionalPayout:(import.meta.env.VITE_CONDITIONAL_PAYOUT ?? '0x196B618c6a31A5100b5F9774089E3f6913B9aa55') as `0x${string}`,
  BatchPayout:      (import.meta.env.VITE_BATCH_PAYOUT       ?? '0xab3f589c7ca55aA6272B1b159ed12d0E7623F798') as `0x${string}`,
  ScheduledPayout:  (import.meta.env.VITE_SCHEDULED_PAYOUT   ?? '0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab') as `0x${string}`,
  VestingVault:     (import.meta.env.VITE_VESTING_VAULT      ?? '0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6') as `0x${string}`,
} as const

// ---------------------------------------------------------------------------
// ABIs — trimmed to the functions used by the frontend
// ---------------------------------------------------------------------------

export const ESCROW_MANAGER_ABI = [
  // write
  { name: 'createEscrow', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'arbiter', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'milestones', type: 'tuple[]', components: [
        { name: 'amount', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'description', type: 'string' },
      ]},
    ],
    outputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  { name: 'fundEscrow', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [] },
  { name: 'approveRelease', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [] },
  { name: 'approveMilestone', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }, { name: 'milestoneIndex', type: 'uint256' }], outputs: [] },
  { name: 'initiateDispute', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [] },
  { name: 'resolveDispute', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }, { name: 'releaseToBeneficiary', type: 'bool' }], outputs: [] },
  { name: 'claimRefund', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'escrowId', type: 'uint256' }], outputs: [] },
  // read
  { name: 'getEscrow', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'depositor', type: 'address' },
      { name: 'beneficiary', type: 'address' },
      { name: 'arbiter', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'releasedAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'depositorApproved', type: 'bool' },
      { name: 'arbiterApproved', type: 'bool' },
    ]}],
  },
  { name: 'getMilestones', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple[]', components: [
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'state', type: 'uint8' },
      { name: 'depositorApproved', type: 'bool' },
      { name: 'arbiterApproved', type: 'bool' },
    ]}],
  },
  { name: 'getUserEscrows', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  // events
  { name: 'EscrowCreated', type: 'event',
    inputs: [
      { name: 'escrowId', type: 'uint256', indexed: true },
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'beneficiary', type: 'address', indexed: true },
      { name: 'arbiter', type: 'address', indexed: false },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ]},
  { name: 'Released', type: 'event',
    inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }, { name: 'beneficiary', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { name: 'Refunded', type: 'event',
    inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
] as const

export const CONDITIONAL_PAYOUT_ABI = [
  { name: 'createAgreement', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'approver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'conditionDeadline', type: 'uint256' },
      { name: 'conditionDescription', type: 'string' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ name: 'agreementId', type: 'uint256' }],
  },
  { name: 'fundAgreement', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agreementId', type: 'uint256' }], outputs: [] },
  { name: 'approveCondition', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agreementId', type: 'uint256' }], outputs: [] },
  { name: 'cancelAgreement', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agreementId', type: 'uint256' }], outputs: [] },
  { name: 'claimExpiry', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agreementId', type: 'uint256' }], outputs: [] },
  { name: 'getAgreement', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'agreementId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'payer', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'approver', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'conditionDescription', type: 'string' },
      { name: 'conditionDeadline', type: 'uint256' },
      { name: 'metadataURI', type: 'string' },
      { name: 'state', type: 'uint8' },
    ]}],
  },
  { name: 'getUserAgreements', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
] as const

export const BATCH_PAYOUT_ABI = [
  { name: 'executeBatch', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentSetId', type: 'bytes32' },
      { name: 'recipients', type: 'tuple[]', components: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ]},
    ],
    outputs: [],
  },
  { name: 'estimateBatch', type: 'function', stateMutability: 'pure',
    inputs: [{ name: 'recipients', type: 'tuple[]', components: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ]}],
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'valid', type: 'bool' },
      { name: 'errorMessage', type: 'string' },
    ],
  },
  { name: 'isExecuted', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'payer', type: 'address' }, { name: 'paymentSetId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  { name: 'BatchExecuted', type: 'event',
    inputs: [
      { name: 'paymentSetId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'recipientCount', type: 'uint256', indexed: false },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ]},
] as const

export const SCHEDULED_PAYOUT_ABI = [
  { name: 'createSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: 'scheduleId', type: 'uint256' }],
  },
  { name: 'fundSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'uint256' }, { name: 'fundAmount', type: 'uint256' }], outputs: [] },
  { name: 'executeSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'uint256' }], outputs: [] },
  { name: 'cancelSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'uint256' }], outputs: [] },
  { name: 'withdrawExcessFunds', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'scheduleId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'getSchedule', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'scheduleId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'payer', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'lastExecuted', type: 'uint256' },
      { name: 'totalPaid', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'executionCount', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'description', type: 'string' },
    ]}],
  },
  { name: 'getBalance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'scheduleId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isDue', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'scheduleId', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'getPayerSchedules', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'payer', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
] as const

export const VESTING_VAULT_ABI = [
  { name: 'createSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'beneficiary', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'cliffTime', type: 'uint256' },
      { name: 'vestingType', type: 'uint8' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'revocable', type: 'bool' },
    ],
    outputs: [{ name: 'vestingId', type: 'uint256' }],
  },
  { name: 'claimVested', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'vestingId', type: 'uint256' }], outputs: [] },
  { name: 'revokeSchedule', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'vestingId', type: 'uint256' }], outputs: [] },
  { name: 'getSchedule', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'vestingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'beneficiary', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'cliffTime', type: 'uint256' },
      { name: 'vestingType', type: 'uint8' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'claimedAmount', type: 'uint256' },
      { name: 'revokedAt', type: 'uint256' },
      { name: 'revocable', type: 'bool' },
      { name: 'grantor', type: 'address' },
    ]}],
  },
  { name: 'claimableAmount', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'vestingId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getBeneficiarySchedules', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'beneficiary', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { name: 'getGrantorSchedules', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'grantor', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
] as const

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

export const ESCROW_STATE_LABELS: Record<number, string> = {
  0: 'Created', 1: 'Funded', 2: 'Released', 3: 'Refunded', 4: 'Disputed', 5: 'Resolved',
}
export const AGREEMENT_STATE_LABELS: Record<number, string> = {
  0: 'Pending', 1: 'Active', 2: 'Released', 3: 'Cancelled', 4: 'Expired',
}
export const VESTING_TYPE_LABELS: Record<number, string> = {
  0: 'Linear', 1: 'Cliff', 2: 'Periodic',
}
