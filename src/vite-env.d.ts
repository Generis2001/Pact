/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ESCROW_MANAGER?: string
  readonly VITE_CONDITIONAL_PAYOUT?: string
  readonly VITE_BATCH_PAYOUT?: string
  readonly VITE_SCHEDULED_PAYOUT?: string
  readonly VITE_VESTING_VAULT?: string
}
