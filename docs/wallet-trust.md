# Wallet warnings and Pact metadata

The app supplies a description, Open Graph and Twitter metadata, a web app manifest, and an SVG favicon. WalletConnect metadata uses the running app's origin and icon. These additions identify Pact and improve browser and link previews; they do not guarantee that a wallet or security provider will remove a warning.

If a wallet flags a legitimate Pact deployment:

1. Check the warning for the security provider and reason. Verify that the deployment URL, contract addresses, and wallet connection metadata are correct.
2. For a Blockaid warning, use its verified-project submission page: https://report.blockaid.io/verifiedProject. Supply the deployment domain, project description, contract addresses, and contact details. Approval and timing are determined by the provider.
3. Register the deployment's allowed origins in WalletConnect Cloud at https://cloud.walletconnect.com and set `VITE_WALLETCONNECT_PROJECT_ID` in the deployment environment.
4. If MetaMask identifies its phishing blocklist as the cause, follow the false-positive reporting process at https://github.com/MetaMask/eth-phishing-detect.

The canonical metadata in `index.html` currently uses `https://pactonarc.vercel.app`. Update its URLs when changing the public deployment domain. The manifest references the included `/favicon.svg`; all local metadata assets exist in `public/`.

The public frontend keeps the existing wallet-security fix: it does not import the Arc Studio modules that patch `fetch` or wallet providers. WalletConnect continues to use the current origin instead of a hardcoded unrelated domain.
