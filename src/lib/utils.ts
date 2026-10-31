import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { parseUsdc as parseUsdcExact, formatUsdc as formatUsdcExact } from '@/onchain-money'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export const formatUsdc = formatUsdcExact
export const parseUsdc = parseUsdcExact

/** Incomplete, negative, or imprecise form input must never become a payment amount. */
export function readUsdcInput(value: string): bigint {
  try {
    const amount = parseUsdc(value)
    return amount > 0n && amount < 2n ** 256n ? amount : 0n
  } catch {
    return 0n
  }
}

export function parseRecordId(value: string): bigint | undefined {
  const id = parseUintInput(value)
  return id && id > 0n ? id : undefined
}

export function parseUintInput(value: string): bigint | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined
  const integer = BigInt(value.trim())
  return integer < 2n ** 256n ? integer : undefined
}

export function parseTimestampInput(value: string): bigint | undefined {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp >= 0 ? BigInt(Math.floor(timestamp / 1000)) : undefined
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
  return /^0x[0-9a-fA-F]{40}$/.test(addr) && !/^0x0{40}$/i.test(addr)
}

export function isSameAddress(first: string | undefined, second: string | undefined): boolean {
  return !!first && !!second && first.toLowerCase() === second.toLowerCase()
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
  if (msg.includes('invalidarbiter')) return 'The arbiter must be different from the depositor.'
  if (msg.includes('inactiveschedule')) return 'This schedule is no longer active.'
  if (msg.includes('invalidwithdrawalamount')) return 'Keep one payment funded while the schedule is active.'
  if (msg.includes('invalidinterval')) return 'Payment intervals must be at least one day.'
  if (msg.includes('nothingclaimable')) return 'No vested funds are available to claim yet.'
  if (msg.includes('deadlinenotreached')) return 'Deadline has not been reached yet.'
  if (msg.includes('duplicatepaymentsset') || msg.includes('duplicatepayment')) return 'This payment set was already executed.'
  if (msg.includes('reverted')) return 'Transaction reverted. Please check your inputs.'
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please retry.'
  return 'Something went wrong. Please try again.'
}
