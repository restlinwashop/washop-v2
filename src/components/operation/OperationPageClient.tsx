'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase'
import { usePackCatalog } from '@/hooks/usePackCatalog'
import { useOrders } from '@/hooks/useOrders'
import { useOpTransfers } from '@/hooks/useOpTransfers'
import { prodSortKey, prodType } from '@/lib/orders/packUtils'
import { saveOpTransfers, deleteOpTransfer, type TransferInput } from '@/lib/operation/opTransferMutations'
import { addDays, todayStr, fmtDayShort, cn } from '@/lib/utils'
import { Keypad } from '@/components/ui/Keypad'

// ─── helpers ──────────────────────────────────────────────────────────────────

function defaultWorkDate(): string {
  const today = todayStr()
  const dow = new Date(today + 'T00:00:00').getDay()
  if (dow === 6) return addDays(today, 2) // Sat → Mon
  if (dow === 0) return addDays(today, 1) // Sun → Mon
  return today
}

function getPrepDates(workDate: string): string[] {
  const dow = new Date(workDate + 'T00:00:00').getDay()
  const next = addDays(workDate, 1)
  if (dow === 5) return [next, addDays(workDate, 3)] // Fri → Sat + Mon
  return [next, addDays(workDate, 2)]                // Mon–Thu → tomorrow + day after
}

function prepDatesLabel(prepDates: string[]): string {
  return prepDates.map((d) => fmtDayShort(d)).join(' + ')
}

// ─── types ────────────────────────────────────────────────────────────────────

type OpFilter = 'all' | 'linen' | 'towel'

interface ProductRow {
  pid: string
  name: string
  needed: number
  sent: number
  remaining: number
  pct: number
  isDone: boolean
  f2Stock: number
  type: 'linen' | 'towel'
}

// ─── stat box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, variant }: { label: string; value: number; variant: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const cls = {
    gray:  'bg-gray-100 text-gray-800',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-800',
    red:   'bg-red-50 text-red-600',
    blue:  'bg-blue-50 text-blue-700',
  }[variant]
  return (
    <div className={cn('rounded-lg py-2 text-center', cls)}>
      <div className="font-mono font-black text-lg sm:text-xl leading-none">{value.toLocaleString()}</div>
      <div className="text-[8px] font-bold uppercase tracking-wider mt-1 opacity-60">{label}</div>
    </div>
  )
}

// ─── product card (shared layout for pending + completed) ─────────────────────

