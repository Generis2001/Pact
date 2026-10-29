/**
 * Transaction CTA button that surfaces real wagmi/viem states.
 * Never simulates states — only shows what hooks report.
 */
import { Loader2 } from 'lucide-react'
import { cn, parseOnchainError } from '@/lib/utils'
import { ARC_CHAIN_ID } from '@/lib/contracts'
import { useAccount, useSwitchChain } from 'wagmi'
import { toast } from 'sonner'

export function TxButton({
  label, onClick, isPending, isConfirming, isSuccess, disabled, className,
}: {
  label: string
  onClick?: () => void
  isPending?: boolean
  isConfirming?: boolean
  isSuccess?: boolean
  disabled?: boolean
  className?: string
}) {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID

  const handleClick = () => {
    if (wrongChain) {
      switchChain({ chainId: ARC_CHAIN_ID }, {
        onError: (error) => toast.error(parseOnchainError(error)),
      })
      return
    }
    onClick?.()
  }

  const busy = isPending || isConfirming || isSwitching
  // Allow a network switch before the form/approval prerequisites are met.
  const isDisabled = !isConnected || busy || (!wrongChain && (disabled || isSuccess))

  const content = !isConnected
    ? 'Connect Wallet'
    : wrongChain || isSwitching
    ? isSwitching ? 'Switching…' : 'Switch to Arc'
    : isPending
    ? <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Confirm in wallet…</span>
    : isConfirming
    ? <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Confirming…</span>
    : isSuccess
    ? 'Done'
    : label

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        'w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all',
        'hover:scale-[1.01] active:scale-[0.99]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100',
        isSuccess
          ? 'bg-[var(--success)]'
          : wrongChain
          ? 'bg-[var(--warning)]'
          : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]',
        className,
      )}
    >
      {content}
    </button>
  )
}
