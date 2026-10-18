/**
 * wagmi configuration — Pact Platform
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { defineChain } from 'viem'
import { getDefaultConfig } from 'connectkit'
import { registerChain } from './tracing'

export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcExplorer', url: 'https://explorer.arc.io' },
  },
  testnet: false,
})

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig(
  getDefaultConfig({
    chains: [arcMainnet, arcTestnet, mainnet],
    transports: {
      [arcMainnet.id]: http(),
      [arcTestnet.id]: http(),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '',
    appName: 'Pact — Programmable Payments',
    appDescription: 'Non-custodial escrow, conditional payouts, batch payouts, scheduled payments, and vesting on Arc.',
    appUrl: 'https://pact.arc.io',
  }),
)