function ProductCard({
  row,
  batchQty,
  onTap,
}: {
  row: ProductRow
  batchQty?: number
  onTap?: () => void
}) {
  const inProgress = !row.isDone && row.sent > 0
  const over = row.sent > row.needed

  const borderClass = row.isDone
    ? 'border-green-300'
    : inProgress
    ? 'border-amber-300'
    : 'border-gray-200'

  const progressColor = row.isDone
    ? 'bg-green-500'
    : inProgress
    ? 'bg-amber-400'
    : 'bg-gray-300'

  const statusLabel = row.isDone
    ? over ? `+${(row.sent - row.needed).toLocaleString()} over` : '✓ Done'
    : inProgress
    ? 'In Progress'
    : 'Not Started'

  const statusClass = row.isDone
    ? over ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    : inProgress
    ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-500'

  return (
    <div className={cn('rounded-2xl border-2 bg-white shadow-sm transition-colors', borderClass)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-wrap">
        <span className="font-bold text-gray-900 flex-1 leading-tight text-sm">{row.name}</span>
        <span className={cn(
          'text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0',
          row.type === 'towel' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        )}>
          {row.type}
        </span>
        <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0', statusClass)}>
          {statusLabel}
        </span>
      </div>

      {/* 4-stat grid */}
      <div className="grid grid-cols-4 gap-1 px-3 pb-2">
        <StatBox label="Total"    value={row.needed}    variant="gray" />
        <StatBox label="Sent"     value={row.sent}      variant={row.isDone ? 'green' : inProgress ? 'amber' : 'gray'} />
        <StatBox label="Left"     value={row.remaining} variant={row.remaining === 0 ? 'green' : 'red'} />
        <StatBox label="F2 Stock" value={row.f2Stock}   variant="blue" />
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', progressColor)} style={{ width: `${row.pct}%` }} />
        </div>
        <div className="text-right text-[10px] text-gray-400 mt-0.5">{row.pct}%</div>
      </div>

      {/* Tap-to-keypad button (pending only) */}
      {onTap && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onTap}
            className={cn(
              'w-full rounded-xl py-3 font-mono font-black transition-colors text-center',
              (batchQty ?? 0) > 0
                ? 'bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 text-3xl'
                : 'bg-gray-50 border-2 border-dashed border-gray-200'
            )}
          >
            {(batchQty ?? 0) > 0 ? (
              batchQty
            ) : (
              <span className="text-sm font-semibold text-gray-400">Tap to enter qty</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── extra product card ────────────────────────────────────────────────────────

function ExtraCard({
  pid,
  name,
  type,
  batchQty,
  onTap,
}: {
  pid: string
  name: string
  type: 'linen' | 'towel'
  batchQty: number
  onTap: () => void
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="w-1 flex-shrink-0 bg-gray-200" />
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-sm font-semibold text-gray-700 leading-tight">{name}</div>
          <span
            className={cn(
              'text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0',
              type === 'towel' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            )}
          >
            {type}
          </span>
        </div>
        <button
          type="button"
          onClick={onTap}
          className={cn(
            'w-full rounded-lg py-3 font-mono font-bold transition-colors text-center text-sm',
            batchQty > 0
              ? 'bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 text-2xl'
              : 'bg-gray-50 border border-dashed border-gray-200 text-gray-400'
          )}
        >
          {batchQty > 0 ? batchQty : 'Tap to enter'}
        </button>
      </div>
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────

export function OperationPageClient() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const catalog = usePackCatalog()
  const ordersQuery = useOrders()
  const transfersQuery = useOpTransfers()

  // ── page state ──
  const [workDate, setWorkDate] = useState(defaultWorkDate)
  const [opFilter, setOpFilter] = useState<OpFilter>('all')

  useEffect(() => {
    const saved = localStorage.getItem('opFilter') as OpFilter | null
    if (saved === 'linen' || saved === 'towel') setOpFilter(saved)
  }, [])
  const [batchQtys, setBatchQtys] = useState<Record<string, number>>({})
  const [keypad, setKeypad] = useState<{ id: string; name: string } | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── data ──
  const products = catalog.data?.products ?? []
  const categories = catalog.data?.categories ?? []
  const orders = ordersQuery.data ?? []
  const allTransfers = transfersQuery.data ?? []

  const loading =
    catalog.isLoading || ordersQuery.isLoading || transfersQuery.isLoading

  // ── computed ──
  const prepDates = useMemo(() => getPrepDates(workDate), [workDate])
  const tomorrow = prepDates[0]
  const dayAfter  = prepDates[1] ?? null  // only set on Friday (= Monday)

  // All orders for tomorrow (any status) — gross production target for day 1
  const tomorrowTotalMap = useMemo(() => {
    const map: Record<string, { name: string; qty: number; catId: string }> = {}
    for (const order of orders) {
      if (order.deliveryDate !== tomorrow) continue
      for (const item of order.items) {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, catId: item.catId }
        map[item.productId].qty += item.qty
      }
    }
    return map
  }, [orders, tomorrow])

  // Packed orders for tomorrow — F2 has already packed these (no longer needed from F1)
  const tomorrowPackedMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of orders) {
      if (order.deliveryDate !== tomorrow || order.status !== 'packed') continue
      for (const item of order.items) {
        map[item.productId] = (map[item.productId] ?? 0) + item.qty
      }
    }
    return map
  }, [orders, tomorrow])

  // Pending orders for dayAfter — both Mon-Thu (day after tomorrow) and Friday (Monday)
  const dayAfterPendingMap = useMemo(() => {
    const map: Record<string, { name: string; qty: number; catId: string }> = {}
    if (!dayAfter) return map
    for (const order of orders) {
      if (order.deliveryDate !== dayAfter || order.status !== 'pending') continue
      for (const item of order.items) {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, catId: item.catId }
        map[item.productId].qty += item.qty
      }
    }
    return map
  }, [orders, dayAfter])

  // Packed orders for all prep dates — F2 consumed this stock for packing
  const allPackedMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of orders) {
      const relevant = order.deliveryDate === tomorrow || (dayAfter && order.deliveryDate === dayAfter)
      if (!relevant || order.status !== 'packed') continue
      for (const item of order.items) {
        map[item.productId] = (map[item.productId] ?? 0) + item.qty
      }
    }
    return map
  }, [orders, tomorrow, dayAfter])

  // What F1 has sent to F2 today
  const sentMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of allTransfers) {
      if (t.date !== workDate) continue
      map[t.productId] = (map[t.productId] ?? 0) + t.qty
    }
    return map
  }, [allTransfers, workDate])

  // Products appearing in either day's orders
  const requiredPids = useMemo(
    () => new Set([...Object.keys(tomorrowTotalMap), ...Object.keys(dayAfterPendingMap)]),
    [tomorrowTotalMap, dayAfterPendingMap]
  )

  // Required products with new formula:
  //   grossTarget = (tomorrowTotal − tomorrowPacked) + dayAfterPending
  //   f2Stock     = sent − allPacked
  //   netNeeded   = max(0, grossTarget − f2Stock)
  //   isDone      = netNeeded ≤ 0
  const requiredProducts = useMemo((): ProductRow[] => {
    return [...requiredPids]
      .map((pid) => {
        const tomorrowTotal  = tomorrowTotalMap[pid]?.qty  ?? 0
        const tomorrowPacked = tomorrowPackedMap[pid]      ?? 0
        const dayAfterPend   = dayAfterPendingMap[pid]?.qty ?? 0
        const sent           = sentMap[pid]                ?? 0
        const allPacked      = allPackedMap[pid]           ?? 0

        const f2Stock     = sent - allPacked
        const grossTarget = (tomorrowTotal - tomorrowPacked) + dayAfterPend
        const netNeeded   = Math.max(0, grossTarget - f2Stock)
        const isDone      = netNeeded <= 0
        const pct         = grossTarget > 0
          ? Math.min(100, Math.max(0, Math.round((Math.max(0, f2Stock) / grossTarget) * 100)))
          : 100

        const name = tomorrowTotalMap[pid]?.name ?? dayAfterPendingMap[pid]?.name ?? pid
        const type = prodType(products, categories, pid)

        return { pid, name, needed: grossTarget, sent, remaining: netNeeded, pct, isDone, f2Stock, type }
      })
      .filter((row) => {
        if (row.needed <= 0 && row.sent === 0) return false // nothing to do and nothing sent — skip
        if (opFilter === 'linen') return row.type !== 'towel'
        if (opFilter === 'towel') return row.type === 'towel'
        return true
      })
      .sort((a, b) => prodSortKey(a.name) - prodSortKey(b.name))
  }, [requiredPids, tomorrowTotalMap, tomorrowPackedMap, dayAfterPendingMap, allPackedMap, sentMap, products, categories, opFilter])

  const pendingItems   = useMemo(() => requiredProducts.filter((p) => !p.isDone), [requiredProducts])
  const completedItems = useMemo(() => requiredProducts.filter((p) =>  p.isDone), [requiredProducts])

  // Extra products: all products NOT in requiredPids
  const extraProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (requiredPids.has(p.id)) return false
        const type = prodType(products, categories, p.id)
        if (opFilter === 'linen') return type !== 'towel'
        if (opFilter === 'towel') return type === 'towel'
        return true
      })
      .sort((a, b) => prodSortKey(a.name) - prodSortKey(b.name))
  }, [products, categories, requiredPids, opFilter])

  // Today's transfer log
  const todayTransfers = useMemo(
    () => allTransfers.filter((t) => t.date === workDate).sort((a, b) => b.time.localeCompare(a.time)),
    [allTransfers, workDate]
  )

  // F2 stock section: sent minus packed (consumed by F2)
  const f2StockRows = useMemo(() => {
    const pids = new Set<string>()
    allTransfers.filter((t) => t.date === workDate).forEach((t) => pids.add(t.productId))
    orders
      .filter((o) => prepDates.includes(o.deliveryDate))
      .forEach((o) => o.items.forEach((it) => pids.add(it.productId)))

    return [...pids]
      .map((pid) => {
        const p = products.find((x) => x.id === pid)
        if (p?.trackStock === false) return null
        const sent      = sentMap[pid]      ?? 0
        const packed    = allPackedMap[pid] ?? 0
        const available = sent - packed
        const required  = (tomorrowTotalMap[pid]?.qty ?? 0) + (dayAfterPendingMap[pid]?.qty ?? 0)
        return { name: p?.name ?? pid, sent, used: packed, available, required }
      })
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name)) as {
      name: string; sent: number; used: number; available: number; required: number
    }[]
  }, [allTransfers, orders, prepDates, products, sentMap, allPackedMap, tomorrowTotalMap, dayAfterPendingMap, workDate])

  // ── batch count ──
  const batchEntries = Object.entries(batchQtys).filter(([, qty]) => qty > 0)
  const batchCount = batchEntries.length

  // ── handlers ──
  function changeFilter(f: OpFilter) {
    setOpFilter(f)
    if (typeof window !== 'undefined') localStorage.setItem('opFilter', f)
  }

  // Save a single product immediately (from keypad extraAction)
  const sendSingle = useCallback(
    async (pid: string, productName: string, qty: number) => {
      if (qty <= 0) return
      setSaving(true)
      try {
        await saveOpTransfers(supabase, [{ date: workDate, productId: pid, productName, qty }])
        await queryClient.invalidateQueries({ queryKey: ['op-transfers'] })
        setBatchQtys((prev) => {
          const next = { ...prev }
          delete next[pid]
          return next
        })
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Save failed')
      } finally {
        setSaving(false)
      }
    },
    [supabase, queryClient, workDate]
  )

  // Save all products with qty in batchQtys
  async function handleSendBatch() {
    if (!batchCount) return
    setSaving(true)
    try {
      const inputs: TransferInput[] = batchEntries.map(([pid, qty]) => ({
        date: workDate,
        productId: pid,
        productName:
          tomorrowTotalMap[pid]?.name ??
          dayAfterPendingMap[pid]?.name ??
          products.find((p) => p.id === pid)?.name ??
          pid,
        qty,
      }))
      await saveOpTransfers(supabase, inputs)
      await queryClient.invalidateQueries({ queryKey: ['op-transfers'] })
      setBatchQtys({})
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTransfer(id: string) {
    if (!window.confirm('Delete this transfer entry?')) return
    try {
      await deleteOpTransfer(supabase, id)
      await queryClient.invalidateQueries({ queryKey: ['op-transfers'] })
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  // ── keypad product info ──
  const keypadProduct = keypad
    ? {
        id: keypad.id,
        name: keypad.name,
        currentBatch: batchQtys[keypad.id] ?? 0,
      }
    : null

  // ── render ──
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-xl font-black text-gray-800 mb-1">🏭 Operation</h1>

        {/* Date nav + filter on same row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date nav */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setWorkDate((d) => addDays(d, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-800 px-1 min-w-[96px] text-center">
              {fmtDayShort(workDate)}
            </span>
            <button
              type="button"
              onClick={() => setWorkDate((d) => addDays(d, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setWorkDate(defaultWorkDate())}
              className="ml-1 text-xs font-semibold text-blue-600 hover:underline px-1"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['op-transfers'] })}
              className="ml-1 text-gray-400 hover:text-gray-600 text-sm"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1">
            {(['all', 'linen', 'towel'] as OpFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => changeFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                  opFilter === f
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Prep dates label */}
        <p className="text-xs text-gray-500 mt-1.5 ml-0.5">
          Preparing for:{' '}
          <span className="font-semibold text-gray-700">{prepDatesLabel(prepDates)}</span>
        </p>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading…</div>
      ) : (
        <>
          {/* ━━━ PENDING ━━━ */}
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Pending
            </h2>
            {pendingItems.length > 0 && (
              <span className="text-[10px] font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                {pendingItems.length} to do
              </span>
            )}
            {pendingItems.length === 0 && completedItems.length > 0 && (
              <span className="text-[10px] font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                All done ✓
              </span>
            )}
          </div>

          {pendingItems.length === 0 && completedItems.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-4">
              No pending orders for {prepDatesLabel(prepDates)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {pendingItems.map((row) => (
              <ProductCard
                key={row.pid}
                row={row}
                batchQty={batchQtys[row.pid] ?? 0}
                onTap={() => setKeypad({ id: row.pid, name: row.name })}
              />
            ))}
          </div>

          {/* ── Send batch button ── */}
          {(pendingItems.length > 0 || batchCount > 0) && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleSendBatch}
                disabled={saving || batchCount === 0}
                className={cn(
                  'w-full py-4 rounded-2xl font-black text-base transition-colors',
                  batchCount > 0
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {saving
                  ? 'Saving…'
                  : batchCount > 0
                  ? `📤 Send ${batchCount} product${batchCount > 1 ? 's' : ''} to Factory 2`
                  : '📤 Enter quantities above to send'}
              </button>
            </div>
          )}

          {/* ━━━ COMPLETED ━━━ */}
          {completedItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setCompletedOpen((v) => !v)}
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Completed
                </span>
                <span className="text-[10px] font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {completedItems.length} done ✓
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {completedOpen ? '▲ Hide' : '▼ Show'}
                </span>
              </button>
              {completedOpen && (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {completedItems.map((row) => (
                    <ProductCard key={row.pid} row={row} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ EXTRA PRODUCTS ━━━ */}
          {extraProducts.length > 0 && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExtraOpen((v) => !v)}
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Extra Products
                </span>
                <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  {extraProducts.length} products
                </span>
                <span className="text-[10px] text-gray-400 ml-1">not in today's orders</span>
                <span className="ml-auto text-xs text-gray-400">
                  {extraOpen ? '▲ Hide' : '▼ Show'}
                </span>
              </button>
              {extraOpen && (
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {extraProducts.map((p) => (
                    <ExtraCard
                      key={p.id}
                      pid={p.id}
                      name={p.name}
                      type={prodType(products, categories, p.id)}
                      batchQty={batchQtys[p.id] ?? 0}
                      onTap={() => setKeypad({ id: p.id, name: p.name })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ TRANSFER LOG ━━━ */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setLogOpen((v) => !v)}
            >
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Transfer Log
              </span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {todayTransfers.length} today
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {logOpen ? '▲ Hide' : '▼ Show'}
              </span>
            </button>
            {logOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 uppercase text-[9px]">
                      <th className="text-left px-3 py-1.5 font-semibold">Time</th>
                      <th className="text-left px-2 py-1.5 font-semibold">Product</th>
                      <th className="text-right px-2 py-1.5 font-semibold">Qty</th>
                      <th className="w-10 px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {!todayTransfers.length ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                          No transfers for {fmtDayShort(workDate)}
                        </td>
                      </tr>
                    ) : (
                      todayTransfers.map((t) => (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{t.time}</td>
                          <td className="px-2 py-2 font-semibold text-gray-800">{t.productName}</td>
                          <td className="px-2 py-2 text-right">
                            <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {t.qty}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransfer(t.id)}
                              className="text-red-400 hover:text-red-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ━━━ F2 STOCK ━━━ */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => setStockOpen((v) => !v)}
            >
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                F2 Stock
              </span>
              <span className="text-[10px] text-gray-400 ml-1">sent − delivered</span>
              <span className="ml-auto text-xs text-gray-400">
                {stockOpen ? '▲ Hide' : '▼ Show'}
              </span>
            </button>
            {stockOpen && (
              <div>
                {!f2StockRows.length ? (
                  <p className="px-3 py-4 text-xs text-gray-400 text-center">
                    No data for {fmtDayShort(workDate)}
                  </p>
                ) : (
                  f2StockRows.map((r) => (
                    <div
                      key={r.name}
                      className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 text-xs"
                    >
                      <span className="flex-1 font-semibold text-gray-800 truncate">{r.name}</span>
                      <span className="text-gray-500" title="Sent">📤 {r.sent}</span>
                      <span className="text-gray-400" title="Used in delivered orders">📋 {r.used}</span>
                      <span
                        className={cn(
                          'font-mono font-bold px-2 py-0.5 rounded text-[10px]',
                          r.available >= r.required
                            ? 'bg-green-100 text-green-800'
                            : r.available > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                        )}
                        title="Available / Required"
                      >
                        {r.available} / {r.required}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Keypad ── */}
      {keypadProduct && (
        <Keypad
          title={keypadProduct.name}
          subtitle="How many sending to Factory 2?"
          initialValue={keypadProduct.currentBatch}
          onConfirm={(v) => {
            setBatchQtys((prev) => ({ ...prev, [keypadProduct.id]: v }))
          }}
          onClose={() => setKeypad(null)}
          extraAction={{
            label: '📤 Send to Factory 2',
            onClick: (v) => {
              sendSingle(keypadProduct.id, keypadProduct.name, v)
            },
          }}
        />
      )}
    </div>
  )
}
