# Arc mainnet verification

Read-only checks against `https://rpc.mainnet.arc.io` on October 29, 2026 returned chain ID **5042**. The saved RPC observation was at **12:42 UTC**, with head block **28,477,772**. This is a snapshot of the documented addresses and transaction hashes, not a complete transaction-history scan.

## Deployed contracts

All five addresses returned non-empty runtime bytecode:

| Contract | Address | Runtime bytecode size |
| --- | --- | ---: |
| EscrowManager | `0x3eF17D9Cd787030Eb68Eb6b2FC6D7F298B9B136F` | 9,015 bytes |
| ConditionalPayout | `0x196B618c6a31A5100b5F9774089E3f6913B9aa55` | 4,373 bytes |
| BatchPayout | `0xab3f589c7ca55aA6272B1b159ed12d0E7623F798` | 2,657 bytes |
| ScheduledPayout | `0x5B4A641Fd1C2E67205d9d4947bcBD63EEDddD5Ab` | 5,615 bytes |
| VestingVault | `0x620eBbf0F0d7acE2202Db95fd6ee0BB42F9510A6` | 5,010 bytes |

USDC ERC-20 address: `0x3600000000000000000000000000000000000000` (6 decimals). Bytecode presence confirms deployment; it is not a security audit or source verification.

## Confirmed payment activity

The RPC returned successful receipts (`status: 0x1`) and decoded Pact events for these transactions on **October 18, 2026**. Times below are UTC.

| Time | Block | Event | Amount | Transaction |
| --- | ---: | --- | --- | --- |
| 17:50:13 | 26,640,871 | EscrowFunded, escrow #1 | 0.010 USDC | [`0x669fa478e36254d32900f1fc6dc0d523c0931c128d50bae47be2079f6aeb6025`](https://explorer.arc.io/tx/0x669fa478e36254d32900f1fc6dc0d523c0931c128d50bae47be2079f6aeb6025) |
| 17:50:51 | 26,640,946 | AgreementCreated, agreement #1 | 0.005 USDC specified | [`0x96692def233d376310466c8f7e2eaa22bad7d77169acb1a852385d8f4b457bf6`](https://explorer.arc.io/tx/0x96692def233d376310466c8f7e2eaa22bad7d77169acb1a852385d8f4b457bf6) |
| 17:51:46 | 26,641,055 | BatchExecuted and two PaymentSent events | 0.002 + 0.003 USDC sent | [`0x74fd3660ed7851c6e49b2db8739a0e3c29c0b4f721a1efd2648224083de5cb93`](https://explorer.arc.io/tx/0x74fd3660ed7851c6e49b2db8739a0e3c29c0b4f721a1efd2648224083de5cb93) |
| 17:52:29 | 26,641,138 | ScheduleCreated, schedule #1 | 0.005 USDC per payment configured | [`0x9de1005410afc51d15581b7709b8b1b68060cf24e8dabf4317e8a3fafcb519d0`](https://explorer.arc.io/tx/0x9de1005410afc51d15581b7709b8b1b68060cf24e8dabf4317e8a3fafcb519d0) |

These receipts identify sender `0x0986bfd653985c9fa60a464784264444b542bfd7`. Agreement/schedule creation does not establish that those contracts were subsequently funded or that a recipient received a payout. The batch receipt does confirm payment to two recipients.

Some documented hashes returned no receipt, and several confirmed receipts had no transaction body available through `eth_getTransactionByHash`. A missing RPC result is inconclusive. No VestingVault activity was confirmed by this set of checks; this does not establish that there has never been vesting activity.

## Wallet-warning investigation

On October 29, 2026, both `https://pactonarc.vercel.app` and `https://pact-ten-steel.vercel.app` served the same app bundle. The deployed wallet configuration had an empty WalletConnect project ID, so WalletConnect's Verify API was not involved in that deployment's connection flow. The browser used its current origin for wallet metadata. The Arc Studio provider/fetch tracing modules were absent from the app's entry-point imports and the deployed bundle's diagnostic markers.

Checks against MetaMask's public [`eth-phishing-detect` configuration](https://github.com/MetaMask/eth-phishing-detect/blob/main/src/config.json) found no exact, parent-domain, or fuzzy match for these two hostnames, using its published matching rules and tolerance. This checks one public data source; it does not establish a verdict from Blockaid, other wallets, or private security services. The OKX DApp scan failed with `Invalid Authority` after its session expired and provided no verdict. The failed scan was skipped at the user's instruction to continue.

The frontend did have unpinned transaction requests despite Arc-specific reads. Those requests and receipt queries now specify Arc, transaction errors are surfaced, and the switch button names Arc correctly. The unused Aave account connector is disabled. These changes address concrete connection/network issues; the exact cause of the reported domain flags remains unconfirmed until the warning text and provider are identified. See [wallet trust](wallet-trust.md) for the provider-review process.

## Frontend validation

Lint, frontend/backend TypeScript checks, and the production Vite build pass. A Chromium browser check with an isolated EIP-6963 mock wallet confirmed account-only connection permissions, switching from Ethereum to Arc on connection, an available network-switch button before form/approval prerequisites, blocking a wrong-network approval before any transaction request, and an Arc USDC approval for the BatchPayout contract for exactly 0.001 USDC. Every transaction request was rejected by the mock; the test did not sign or broadcast transactions. This exercises Pact's request behavior, not a wallet security provider's reputation verdict.
