# Pact — Programmable Payments

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Pact is a programmable payments platform on Arc featuring non-custodial escrow, conditional milestone payouts, batch payouts, scheduled recurring payments, and vesting vaults with USDC.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry (`forge build`, `forge test`).
- Wallet: Injected (MetaMask, Rainbow, etc.)
- Primary Chain: Arc Mainnet (Chain ID: 5042, RPC: `https://rpc.mainnet.arc.io`, Explorer: `https://explorer.arc.io`)
- Secondary Chain: Arc Testnet (Chain ID: 5042002)
- Native Gas Token: USDC (18 decimals)
- Token: ERC-20 USDC (6 decimals) (`0x3600000000000000000000000000000000000000`)
- Toasts: Sonner

## Arc Mainnet Deployed Contracts (Chain ID: 5042)

| Contract | Address | Deployment Tx Hash |
| :--- | :--- | :--- |
| **EscrowManager** | `0x3eF17D9Cd787030Eb68Eb6b2FC6D7F298B9B136F` | `0xed8d9b0f7642142ed36614f06aa53b3fa504c961dc9bcf6070dd99dcc1074b85` |
| **ConditionalPayout** | `0x196B618c6a31A5100b5F9774089E3f6913B9aa55` | `0x7dc0f7e75ad44f499f13160c0a1bc511e01d7447e974081950f456487ba61824` |
| **BatchPayout** | `0xab3f589c7ca55aA6272B1b159ed12d0E7623F798` | `0x64ea56e5e385b37000a132024618ce84540a850244509c3a080465eaca4b2fd8` |
| **ScheduledPayout** | `0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab` | `0x09f987a19bd8877ee49198786084e3ca93076c631c4118d5332e767ac0e94ce1` |
| **VestingVault** | `0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6` | `0x88bbae2f398ddae9ac07a03aa7e2560295949acd60cf895b34cb2e8913bd10aa` |

Deployer Address: `0x0986Bfd653985c9Fa60a464784264444B542BfD7`

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (Arc Mainnet, Arc Testnet, Mainnet)
- `src/lib/contracts.ts` - ABIs, address bindings, chain config
- `contracts/script/DeployPact.s.sol` - Foundry deployment script
