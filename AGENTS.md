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

## On-Chain Feature Testing Transactions (Arc Mainnet)

| Feature | Action | Amount (USDC) | Transaction Hash |
| :--- | :--- | :--- | :--- |
| **EscrowManager** | `approve` (USDC) | Unlimited | `0x51ab339fa19f31da28741b206ab42a6da6e4b8ac1d87fc7edeadbb8d71e7a0d9` |
| **EscrowManager** | `createEscrow` (#1) | `0.010 USDC` | `0x349b506c0d1be46ee40b47b49d7ba3663efe639791552e6d365b5f2173d2fb2f` |
| **EscrowManager** | `fundEscrow` (#1) | `0.010 USDC` | `0x669fa478e36254d32900f1fc6dc0d523c0931c128d50bae47be2079f6aeb6025` |
| **ConditionalPayout** | `approve` (USDC) | Unlimited | `0x6c05d274508cc45de403eefa44b12814b28e139009292d833e4b8e6ccb4a7cda` |
| **ConditionalPayout** | `createAgreement` (#1) | `0.005 USDC` | `0x96692def233d376310466c8f7e2eaa22bad7d77169acb1a852385d8f4b457bf6` |
| **ConditionalPayout** | `fundAgreement` (#1) | `0.005 USDC` | `0x2d7ca33f6057f246648e5716710f8fdb3d7a8e5eea8e93a3d1fb7993a6113e8c` |
| **BatchPayout** | `approve` (USDC) | Unlimited | `0xf2e09c960515896e50f896bab0ef83f96248adc6bbc43a1e6d30cc65fa5e33cd` |
| **BatchPayout** | `executeBatch` | `0.002 + 0.003 USDC` | `0x74fd3660ed7851c6e49b2db8739a0e3c29c0b4f721a1efd2648224083de5cb93` |
| **ScheduledPayout** | `approve` (USDC) | Unlimited | `0x66e5e69a02299a1db0f6ca26f767adfb9f1f80e00e697af13687c6f0cba371df` |
| **ScheduledPayout** | `createSchedule` (#1) | `0.005 USDC` | `0x9de1005410afc51d15581b7709b8b1b68060cf24e8dabf4317e8a3fafcb519d0` |

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (Arc Mainnet, Arc Testnet, Mainnet)
- `src/lib/contracts.ts` - ABIs, address bindings, chain config
- `contracts/script/DeployPact.s.sol` - Foundry deployment script
- `contracts/script/TestPactFeatures.s.sol` - Foundry feature testing script
