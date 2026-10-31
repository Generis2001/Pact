import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ExternalLink, History, RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { type Address } from 'viem'
import { USDC_ADDRESS } from '@/lib/contracts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatAddress as shortAddress } from '@/lib/utils'
import {
  fetchHistoryPage, mergeHistory, HISTORY_LABELS, type HistoryFeature, type HistoryCursor, type HistoryStream, type HistoryRecord,
} from '@/lib/transaction-history'

function useHistory(address: Address, stream: HistoryStream) {
  return useInfiniteQuery({
    queryKey: ['walletHistory', 5042, address.toLowerCase(), stream],
    queryFn: ({ pageParam, signal }) => fetchHistoryPage(address, stream, pageParam, signal),
    initialPageParam: null as HistoryCursor | null,
    getNextPageParam: (page) => page.next_page_params ?? undefined,
    staleTime: 15_000,
    retry: 1,
  })
}

const statusColor = { Successful: 'var(--success)', Failed: 'var(--danger)', Pending: 'var(--warning)', Unknown: 'var(--muted)' }
function TransactionRow({ record, wallet }: { record: HistoryRecord; wallet: Address }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? record.transfers : record.transfers.slice(0, 2)
  const date = record.timestamp ? new Date(record.timestamp) : null
  return (
    <article className="border-b border-[var(--border)] py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{record.action}</h2>
            <span className="rounded-full bg-[var(--accent-dim)] px-2.5 py-1 text-xs text-[var(--accent)]">{HISTORY_LABELS[record.feature]}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{record.detail}</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: statusColor[record.status] }}>{record.status}</span>
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((transfer) => (
          <div key={transfer.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {transfer.direction === 'Received' ? <ArrowDownLeft className="size-4 text-[var(--success)]" /> : <ArrowUpRight className="size-4 text-[var(--muted)]" />}
            <span className="font-medium break-all" title={transfer.token}>{record.status === 'Failed' || record.action === 'Failed internal call' ? 'Attempted transfer' : transfer.direction} {transfer.amount} {transfer.asset}</span>
            {transfer.token && transfer.token.toLowerCase() !== USDC_ADDRESS.toLowerCase() && <a href={`https://explorer.arc.io/token/${transfer.token}`} target="_blank" rel="noreferrer" className="mono text-xs text-[var(--accent)]" title="Token contract">({shortAddress(transfer.token)})</a>}
            <span className="text-xs text-[var(--muted)]">{transfer.direction === 'Received' ? 'from' : 'to'} </span>
            <a href={`https://explorer.arc.io/address/${transfer.direction === 'Received' ? transfer.from : transfer.to}`} target="_blank" rel="noreferrer" className="mono text-xs text-[var(--accent)]">
              {shortAddress(transfer.direction === 'Received' ? transfer.from : transfer.to)}
            </a>
          </div>
        ))}
        {record.transfers.length > 2 && <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-[var(--accent)]">{expanded ? 'Show fewer transfers' : `Show all ${record.transfers.length} transfers`}</button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
        {date && !Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{date.toLocaleString()}</time>}
        {record.fee && record.from?.toLowerCase() === wallet.toLowerCase() && <span>Gas {record.fee} USDC</span>}
        <a href={`https://explorer.arc.io/tx/${record.hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--accent)]" title={record.hash}>
          {shortAddress(record.hash)} <ExternalLink className="size-3" /><span className="sr-only">View transaction</span>
        </a>
      </div>
    </article>
  )
}

export function HistoryPanel({ address }: { address: Address }) {
  const [feature, setFeature] = useState<HistoryFeature | 'all'>('all')
  const [status, setStatus] = useState<HistoryRecord['status'] | 'all'>('all')
  const transactions = useHistory(address, 'transactions')
  const tokens = useHistory(address, 'token-transfers')
  const internal = useHistory(address, 'internal-transactions')
  const queries = [transactions, tokens, internal]
  const records = mergeHistory(address, {
    transactions: transactions.data?.pages.flatMap((p) => p.items),
    'token-transfers': tokens.data?.pages.flatMap((p) => p.items),
    'internal-transactions': internal.data?.pages.flatMap((p) => p.items),
  })
  const filtered = records.filter((r) => (feature === 'all' || feature === r.feature) && (status === 'all' || status === r.status))
  const busy = queries.some((q) => q.isFetching)
  const loading = queries.some((q) => q.isPending)
  const more = queries.some((q) => q.hasNextPage)
  const errors = queries.filter((q) => q.error).map((q) => q.error!.message)
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-bold">Transaction History</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Payments, payouts, approvals, and other Arc activity for your connected wallet.</p>
          <a className="mono mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)]" href={`https://explorer.arc.io/address/${address}`} target="_blank" rel="noreferrer">{shortAddress(address)} <ExternalLink className="size-3" /></a>
        </div>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => { void Promise.allSettled(queries.map((q) => q.refetch())) }}><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">Payment feature
            <select value={feature} onChange={(e) => setFeature(e.target.value as HistoryFeature | 'all')} className="rounded-xl border border-[var(--border)] bg-white p-2.5 text-sm text-[var(--ink)]">
              <option value="all">All features</option>
              {Object.entries(HISTORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">Transaction status
            <select value={status} onChange={(e) => setStatus(e.target.value as HistoryRecord['status'] | 'all')} className="rounded-xl border border-[var(--border)] bg-white p-2.5 text-sm text-[var(--ink)]">
              <option value="all">All statuses</option>
              {(['Successful', 'Failed', 'Pending', 'Unknown'] as const).map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <p className="pb-2 text-xs text-[var(--muted)]">{filtered.length} matching · {records.length} loaded</p>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">History comes from Arc Explorer. Newly confirmed payments may take a moment to appear. Load older activity to search earlier payments.</p>
      </Card>
      {errors.length > 0 && <div role="alert" className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--danger)]">
        <p className="font-medium">Some history could not be loaded. The list may be incomplete.</p>
        {errors.map((error, i) => <p key={i} className="mt-1 text-xs">{error}</p>)}
        <button type="button" className="mt-2 font-medium text-[var(--accent)]" onClick={() => { void Promise.allSettled(queries.filter((q) => q.error).map((q) => q.refetch())) }}>Retry</button>
      </div>}
      <Card>
        {loading && <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--muted)]"><Loader2 className="size-4 animate-spin" />Loading wallet activity…</p>}
        {filtered.map((record) => <TransactionRow key={record.hash} record={record} wallet={address} />)}
        {!loading && !errors.length && !filtered.length && <div className="py-12 text-center text-[var(--muted)]"><History className="mx-auto mb-3 size-8" /><p>{records.length ? 'No loaded transactions match these filters.' : 'No indexed Arc transactions found for this wallet.'}</p></div>}
        {more && <Button className="mx-auto mt-5" variant="secondary" disabled={busy} onClick={() => { void Promise.allSettled(queries.filter((q) => q.hasNextPage).map((q) => q.fetchNextPage())) }}>{busy ? 'Loading…' : 'Load older activity'}</Button>}
        {!loading && !more && !errors.length && records.length > 0 && <p className="pt-4 text-center text-xs text-[var(--muted)]">All indexed activity loaded.</p>}
      </Card>
    </div>
  )
}
