# Pact — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Blockchain UI | wagmi v2, viem v2, ConnectKit |
| Smart Contracts | Solidity 0.8.28, Foundry, OpenZeppelin 5.1.0 |
| Chain | Arc Mainnet (Chain ID 5042) |
| Settlement Token | USDC (6 decimals) at `0x3600000000000000000000000000000000000000` |
| Backend | Bun HTTP server (`server/index.ts`) |
| Indexer | viem `getLogs` polling, 2000-block batches |
| Toasts | Sonner |

## Contract Architecture

All contracts share the same design principles:

- Constructor-injected USDC address (never hardcoded)
- `ReentrancyGuard` on all state-changing functions involving token transfers
- `SafeERC20` for all USDC operations (no raw `transfer`/`send`)
- Explicit state machines (Solidity enums) — every state transition is guarded
- Custom errors (not require strings) for gas efficiency
- Integer-only arithmetic — no floating-point
- Non-custodial — only designated parties can access their own funds
- NatSpec on all public/external functions

### EscrowManager

Multi-milestone escrow with dual-approval (depositor + arbiter). Each milestone has independent state. Full-escrow dispute path for deadlocked agreements.

```
CREATED → FUNDED → RELEASED (all milestones)
              ↘ DISPUTED → RESOLVED
              ↘ REFUNDED (after deadline)
```

Milestones independently: `NEW → RELEASED | REFUNDED | DISPUTED → RESOLVED`

### ConditionalPayout

Single-oracle conditional payment. Deadline check on both approval and expiry to prevent race conditions.

```
PENDING → ACTIVE → RELEASED
       ↘ CANCELLED      ↘ EXPIRED (after deadline)
```

### BatchPayout

Stateless one-shot batch transfer. Duplicate prevention is scoped per-payer (mapping: `payer → paymentSetId → bool`) to prevent frontrun griefing.

### ScheduledPayout

Per-schedule USDC funding pool. Permissionless `executeSchedule` callable by anyone when due. Payer can cancel and reclaim remaining balance.

### VestingVault

Grantor deposits full amount upfront. Three vesting modes:
- **LINEAR**: smooth interpolation from start to end
- **CLIFF**: zero until cliff, then linear cliff→end
- **PERIODIC**: fixed tranches per interval; final interval returns `totalAmount` (no dust)

Optional revocation returns unvested tokens to grantor; claimed tokens are always safe.

## Frontend Architecture

```
App.tsx → Shell (layout, topbar)
         ├── Sidebar (navigation)
         └── Feature panels (one per module):
             ├── Dashboard      — overview, network info
             ├── EscrowPanel    — create/fund/view/approve/dispute
             ├── ConditionalPanel — create/fund/approve/expire
             ├── BatchPanel     — manual entry, CSV import, execute
             ├── ScheduledPanel — create/fund/execute/cancel
             ├── VestingPanel   — create/claim/revoke
             └── HistoryPanel   — connected-wallet indexed Arc history
```

## Backend Architecture

Wallet history uses Arc Explorer's paginated public v2 transactions, token transfers, and internal transactions endpoints directly. Queries are scoped to the connected account; disconnect hides the tab. Both original/current Pact addresses are classified and other Arc activity is included. Explorer errors and indexing lag are surfaced. The backend's recent in-memory event store is not the wallet-history source. See [payment-fixes-and-history.md](./payment-fixes-and-history.md) for verification and replacement-deployment status.

`server/index.ts` is a Bun HTTP server that:
1. Polls and decodes contract events with `getLogs` in 2000-block batches starting from `head - 2000` on first run
2. Persists indexed events in memory (swap for PostgreSQL in production)
3. Advances its in-memory cursor only after every configured contract has been indexed successfully; failed ranges are retried without committing partial batches
4. Checks `isDue` for all known schedule IDs every 15s and logs due schedules
5. Exposes REST endpoints at `/health`, `/events`, `/events/address`

This service monitors schedules and logs when they are due. It does not sign or submit payment transactions. The event store and cursor are lost when the server restarts; the initial lookback does not provide complete historical indexing. It does not yet handle chain reorganizations. Vite proxies `/api/*` only during development; a production API needs its own deployment and routing.

### Suggested PostgreSQL schema

```sql
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  block_number BIGINT NOT NULL,
  tx_hash      TEXT NOT NULL,
  contract     TEXT NOT NULL,
  event_name   TEXT NOT NULL,
  args         JSONB NOT NULL,
  indexed_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON events (contract);
CREATE INDEX ON events (event_name);
CREATE INDEX ON events ((args->>'depositor'));
CREATE INDEX ON events ((args->>'beneficiary'));

CREATE TABLE indexer_state (
  id              INT PRIMARY KEY DEFAULT 1,
  last_block      BIGINT NOT NULL DEFAULT 0
);
```

## Security Model

- All USDC flows go through `safeTransferFrom` + `safeTransfer` (never `transfer`/`send`)
- No native value (`msg.value`) accepted — USDC-only
- `ReentrancyGuard` on every function that calls `safeTransfer`
- State updated before external call (checks-effects-interactions)
- Access modifiers (`onlyDepositor`, `onlyArbiter`, `onlyPayer`, `onlyGrantor`) guard all privileged actions
- Deadlines enforced by `block.timestamp` — safe for non-exploitable time windows
- Integer math only — no multiplication after division in money paths
- Batch size capped at 500 to prevent gas limit griefing
