# Vercel address synchronization and production verification — November 2, 2026

Pact's Vercel project still stored the original contract addresses. The three existing variables were updated in Production, Preview, and Development, preserving their environment targets and encrypted storage type. Their actual values were independently pulled from all three environments and verified.

| Vercel variable | Verified replacement address |
| --- | --- |
| `VITE_ESCROW_MANAGER` | `0x5055fadc05000be926531dd26075d53804343de5` |
| `VITE_CONDITIONAL_PAYOUT` | `0x83bcda8e6093bfa97ddb79cad76d121ba2757856` |
| `VITE_SCHEDULED_PAYOUT` | `0x75f6b1b52801a734db711fbbcdc0b90b674a4592` |

The current main commit `0e0cd730c760e6970ed5efa8f5262f95a95c16c9` was redeployed as `dpl_3iQPbSixCXUnTBT21AwXJ2ABrXu8`. Vercel reported READY with both `pactonarc.vercel.app` and `pact-ten-steel.vercel.app` attached. The live JavaScript was read and its configured address arguments matched all three replacements. The application still preserves its original-agreement selector and known-stale-address fallback.

The user authorized a separate test round below 0.1 USDC, including gas. A 0.099 USDC guard conservatively charged gas, gross temporary arbiter funding, and gross token deposits, with a cleanup reserve before ordinary writes. No replacement deployments were performed in this round.

| Item | Verified result |
| --- | --- |
| Successful transactions | 15 |
| Live state/rejection/cleanup checks | 19 |
| Independent postflight checks | 21 |
| Actual gas cost | **0.036588615 USDC** |
| Conservative gas + gross temporary funding/deposits | 0.041638615 USDC |
| Initial native USDC | 0.220708579073579305 |
| Final native USDC | 0.184119964073579305 |
| Temporary arbiter balance | 0 |
| Test principal / exact allowances | Returned / fully consumed |

Receipt gas exactly reconciled with the wallet balance decrease. Arc native USDC and its ERC20 representation were not added together. This cost is for the new production-verification round; the earlier 0.088719675 USDC feature test and 0.192467625 USDC deployment/verification round remain separate.

| Feature | New live verification |
| --- | --- |
| Escrow #3 | Created and funded with 0.00001 USDC; payer approval held funds; an independent arbiter released the exact principal; terminal state and Released event verified; overlapping depositor/arbiter rejected by read-only simulation |
| Conditional agreement #3 | Created/funded with 0.00001 USDC; unauthorized approval rejected by read-only simulation; authorized release succeeded and principal returned |
| Scheduled payout #4 | Funded with 0.00003 USDC for one 0.00001 USDC execution; completion refunded 0.00002 USDC; zero pool and one execution verified; completed funding/re-execution rejected by read-only simulation |

The production browser showed all three terminal records under the correct replacement-address links. The connected-wallet history displayed their successful transactions under Escrow, Conditional Payout, and Scheduled Payout filters, including the independent arbiter's received payout and the schedule surplus refund. Browser verification used a read-only provider and recorded zero signing requests. The controlled transactions were submitted by the bounded signer runner against Arc mainnet.

All three deployed runtimes matched the fixed artifacts with canonical USDC immutables. Original agreements remain in their original contracts; this test did not settle or migrate older user agreements. No additional functional defect was observed in the paths exercised. Temporary onchain signing files were deleted; no credentials or signing keys are included in the evidence.

Full public receipts, transaction hashes, state checks, environment values, deployment details, and browser results are in [vercel-sync-and-mainnet-test-2026-11-02.json](./vercel-sync-and-mainnet-test-2026-11-02.json).
