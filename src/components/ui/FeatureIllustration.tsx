import { ArrowRight, Check, Clock3, GitBranch, LockKeyhole, ShieldCheck, Users, Wallet } from 'lucide-react'
import type { PaymentTab } from '@/components/layout/Shell'

const icons = {
  escrow: ShieldCheck,
  conditional: Check,
  batch: Users,
  scheduled: Clock3,
  vesting: LockKeyhole,
}

export function FeatureIllustration({ feature }: { feature: PaymentTab }) {
  const Icon = icons[feature]
  return (
    <div className="flex h-16 items-center justify-center gap-3" aria-hidden="true">
      <div className="flex size-11 items-center justify-center rounded-xl border border-[#e6eaf0] bg-white text-[#b1bed1] shadow-[0_2px_6px_rgba(18,20,30,0.05)]">
        <Wallet className="size-5" strokeWidth={1.6} />
      </div>
      {feature === 'conditional' || feature === 'batch' ? (
        <GitBranch className="size-6 text-[var(--accent)]" strokeWidth={1.6} />
      ) : (
        <ArrowRight className="size-6 text-[var(--accent)]" strokeWidth={1.6} />
      )}
      <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
        <Icon className="size-6" strokeWidth={1.7} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="h-1.5 w-6 rounded-full bg-[#e3e7ec]" />
        <span className="h-1.5 w-4 rounded-full bg-[#edf0f3]" />
      </div>
    </div>
  )
}
