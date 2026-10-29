import { ConnectKitButton } from 'connectkit'
import { ChevronDown, Loader2, Wallet } from 'lucide-react'
import { useAccount, useSwitchChain } from 'wagmi'
import { toast } from 'sonner'
import { ARC_CHAIN_ID } from '@/lib/contracts'
import { cn, parseOnchainError } from '@/lib/utils'
import { ArcLogo } from './ArcLogo'

export function WalletButton({ className }: { className?: string }) {
  return (
    <ConnectKitButton.Custom>
      {({ show, isConnected, isConnecting, truncatedAddress, ensName }) => (
        <button
          type="button"
          onClick={show}
          disabled={!show || isConnecting}
          className={cn(
            'inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-[var(--accent)] px-5 text-base font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
            className,
          )}
        >
          {isConnecting ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-5" strokeWidth={1.8} />}
          {isConnected ? ensName ?? truncatedAddress : isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </ConnectKitButton.Custom>
  )
}

export function ArcWalletButton() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync, isPending } = useSwitchChain()
  const needsSwitch = isConnected && chainId !== ARC_CHAIN_ID
  return (
    <ConnectKitButton.Custom>
      {({ show }) => (
        <button
          type="button"
          aria-label={needsSwitch ? 'Switch wallet to Arc' : isConnected ? 'Open Arc wallet' : 'Connect wallet to Arc'}
          onClick={() => {
            if (needsSwitch) {
              void switchChainAsync({ chainId: ARC_CHAIN_ID }).catch((error: unknown) => {
                toast.error(parseOnchainError(error))
              })
            } else {
              show?.()
            }
          }}
          disabled={isPending || !show}
          className="inline-flex h-[54px] min-w-[148px] items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-5 text-lg font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-[#eef3fc] text-[#1b3158]">
            <ArcLogo className="h-6 w-[22px]" />
          </span>
          Arc
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" strokeWidth={2} />}
        </button>
      )}
    </ConnectKitButton.Custom>
  )
}
