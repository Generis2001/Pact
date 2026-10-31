# Payment verification, fixes, and wallet history — October 31, 2026

## Deployment status

Fixed EscrowManager, ConditionalPayout, and ScheduledPayout replacements are deployed on Arc mainnet and are the current frontend/backend defaults. BatchPayout and VestingVault retain their original addresses. Transaction History recognizes both versions. The original immutable contracts remain unchanged.

Choose **Existing agreements (original)** to manage older records. Original mode hides creation forms; switching contracts resets IDs, receipts, and allowances. Existing funds and approvals do not migrate. The original escrow settlement defect still applies to original agreements; its view warns about previously resolved milestones.

Replacement deployment and live verification completed with **29 successful transactions**, **27 runtime/state/rejection checks**, and **18 independent postflight checks**. Additional gas was **0.192467625 USDC**, within the separately approved 0.20 USDC cap. The main wallet decreased from 0.419877662538579305 to 0.227410037538579305 USDC, exactly equal to receipt gas. All replacement test principal and exact allowances are cleared; the temporary arbiter has zero funds. Public addresses and deployment hashes are in [deployments.json](../public/deployments.json); complete evidence is in [mainnet-upgrade-2026-10-31.json](./mainnet-upgrade-2026-10-31.json).

Live checks verified escrow parent refunds after milestone refunds preserve a second escrow's collateral; independent whole-dispute settlement records the exact beneficiary payout; expired escrow approvals reject; conditional release and expired funding rejection; scheduled final execution surplus refunds; completed/cancelled/expired funding rejection; and full withdrawal of an expired underfunded pool. RPC connectivity interruptions were recovered from confirmed receipts. The second escrow expired during the interruption and was settled by its independent arbiter through dispute resolution; dual-release behavior is covered by the earlier mainnet test and local tests. Deployed runtime bytes exactly match the fixed artifacts with canonical USDC immutables; this is runtime verification, not a third-party audit or a claim of explorer source verification.

## Mainnet verification

Arc mainnet chain ID 5042 was verified by RPC. Deployed runtime code was compared with the original compiled contracts. Tests used wallet `0x0986Bfd653985c9Fa60a464784264444B542BfD7` with a total spending cap below 0.1 USDC, including gas.

| Item | Result |
| --- | --- |
| Successful transactions | 29 |
| Runtime state / rejection checks | 32 |
| Independent postflight checks | 23 |
| Initial native USDC | 0.508597337538579305 |
| Final native USDC | 0.419877662538579305 |
| Total spent, all gas | **0.088719675 USDC** |
| Remaining temporary arbiter balance | 0 |
| Test principal | Returned / settled |

Arc native USDC (18 decimals) and its ERC20 representation (6 decimals) use the same fund pool. Summing both wallet balances would double-count funds. Costs were independently reconciled against receipt gas and the native balance decrease.

| Feature | Mainnet paths verified |
| --- | --- |
| Escrow | Create/fund; first approval holds funds; independent arbiter releases a milestone; dispute/refund of the remaining milestone; settled record |
| Conditional | Create/fund; authorized release; unauthorized and premature-expiry rejection; post-deadline approval rejection; expiry refund |
| Batch | Estimate; two-recipient execution; exact transfers; payer execution flag; duplicate rejection |
| Scheduled | Create/fund; due checks; withdrawal; execution; early-repeat rejection; cancellation and full remaining-pool refund; inactive-execution rejection |
| Vesting | Linear partial claim/revoke; cliff and periodic full claims; completion; unauthorized, non-revocable, and nothing-claimable rejection |

Rejection probes used read-only calls when possible. The budget did not allow every branch to be exercised by a mainnet write; the remaining branches and fixes were tested locally. Transaction hashes and check results are in [mainnet-test-2026-10-31.json](./mainnet-test-2026-10-31.json).

The supplied signing key was exposed in chat. Temporary signing files were deleted and no private keys are committed. Retire that test wallet for future use.

## Repairs

