import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, useBlock, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Hash, Address } from 'viem'
import { toast } from 'sonner'
import { ARC_CHAIN_ID, ERC20_ABI, USDC_ADDRESS } from '@/lib/contracts'
import { parseOnchainError } from '@/lib/utils'

/** Refresh contract views only after confirmation, and never treat a reverted receipt as success. */
export function useTransactionReceipt(hash?: Hash, successMessage?: string) {
  const receipt = useWaitForTransactionReceipt({ chainId: ARC_CHAIN_ID, hash })
  const queries = useQueryClient()
  const handled = useRef<Hash | undefined>(undefined)

  useEffect(() => {
    if (!hash || handled.current === hash || (!receipt.data && !receipt.error)) return
    handled.current = hash
    if (receipt.error) {
      toast.error(parseOnchainError(receipt.error))
      return
    }
    if (receipt.data?.status !== 'success') {
      toast.error('Transaction reverted. Please check your inputs.')
      return
    }
    void queries.invalidateQueries({
      predicate: (query) => ['readContract', 'readContracts', 'balance', 'walletHistory'].includes(String(query.queryKey[0])),
    })
    if (successMessage) toast.success(successMessage)
  }, [hash, receipt.data, receipt.error, queries, successMessage])

  return { ...receipt, isSuccess: receipt.data?.status === 'success' }
}

/** Approval belongs to the current wallet and spender, rather than a previous form submission. */
export function useUsdcAllowance(spender: Address) {
  const { address } = useAccount()
  return useReadContract({
    chainId: ARC_CHAIN_ID,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, spender] : undefined,
    query: { enabled: !!address },
  })
}

export function useChainTimestamp() {
  const [initialTimestamp] = useState(() => BigInt(Math.floor(Date.now() / 1000)))
  const { data: block } = useBlock({ chainId: ARC_CHAIN_ID, query: { refetchInterval: 5000 } })
  return block?.timestamp ?? initialTimestamp
}
