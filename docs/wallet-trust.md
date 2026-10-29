# Wallet warnings and Pact metadata

The app supplies a description, Open Graph and Twitter metadata, a web app manifest, and an SVG favicon. WalletConnect metadata uses the running app's origin and icon. These additions identify Pact and improve browser and link previews; they do not guarantee that a wallet or security provider will remove a warning.

If a wallet flags a legitimate Pact deployment:

1. Check the warning for the security provider and reason. Verify that the deployment URL, contract addresses, and wallet connection metadata are correct.
2. For a Blockaid warning, use its verified-project submission page: https://report.blockaid.io/verifiedProject. Supply the deployment domain, project description, contract addresses, and contact details. Approval and timing are determined by the provider.
3. Register the deployment's allowed origins in WalletConnect Cloud at https://cloud.walletconnect.com and set `VITE_WALLETCONNECT_PROJECT_ID` in the deployment environment.
4. If MetaMask identifies its phishing blocklist as the cause, follow the false-positive reporting process at https://github.com/MetaMask/eth-phishing-detect.

The canonical metadata in `index.html` currently uses `https://pactonarc.vercel.app`. Update its URLs when changing the public deployment domain. The manifest references the included `/favicon.svg`; all local metadata assets exist in `public/`.

The public frontend keeps the existing wallet-security fix: it does not import the Arc Studio modules that patch `fetch` or wallet providers. WalletConnect continues to use the current origin instead of a hardcoded unrelated domain.

## October 29 investigation

See [mainnet verification](mainnet-verification.md) for the deployed-domain observations, successful transaction receipts, and scan limits. Both known domains served the same bundle, with WalletConnect disabled. Neither hostname had an exact or parent-domain match in MetaMask's public blocklist. The OKX scan expired with `Invalid Authority`; it provided no verdict. The warning's provider and exact wording are still needed to establish its cause.

Payment requests and receipt checks now explicitly use chain 5042. A request made while a wallet uses another chain cannot silently become a Pact approval/payment on that other chain. Network errors are displayed, and users can switch to Arc before approving funds. The unused Aave account connector is disabled, and wallet metadata has no fallback to a different production hostname. These fixes do not remove a third-party domain reputation entry.

## Project-review submission draft

This draft can be submitted to the provider named in the warning. It has not been sent. If that provider is Blockaid, use https://report.blockaid.io/verifiedProject.

- Project: Pact — programmable, non-custodial USDC payments on Arc.
- Repository: https://github.com/Generis2001/Pact
- Observed deployment domains: https://pactonarc.vercel.app and https://pact-ten-steel.vercel.app
- Contact: Generis2001, wpsdocs9@gmail.com
- Network: Arc, chain ID 5042, RPC https://rpc.mainnet.arc.io
- Contracts and successful transaction evidence: [mainnet verification](mainnet-verification.md).
- Connection behavior: the user initiates wallet connection; Pact's connection buttons do not request message signatures, token approvals, or payments. Payment actions use explicit amounts and chain 5042. The public app does not import Arc Studio's wallet/fetch interception modules.
- Review request: identify the reason for the reported wallet/domain warnings and review whether these deployments are being incorrectly classified.

Include the warning's exact wording, affected wallet versions, and any additional deployment domains when filing the review. Register every domain separately where the provider requires it; a repository commit cannot update the provider's records.
