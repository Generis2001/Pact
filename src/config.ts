/**
 * wagmi configuration — Pact Platform
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { defineChain } from 'viem'
import { getDefaultConfig } from 'connectkit'

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

// Wallet identity must match the page that initiated the connection, including
// preview deployments and custom domains. Never substitute another hostname.
const appOrigin = typeof window === 'undefined' ? undefined : window.location.origin

export const config = createConfig(
  getDefaultConfig({
    chains: [arcMainnet, arcTestnet, mainnet],
    transports: {
      [arcMainnet.id]: http(),
      [arcTestnet.id]: http(),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ?? '',
    enableAaveAccount: false,
    appName: 'Pact',
    appDescription: 'Programmable, non-custodial USDC payments on Arc.',
    appUrl: appOrigin,
    appIcon: appOrigin ? `${appOrigin}/favicon.svg` : undefined,
  }),
)