- Escrow remaining-funds settlement excludes already released/refunded/resolved milestones. This closes a path where a subsequent parent refund/dispute could pay twice from other escrows' collateral. Mixed-settlement fuzz tests verify a different payer's collateral remains intact.
- Escrow enforces parent/milestone deadlines consistently, rejects depositor/arbiter overlap, accounts for beneficiary dispute payouts, and reports actual cumulative beneficiary release in its completion event.
- Scheduled pools reject cancelled/completed/expired funding, refund unused funds on final execution, and let expired pools recover their entire remaining balance. `ScheduleCompleted` reports the refund.
- Conditional agreements reject funding after their condition deadline.
- Full generated ABIs replace incorrect hand-written tuple/event layouts. Dynamic escrow milestones and scheduled/vesting terminal states now decode correctly. The backend shares those ABIs.
- Frontend confirmations require a successful receipt. Confirmations refresh contract views, balances, allowances, and history. Approval validity comes from the connected wallet's current allowance.
- Payment amounts use exact integer parsing and reject negative fractions, excess precision, invalid uint256 IDs, zero addresses, invalid timestamps, and invalid intervals. Lookup actions respect wallet roles and deadlines. Escrow whole/milestone dispute resolution and schedule withdrawals are available.
- Creation forms for escrow/conditional agreements no longer require an approval before creating an unfunded record. Successful transaction buttons recover for subsequent actions. Form labels are associated with their inputs. Scheduled status distinguishes completion from cancellation; vesting progress reports the amount claimed and displays terminal state.
- Scheduled payments require a caller when due. The UI now states this accurately; the optional backend monitors and logs due schedules without signing payments.

## Connected-wallet Transaction History

The desktop/mobile navigation exposes Transaction History only after a successful wallet connection. Disconnect hides the view. Account changes use separate query keys and reset the panel, preventing a prior wallet's activity from appearing under another wallet.

The frontend queries Arc Explorer's public Blockscout v2 indexed address endpoints for transactions, token transfers, and internal transactions. It follows each endpoint's pagination cursor, merges by transaction hash, preserves distinct transfer logs, and includes received payouts submitted by other wallets. Original and currently configured Pact deployments are classified across all five features. Non-Pact Arc activity remains visible.

The view includes feature/status filters, refresh, older-page loading, exact amounts, batch recipient counts/totals, record IDs, wallet-paid gas, timestamps, and explorer links. Arc's mirrored native/ERC20 USDC transfer is shown once at native precision. Other token contracts have links so equal token symbols are distinguishable.

Explorer indexing can lag. Failed endpoint requests, timeouts, and partial results are shown explicitly; they do not become an empty successful history. A failed internal call is not assumed to mean its parent transaction failed. No signature is required. No recent-only RPC scan or in-memory backend history is presented as complete wallet activity.

Browser verification against live explorer data loaded **78 unique indexed transactions**, including older pages and received transfers. All five feature filters recognized historical Pact activity, including successful batch/scheduled payouts. No signing request occurred while viewing history.

## Validation

- Foundry: 195 passing tests, including 17 new regressions and mixed-settlement fuzz coverage.
- Bun: 22 frontend/backend tests covering ABI parity, exact inputs, indexed history merging/pagination/errors, and schedule-completion refund decoding.
- TypeScript: frontend/scripts, server, and tests checked separately.
- Lint and production Vite build.
- Replacement browser views read live current/original escrow and schedule records. All three version selectors use the correct explorer address; original creation forms are hidden, switching clears IDs, and the mobile selector has no horizontal overflow. The read-only provider recorded zero signing requests.
- Isolated browser writes through an unlocked local test provider on an Anvil chain: escrow creation/funding/dual approval, conditional release, scheduled withdrawal/completion refund/cancellation, batch execution, and vesting claim. All signing routes were constrained to local RPC and local contract addresses; no additional mainnet funds were spent.

## Replacement deployment reference

Read-only estimates from Arc RPC at `2026-10-31T13:24:47Z`, gas price 25,000,000,000 wei:

| Replacement | Estimated gas | USDC |
| --- | ---: | ---: |
| EscrowManager | 2,147,156 | 0.0536789 |
| ConditionalPayout | 1,061,475 | 0.026536875 |
| ScheduledPayout | 1,409,385 | 0.035234625 |
| Total | 4,618,016 | **0.1154504** |

The original estimate exceeded the remaining 0.011280325 USDC test allowance. A separate additional 0.20 USDC allowance was approved, and replacements were deployed at an actual deployment cost of 0.114454475 USDC. Live verification and cleanup brought the additional total to 0.192467625 USDC. The commands below are a reference for future separately authorized deployments; do not redeploy these replacements.

```bash
forge build
bun run scripts/estimate-fix-deployment.ts <deployer-address>
# After additional budget and a keystore signer are authorized:
export DEPLOYER_ADDRESS=<keystore-wallet-address>
forge script contracts/script/DeployFixes.s.sol:DeployFixes \
  --rpc-url https://rpc.mainnet.arc.io --account <keystore-name>
# Review the simulation before adding --broadcast.
```

The frontend/backend address bindings now use the replacements and preserve an explicit UI route to the original agreements. Existing IDs, approvals, and funds stay in the original contracts and do not migrate automatically. History already recognizes the original addresses. Replacement approvals must target the new spender addresses. Verify deployed code, regenerated ABIs, receipts, and final balances after broadcasting; the original vulnerable escrow deployment is not repaired by redeployment.
