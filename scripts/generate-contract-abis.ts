import { readFileSync, writeFileSync } from 'node:fs'

const contracts = {
  EscrowManager: 'ESCROW_MANAGER_ABI',
  ConditionalPayout: 'CONDITIONAL_PAYOUT_ABI',
  BatchPayout: 'BATCH_PAYOUT_ABI',
  ScheduledPayout: 'SCHEDULED_PAYOUT_ABI',
  VestingVault: 'VESTING_VAULT_ABI',
} as const

let source = '// Generated from the compiled Solidity contracts by scripts/generate-contract-abis.ts.\n'
for (const [contract, constant] of Object.entries(contracts)) {
  const artifact = JSON.parse(readFileSync(new URL(`../contracts/out/${contract}.sol/${contract}.json`, import.meta.url), 'utf8')) as { abi: unknown[] }
  source += `\nexport const ${constant} = [\n${artifact.abi.map((entry) => `  ${JSON.stringify(entry)},`).join('\n')}\n] as const\n`
}
writeFileSync(new URL('../src/lib/contract-abis.ts', import.meta.url), source)
