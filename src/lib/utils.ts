import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function formatUsdc(raw: bigint, decimals = 6): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : `${whole}`
}

export function parseUsdc(value: string, decimals = 6): bigint {
  const [whole, frac = ''] = value.split('.')
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0')
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded)
}

export function formatTimestamp(ts: number | bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString()
}

export function formatDuration(seconds: number | bigint): string {
  const s = Number(seconds)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.'
  if (msg.includes('chain') && (msg.includes('does not match') || msg.includes('chainmismatch'))) {
    return 'Switch your wallet to Arc before continuing.'
  }
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) return 'Insufficient balance.'
  if (msg.includes('invalidstate')) return 'Invalid operation for current state.'
  if (msg.includes('unauthorized')) return 'You are not authorized for this action.'
  if (msg.includes('deadlinepassed')) return 'The deadline has already passed.'
  if (msg.includes('deadlinenotreached')) return 'Deadline has not been reached yet.'
  if (msg.includes('duplicatepaymentsset') || msg.includes('duplicatepayment')) return 'This payment set was already executed.'
  if (msg.includes('reverted')) return 'Transaction reverted. Please check your inputs.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please try again.'
}
