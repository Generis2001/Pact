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
| **EscrowManager** | `0x5055fadc05000be926531dd26075d53804343de5` | `0xba88bb89db5f31ed3b3040f7a2467fdcfb2befbd7d820796574b2674da3a0791` |
| **ConditionalPayout** | `0x83bcda8e6093bfa97ddb79cad76d121ba2757856` | `0xc8bb09ae1fb45cd790faea921171f8f99f054d975beaf63936599fe82de39f63` |
| **BatchPayout** | `0xab3f589c7ca55aA6272B1b159ed12d0E7623F798` | `0x64ea56e5e385b37000a132024618ce84540a850244509c3a080465eaca4b2fd8` |
| **ScheduledPayout** | `0x75f6b1b52801a734db711fbbcdc0b90b674a4592` | `0xdc86d50e0f938ee6cc37fb5a7da70fc93e4cea68c0fed6fdfc864695888a68c6` |
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

## Recent Code Integration

- October 31 replacement deployment: fixed EscrowManager, ConditionalPayout, and ScheduledPayout are live at the current addresses above. 29 successful deployment/verification transactions spent **0.192467625 USDC** under a separately approved additional 0.20 USDC cap; independent receipt gas equals the main wallet decrease, all test principal and exact allowances are cleared, and the controlled arbiter has zero funds. The earlier all-feature test spent 0.088719675 USDC. No further spending is authorized. See `docs/mainnet-upgrade-2026-10-31.json` and `public/deployments.json`.
- `src/lib/deployments.ts` holds current and original addresses. Known stale original environment values resolve to replacements; explicit custom/disabled bindings remain available. Escrow/Conditional/Scheduled provide an Agreement version selector. Switching remounts forms to isolate IDs/receipts/allowances; original mode hides creation and manages existing records. Original immutable contracts remain unchanged, including the old escrow settlement defect.
- Connected-wallet Transaction History uses paginated Arc Explorer v2 transactions/token transfers/internal transactions directly, merges by hash/log index, recognizes original/current Pact deployments, and includes received payouts and other Arc activity. Queries isolate wallet accounts; disconnect hides the view. Browser verified 78 unique live indexed transactions and all five feature filters. Explorer errors/lag are explicit; the recent backend event store is not complete wallet history.
- `src/lib/contract-abis.ts` is generated from Foundry artifacts via `bun run contracts:abi`. Shared receipt/allowance handling lives in `src/lib/use-transaction.ts`; exact input validation prevents negative fractional values and precision truncation. `bun run test` covers frontend/history/backend regressions; test types live in `tsconfig.test.json`, separate from frontend tracing.

- Light UI tokens and Walsheim typography, green controls, outline feature illustrations, refreshed sidebar/dashboard, and dashboard USDC balance. The redundant Network details card is removed. The top-right Arc wallet control reuses the footer logo and supports switching a connected wallet to Arc.
- All feature panels use `ARC_CHAIN_ID` for mainnet reads and explorer links.
- Added browser/link metadata, `public/manifest.json`, and the included SVG favicon. Existing wallet-security fixes and mainnet contract defaults are preserved.
- Optional Bun backend in `server/index.ts`: mainnet event decoding, address filtering, and due-schedule monitoring. Events and cursor are in memory, starting with a recent 2000-block lookback. It logs due schedules; it does not submit payments.
- Vite's `/api` proxy is for development. Production API deployment and routing are separate.
- `bun run server:test` covers decoded schedule/vesting logs, address searches, failed-range retries, schedule checks without a new block, and limit validation.
- TypeScript checks include `server/`. The deployment script uses the bundled onchain facts registry instead of a missing private package.
- OpenZeppelin imports resolve to the pinned npm dependency; the existing Foundry scripts and deployment history remain available.
- See `docs/architecture.md`, `docs/deploy.md`, and `docs/wallet-trust.md`.
- October 29 wallet investigation: 23 write calls and receipt queries explicitly target Arc; transaction errors are surfaced, the switch button names Arc and works before approval, and the unused Aave account connector is disabled. Runtime wallet metadata uses the current origin with no foreign-domain fallback. See `docs/mainnet-verification.md` for RPC-confirmed deployment/payment evidence and the remaining uncertainty about wallet-domain warnings. Do not claim that UI metadata or network fixes remove third-party flags.
- Branding uses the calligraphic `PactLogo` wordmark in the sidebar and mobile header, preserving white lettering on the black badge. SVG outlines and a 1024px PNG export are in `public/brand/`; the favicon keeps its green-and-dark palette. The Arc Microgrants 2 submission draft is in `docs/dorahacks-submission.md` and has not been submitted.
