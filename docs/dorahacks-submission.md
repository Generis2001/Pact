# Pact — DoraHacks submission draft

Prepared for [Arc Microgrants 2](https://dorahacks.io/hackathon/arc-microgrants-2/). The event URL was provided by the entrant; eligibility rules, deadline, tracks, required fields, and field limits have not yet been verified. This document is a reusable project draft; no DoraHacks entry has been submitted.

On October 29, 2026, both a public-page fetch and a browser visit returned HTTP 405 with DoraHacks' human-verification screen. The event details still need to be read after that verification is completed.

## Project name

Pact

## Tagline

USDC payments on Arc, governed by your rules.

## Short description

Pact is a non-custodial USDC payments platform on Arc. It combines milestone escrow, conditional payouts, batch payments, recurring schedules, and vesting in one app, helping freelancers and teams define when funds are released, who receives them, and how payments unfold over time.

## Project description

### The problem

A simple transfer does not express the terms of a business agreement. Freelancers need payment tied to deliverables, teams need to pay multiple contributors, and grants or compensation may need to unlock over time. Handling these rules manually creates administrative work and uncertainty about when funds will be available or released.

### What Pact builds

Pact turns those payment terms into smart contracts on Arc. Users connect a wallet and choose the payment workflow that fits their agreement:

- **Milestone escrow:** Fund an agreement and release USDC as milestones receive the required depositor and arbiter approvals. Dispute resolution and deadline-based refunds support agreements that do not proceed as planned.
- **Conditional payouts:** Release USDC when a designated approver confirms that an agreed condition has been met, with cancellation and expiry paths.
- **Batch payments:** Pay multiple recipients atomically in one transaction. CSV import helps prepare recipient lists, and a payer-scoped payment identifier prevents duplicate batch execution.
- **Scheduled payments:** Create a payment schedule and fund its USDC pool. Anyone can trigger execution when the schedule is due; the payer can cancel it and recover remaining funds.
- **Vesting vaults:** Deposit USDC upfront and let beneficiaries claim according to linear, cliff, or periodic vesting. Optional revocation lets the grantor recover unvested funds according to the contract rules.

These workflows share one interface and use explicit onchain rules for access, timing, and release. Pact is intended for freelancer agreements, contributor compensation, grants, and recurring business payments.

### Why Arc

Pact uses Arc as its execution and settlement network. Its five payment contracts are deployed on the configured Arc mainnet, chain ID 5042, and settle in USDC. Arc's native USDC gas model lets users work with the same currency for payments and transaction fees.

Pact was built with Arc Studio. The frontend uses React, TypeScript, wagmi, viem, and ConnectKit; the contracts use Solidity, Foundry, and OpenZeppelin. Payment requests and receipt checks explicitly target Arc.

### What works today

The repository contains all five contracts, their test suites, and the frontend workflows. Read-only RPC checks confirmed deployed runtime code at all five configured addresses and successful receipts for escrow funding, conditional agreement creation, batch payments, and payment schedule creation.

The confirmed activity occurred on October 18, 2026. The batch receipt includes payments to two recipients. See the linked verification document for amounts, hashes, and the scope of the checks. Vesting activity was not confirmed by that set of RPC observations.

The optional Bun backend decodes contract events and monitors due schedules. It does not sign or submit transactions. Durable historical indexing and automatic execution are future work.

### Next steps

Add persistent event indexing, integrate a keeper for scheduled execution, improve payment notifications, and expand end-to-end testing across the five workflows. Resolve the outstanding wallet-domain reputation reports with the relevant provider and obtain independent contract review before broader financial use.

## Project links

- Live app: https://pactonarc.vercel.app
- Source: https://github.com/Generis2001/Pact
- Architecture: https://github.com/Generis2001/Pact/blob/main/docs/architecture.md
- Deployed addresses and confirmed transactions: https://github.com/Generis2001/Pact/blob/main/docs/mainnet-verification.md
- Wallet investigation and provider-review draft: https://github.com/Generis2001/Pact/blob/main/docs/wallet-trust.md
- Project logo for upload: `public/brand/pact-icon.png` (1024 × 1024 PNG).

## Suggested demo outline

Adapt the length to the hackathon's actual video requirements. A two-minute walkthrough could use this sequence:

1. **0:00–0:20 — Explain the problem.** Business payments need conditions, recipients, and timing; a transfer alone does not encode the agreement.
2. **0:20–0:40 — Show the app.** Introduce the five workflows and the Arc wallet control. Explain that users initiate wallet connections and payment actions.
3. **0:40–1:10 — Show escrow and conditional payouts.** Demonstrate how an agreement specifies its beneficiary, approver or arbiter, amount, and deadline. Explain the approval and release rules.
4. **1:10–1:35 — Show batch payments.** Demonstrate recipient entry or CSV import, the total, and the duplicate-prevention identifier. Open the confirmed batch transaction in Arc Explorer as execution evidence.
5. **1:35–1:55 — Show schedules and vesting.** Explain funded payment pools, execution when due, and vesting claims. Distinguish currently implemented rules from the planned keeper service.
6. **1:55–2:00 — Show the repository.** Point judges to the code, contract addresses, and verified transaction evidence.

Existing confirmed transactions can demonstrate execution without creating new payments. If recording live transactions, use the intended consenting recipients and review the amounts and agreement terms in the wallet.

## Submission details still needed

- Verify eligibility, deadline, tracks, and required assets at https://dorahacks.io/hackathon/arc-microgrants-2/.
- Entrant/team profile and any other team members; the repository author is Generis2001, but team size and membership have not been confirmed.
- Public demo-video URL, if the event requires one. No recorded submission video is available in this draft.
- Final confirmation of the project details, declarations, and any event-specific terms before submitting the public entry.

The deployed contracts and historical transactions establish implementation evidence, not eligibility or an independent security audit. Keep confirmed activity separate from historical actions whose receipts could not be retrieved.
