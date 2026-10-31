# Pact — Deployment Guide

## Overview

Five contracts must be deployed before the frontend can interact with them:

| Contract | Purpose |
|----------|---------|
| `EscrowManager` | Milestone-based escrow with dispute resolution |
| `ConditionalPayout` | Oracle-approved conditional fund release |
| `BatchPayout` | One-shot batch USDC payments |
| `ScheduledPayout` | Recurring payments with funding pool |
| `VestingVault` | Linear/cliff/periodic USDC vesting |

All contracts accept the USDC address as the first constructor argument.

---

## Arc Mainnet (current app configuration)

**USDC address:** `0x3600000000000000000000000000000000000000`
**Chain ID:** `5042`
**RPC:** `https://rpc.mainnet.arc.io`
**Explorer:** `https://explorer.arc.io`

The deployed addresses are listed in the README and `.env.example`. The frontend and backend use mainnet.

October 31 fixes require replacement deployments of three immutable contracts; original mainnet defaults have not changed. See [payment-fixes-and-history.md](./payment-fixes-and-history.md) for the deployment script, read-only cost estimate, validation, and legacy-record requirements.

## Arc Testnet (separate deployment)

**USDC address:** `0x3600000000000000000000000000000000000000`
**Chain ID:** `5042002`
**RPC:** `https://rpc.testnet.arc.io`
**Explorer:** `https://explorer.testnet.arc.io`
**Faucet:** Use the "Get test USDC" button in Arc Studio sidebar.

---

## Deploy via Arc Studio (Mode 1 — recommended for testnet)

Build the contracts first:

```bash
bun run contracts:build   # forge build
```

Then say "deploy" in Arc Studio chat. The platform deployer wallet handles gas. After each deployment, update your `.env` file.

---

## Deploy via Foundry CLI (Mode 2 — for mainnet or custom wallets)

```bash
# Set env
export ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.io
export PRIVATE_KEY=<your_deployer_key>
export USDC=0x3600000000000000000000000000000000000000

# Build
forge build

# Deploy each contract
forge create contracts/EscrowManager.sol:EscrowManager \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC

forge create contracts/ConditionalPayout.sol:ConditionalPayout \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC

forge create contracts/BatchPayout.sol:BatchPayout \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC

forge create contracts/ScheduledPayout.sol:ScheduledPayout \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC

forge create contracts/VestingVault.sol:VestingVault \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $USDC
```

> **Mainnet warning:** Arc mainnet (Chain ID 5042) uses real USDC. Audit all contracts before mainnet deployment. See the main `README.md` security section.

---

## Post-Deploy: Wire the Frontend

For the current mainnet deployment, copy `.env.example` to `.env`. For a new deployment, replace the deployed addresses in `.env`:

```bash
VITE_ESCROW_MANAGER=0x…
VITE_CONDITIONAL_PAYOUT=0x…
VITE_BATCH_PAYOUT=0x…
VITE_SCHEDULED_PAYOUT=0x…
VITE_VESTING_VAULT=0x…

# Optional — WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

Restart the Vite dev server after editing `.env` (Vite reads env files at startup).

---

## Run the Backend Indexer

The backend server indexes contract events and monitors scheduled payouts:

```bash
bun run server/index.ts
```

It listens on port 3001 and is proxied through Vite at `/api/*` during development. Set `SERVER_PORT` to change the port, and `ARC_RPC_URL` to override the mainnet RPC. Set the five `VITE_*` contract addresses in `.env`; Bun loads this file when starting the server.

The backend decodes events and logs due schedules for an operator to execute. It does not submit transactions. Its event store is in memory, with a 2000-block initial lookback; add persistence, historical backfill, and reorganization handling before relying on it as a complete production indexer. Deploy the API separately and configure production routing for `/api`.

Health check: `curl http://localhost:3001/health`

---

## Run Tests

```bash
bun run contracts:test   # forge test -vv
```

195 contract tests across all five contracts. Run `bun run test` for frontend/history/backend regressions, `bun run contracts:abi` after ABI changes, and `bun run check` for lint and TypeScript checks.

---

## Mainnet Deployment Checklist

- [ ] All 195 contract tests passing
- [ ] Independent third-party audit completed
- [ ] Contract addresses verified on https://explorer.arc.io
- [ ] VITE_* env vars set for mainnet addresses
- [ ] Private keys stored in a secrets manager (never in `.env` committed to git)
- [ ] Multi-sig or hardware wallet used for deployment
- [ ] Indexer connected to mainnet RPC
