/** Read-only Arc estimate. Build first with forge build; no private key is accepted. */
import { readFileSync } from 'node:fs'
import { createPublicClient, defineChain, encodeDeployData, formatUnits, http, isAddress, type Abi, type Hex } from 'viem'

const address = process.argv[2]
if (!address || !isAddress(address)) throw new Error('Usage: bun run scripts/estimate-fix-deployment.ts <deployer-address>')
const usdc = '0x3600000000000000000000000000000000000000'
const chain = defineChain({ id: 5042, name: 'Arc', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } } })
const client = createPublicClient({ chain, transport: http(process.env.ARC_RPC_URL ?? chain.rpcUrls.default.http[0]) })
if (await client.getChainId() !== 5042) throw new Error('Deployment estimates require Arc mainnet')
const gasPrice = await client.getGasPrice()
const estimates = await Promise.all(['EscrowManager', 'ConditionalPayout', 'ScheduledPayout'].map(async (name) => {
  const artifact = JSON.parse(readFileSync(new URL(`../contracts/out/${name}.sol/${name}.json`, import.meta.url), 'utf8')) as { abi: Abi; bytecode: { object: Hex } }
  const gas = await client.estimateGas({ account: address, data: encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode.object, args: [usdc] }) })
  return { contract: name, gas: gas.toString(), estimatedUsdc: formatUnits(gas * gasPrice, 18) }
}))
const totalGas = estimates.reduce((sum, estimate) => sum + BigInt(estimate.gas), 0n)
console.log(JSON.stringify({ chainId: 5042, checkedAt: new Date().toISOString(), gasPrice: gasPrice.toString(), estimates,
  totalGas: totalGas.toString(), estimatedUsdc: formatUnits(totalGas * gasPrice, 18),
  suggestedDeploymentBudgetUsdc: formatUnits((totalGas * gasPrice * 130n + 99n) / 100n, 18),
  note: 'Estimate only. No broadcast. Gas prices may change; existing records do not migrate.' }, null, 2))
