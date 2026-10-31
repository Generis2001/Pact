/** Arc mainnet deployments. Original agreements remain at their original addresses. */
export const ORIGINAL_CONTRACT_ADDRESSES = {
  EscrowManager: '0x3eF17D9Cd787030Eb68Eb6b2FC6D7F298B9B136F',
  ConditionalPayout: '0x196B618c6a31A5100b5F9774089E3f6913B9aa55',
  BatchPayout: '0xab3f589c7ca55aA6272B1b159ed12d0E7623F798',
  ScheduledPayout: '0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab',
  VestingVault: '0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6',
} as const

export const DEFAULT_CONTRACT_ADDRESSES: Record<keyof typeof ORIGINAL_CONTRACT_ADDRESSES, `0x${string}`> = {
  ...ORIGINAL_CONTRACT_ADDRESSES,
  EscrowManager: '0x5055fadc05000be926531dd26075d53804343de5',
  ConditionalPayout: '0x83bcda8e6093bfa97ddb79cad76d121ba2757856',
  ScheduledPayout: '0x75f6b1b52801a734db711fbbcdc0b90b674a4592',
}

/** Older .env/Vercel bindings must not silently restore a retired deployment. */
export function resolveDeploymentAddress(name: keyof typeof ORIGINAL_CONTRACT_ADDRESSES, configured?: string): `0x${string}` {
  const current = DEFAULT_CONTRACT_ADDRESSES[name]
  const original = ORIGINAL_CONTRACT_ADDRESSES[name]
  if (configured?.toLowerCase() === original.toLowerCase() && current.toLowerCase() !== original.toLowerCase()) return current
  return (configured ?? current) as `0x${string}`
}
