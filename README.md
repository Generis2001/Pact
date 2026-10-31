# Pact — Programmable Payments on Arc

Pact is a programmable money platform built with **Arc Studio** on **Arc Mainnet** (Chain ID: `5042`). It brings non-custodial escrow, conditional milestone payouts, atomic multi-recipient batch payouts, scheduled recurring payments, and continuous/cliff vesting vaults to the Arc ecosystem, powered natively by USDC.

---

## Live Contracts on Arc Mainnet (Chain ID: `5042`)

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **EscrowManager** | `0x5055fadc05000be926531dd26075d53804343de5` | [View on Arc Explorer](https://explorer.arc.io/address/0x5055fadc05000be926531dd26075d53804343de5) |
| **ConditionalPayout** | `0x83bcda8e6093bfa97ddb79cad76d121ba2757856` | [View on Arc Explorer](https://explorer.arc.io/address/0x83bcda8e6093bfa97ddb79cad76d121ba2757856) |
| **BatchPayout** | `0xab3f589c7ca55aA6272B1b159ed12d0E7623F798` | [View on Arc Explorer](https://explorer.arc.io/address/0xab3f589c7ca55aA6272B1b159ed12d0E7623F798) |
| **ScheduledPayout** | `0x75f6b1b52801a734db711fbbcdc0b90b674a4592` | [View on Arc Explorer](https://explorer.arc.io/address/0x75f6b1b52801a734db711fbbcdc0b90b674a4592) |
| **VestingVault** | `0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6` | [View on Arc Explorer](https://explorer.arc.io/address/0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6) |
| **USDC (ERC-20)** | `0x3600000000000000000000000000000000000000` | [View on Arc Explorer](https://explorer.arc.io/address/0x3600000000000000000000000000000000000000) |

- **Network Name**: Arc Mainnet
- **Chain ID**: `5042`
- **RPC Endpoint**: `https://rpc.mainnet.arc.io`
- **Gas Token**: Native USDC (18 decimals)
- **ERC-20 Decimals**: 6 decimals

---

## On-Chain Feature Verification & Testing

All five payment features were tested on Arc mainnet on October 31. The original feature test spent 0.088719675 USDC. EscrowManager, ConditionalPayout, and ScheduledPayout were then replaced with fixed contracts; deployment and live verification spent an additional 0.192467625 USDC under a separately approved 0.20 USDC cap. See [payment verification](docs/payment-fixes-and-history.md) and [replacement evidence](docs/mainnet-upgrade-2026-10-31.json).

New agreements use the replacement contracts above. Choose **Existing agreements (original)** in Escrow, Conditional Payout, or Scheduled Payout to manage older records. Existing IDs, funds, and approvals stay in their original contracts. Connected-wallet Transaction History includes both versions and all five payment features.

Previously recorded feature actions:

- **Escrow Manager**: Created and funded multi-milestone escrow #1 with `0.010 USDC`.
  - Funding Tx: [`0x669fa478e36254d32900f1fc6dc0d523c0931c128d50bae47be2079f6aeb6025`](https://explorer.arc.io/tx/0x669fa478e36254d32900f1fc6dc0d523c0931c128d50bae47be2079f6aeb6025)
- **Conditional Payout**: Created and funded conditional agreement #1 with `0.005 USDC`.
  - Funding Tx: [`0x2d7ca33f6057f246648e5716710f8fdb3d7a8e5eea8e93a3d1fb7993a6113e8c`](https://explorer.arc.io/tx/0x2d7ca33f6057f246648e5716710f8fdb3d7a8e5eea8e93a3d1fb7993a6113e8c)
- **Batch Payout**: Dispersed `0.005 USDC` atomically between 2 recipients (`0.002` + `0.003` USDC).
  - Execution Tx: [`0x74fd3660ed7851c6e49b2db8739a0e3c29c0b4f721a1efd2648224083de5cb93`](https://explorer.arc.io/tx/0x74fd3660ed7851c6e49b2db8739a0e3c29c0b4f721a1efd2648224083de5cb93)
- **Scheduled Payout**: Created recurring retainer schedule #1 for `0.005 USDC` daily intervals.
  - Creation Tx: [`0x9de1005410afc51d15581b7709b8b1b68060cf24e8dabf4317e8a3fafcb519d0`](https://explorer.arc.io/tx/0x9de1005410afc51d15581b7709b8b1b68060cf24e8dabf4317e8a3fafcb519d0)

---

## Tech Stack

- **Smart Contracts**: Solidity 0.8.28, Foundry, OpenZeppelin Contracts v5.1.0
- **Frontend**: React 18, Vite 6, TypeScript, Tailwind CSS
- **Web3**: Wagmi v2, Viem v2, ConnectKit
- **Icons & Animation**: Lucide React, Framer Motion, Sonner

---

## Getting Started

Use Bun (the version in `.bun-version`) and Foundry.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Generis2001/Pact.git
cd Pact
bun install --frozen-lockfile
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Run Development Server

```bash
bun run dev
```

### 4. Smart Contract Compilation & Testing

```bash
# Build contracts with Foundry
forge build

# Run unit and invariant test suite (195 tests passed)
forge test
```

---

## Recent Update

The interface uses a light theme with Walsheim typography, green controls, outline feature illustrations, and wallet USDC balance on the dashboard. The top-right Arc wallet control uses the same Arc logo as the Studio footer and can switch a connected wallet to Arc. The redundant Network details card has been removed. Feature panels use the mainnet chain constant consistently. App metadata, a manifest, and a favicon support browser and wallet identification.

The optional Bun backend decodes events from the five contracts and provides `/health`, `/events`, and `/events/address`. It checks scheduled payments and logs when they are due for operator action. It stores events in memory and starts from a recent 2000-block lookback; it does not automatically submit payments or provide durable historical indexing. Production API hosting and routing must be configured separately from the Vite development proxy.

```bash
bun run server       # Optional backend on port 3001; loads addresses from .env
bun run server:test  # Backend event/API regression tests
bun run test         # Frontend input, ABI, history, and backend tests
bun run contracts:abi # Regenerate typed ABIs from Foundry artifacts
bun run check        # Lint and TypeScript checks, including the backend
bun run build        # Production frontend build
```

See [architecture](docs/architecture.md), [deployment](docs/deploy.md), and [wallet warnings](docs/wallet-trust.md) for details.

---

## License

MIT
