import { cn } from '@/lib/utils'

export function PactLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/pact-logo.svg"
      alt="Pact"
      width={132}
      height={60}
      className={cn('block shrink-0', className)}
      draggable={false}
    />
  )
}
