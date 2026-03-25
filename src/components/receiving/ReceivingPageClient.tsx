'use client'

import { useLayoutEffect, useMemo, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase'
import { usePackCatalog } from '@/hooks/usePackCatalog'
import { useOrders } from '@/hooks/useOrders'
import { useReceivingLogs } from '@/hooks/useReceivingLogs'
import { nextDeliveryDate } from '@/lib/delivery/nextDeliveryDate'
import { ensureLaundryBagProducts } from '@/lib/receiving/laundryBags'
import { saveReceivingToDb } from '@/lib/receiving/receiveGoods'
import { updateReceivingLogEntry, deleteReceivingLogEntry } from '@/lib/receiving/editReceivingLog'
import { exportReceivedCsv } from '@/lib/receiving/exportReceivedCsv'
import { todayStr } from '@/lib/utils'
import { ReceiveGoodsHero } from './ReceiveGoodsHero'
import { ReceivedItemsMini } from './ReceivedItemsMini'
import { ReceivingLogMini } from './ReceivingLogMini'
import { CustomerPickModal } from './CustomerPickModal'
import { EditReceivingLogModal } from './EditReceivingLogModal'
import { ReceivingNoteModal } from './ReceivingNoteModal'

export function ReceivingPageClient() {
  const pathname = usePathname()
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const catalog = usePackCatalog()
  const { refetch: refetchCatalog } = catalog
  const ordersQuery = useOrders()
  const logsQuery = useReceivingLogs()

  const [searchQuery, setSearchQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerProductIds, setCustomerProductIds] = useState<Set<string> | null>(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [recvQtys, setRecvQtys] = useState<Record<string, number>>({})
  const [prodFilterDate, setProdFilterDate] = useState(() => todayStr())
  const [logFilterDate, setLogFilterDate] = useState('')
  const [logFilterCust, setLogFilterCust] = useState('')
  const [editLogId, setEditLogId] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useLayoutEffect(() => {
    if (pathname === '/receiving') window.scrollTo(0, 0)
  }, [pathname])

  const customers = catalog.data?.customers ?? []
  const drivers = catalog.data?.drivers ?? []
  const products = catalog.data?.products ?? []
  const categories = catalog.data?.categories ?? []
  const custProductMap = catalog.data?.custProductMap ?? new Map<string, Set<string>>()
  const orders = ordersQuery.data ?? []
  const logs = logsQuery.data ?? []

  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) ?? null : null),
    [customers, selectedCustomerId]
  )

  const recvProducts = useMemo(() => {
    if (!selectedCustomerId || !customerProductIds) return []
    return products.filter((p) => customerProductIds.has(p.id))
  }, [selectedCustomerId, customerProductIds, products])

  const driverName = useMemo(() => {
    if (!selectedCustomer) return '—'
    const d = drivers.find((x) => x.id === selectedCustomer.driverId)
    return d?.name ?? 'Unassigned'
  }, [selectedCustomer, drivers])

  const bagsCollected = useMemo(() => {
    if (!selectedCustomerId) return null
    const recent = orders
      .filter(
        (o) =>
          o.customerId === selectedCustomerId &&
          (o.status === 'packed' || o.status === 'delivered') &&
          (o.bagsCollected || 0) > 0
      )
      .sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''))[0]
    return recent?.bagsCollected ?? null
  }, [orders, selectedCustomerId])

  const summaryTotals = useMemo(() => {
    const tot: Record<string, number> = {}
    for (const log of logs) {
      if (log.receivedOn !== prodFilterDate) continue
      for (const it of log.items ?? []) {
        tot[it.productName] = (tot[it.productName] || 0) + it.qty
      }
    }
    return tot
  }, [logs, prodFilterDate])

  const customerOptions = useMemo(() => customers.map((c) => ({ id: c.id, name: c.name })), [customers])

  const editEntry = useMemo(
    () => (editLogId ? logs.find((e) => e.id === editLogId) ?? null : null),
    [editLogId, logs]
  )

  const selectCustomer = useCallback(
    async (id: string) => {
      const c = customers.find((x) => x.id === id)
      if (!c) return
      setSelectedCustomerId(id)
      setCustomerProductIds(null)
      setRecvQtys({})

      // Find the most recent delivery date from this customer's receiving history
      // so nextDeliveryDate can anchor the fortnightly/weekly cycle correctly.
      const lastLog = logs
        .filter((l) => l.customerId === id)
        .sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))[0]
      const lastDelivDate = lastLog?.deliveryDate ?? undefined
      setDeliveryDate(nextDeliveryDate(c, undefined, lastDelivDate))

      // Always fetch fresh per-customer product list from DB (same as V1)
      const { data: cpRows } = await supabase.from('cust_products').select('product_id').eq('cust_id', id)
      const set = new Set((cpRows ?? []).map((r: { product_id: string }) => r.product_id))
      // ensureLaundryBagProducts returns the final set (may include newly added bag products)
      const finalSet = await ensureLaundryBagProducts(supabase, c, products, set)
      setCustomerProductIds(finalSet)
      await refetchCatalog()
    },
    [customers, supabase, products, refetchCatalog, logs]
  )

  const clearSelection = useCallback(() => {
    setSelectedCustomerId(null)
    setCustomerProductIds(null)
    setRecvQtys({})
    setSearchQuery('')
    setDeliveryDate('')
  }, [])

  async function handleSave() {
    const c = selectedCustomer
    if (!c) {
      window.alert('Select a customer.')
      return
    }
    const items = products
      .filter((p) => (recvQtys[p.id] || 0) > 0)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        catId: p.catId,
        qty: recvQtys[p.id]!,
      }))
    if (!items.length) {
      window.alert('Enter at least one quantity.')
      return
    }
    setSaving(true)
    try {
      await saveReceivingToDb(supabase, { customer: c, deliveryDate, items })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['receiving-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['pack-catalog'] }),
      ])
      clearSelection()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveRecvNote(note: string) {
    if (!selectedCustomerId) return
    const { error } = await supabase.from('customers').update({ recv_note: note || null }).eq('id', selectedCustomerId)
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ['pack-catalog'] })
  }

  async function handleClearRecvNote() {
    if (!selectedCustomerId) return
    await supabase.from('customers').update({ recv_note: null }).eq('id', selectedCustomerId)
    await queryClient.invalidateQueries({ queryKey: ['pack-catalog'] })
  }

  const loading = catalog.isLoading || ordersQuery.isLoading || logsQuery.isLoading

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-4 pb-24">
      <h1 className="text-xl font-black text-gray-800">Receiving</h1>

      {loading ? (
        <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
      ) : (
        <>
          <ReceiveGoodsHero
            searchValue={searchQuery}
            onSearchClick={() => setPickerOpen(true)}
            onSearchChange={(v) => {
              setSearchQuery(v)
              setPickerOpen(true)
            }}
            selectedCustomer={selectedCustomer}
            deliveryDate={deliveryDate}
            driverName={driverName}
            bagsCollected={bagsCollected}
            recvNote={selectedCustomer?.recvNote ?? null}
            products={recvProducts}
            qtys={recvQtys}
            onQtyChange={(pid, qty) => setRecvQtys((q) => ({ ...q, [pid]: qty }))}
            onResetQtys={() => setRecvQtys({})}
            onSave={handleSave}
            onClearSelection={clearSelection}
            onOpenNoteModal={() => setNoteOpen(true)}
            onClearRecvNote={handleClearRecvNote}
            saving={saving}
          />

          <ReceivedItemsMini
            filterDate={prodFilterDate}
            onFilterDateChange={setProdFilterDate}
            onToday={() => setProdFilterDate(todayStr())}
            onExportCsv={() => exportReceivedCsv(logs, prodFilterDate, categories)}
            totals={summaryTotals}
            products={products}
            categories={categories}
          />

          <ReceivingLogMini
            entries={logs}
            filterDate={logFilterDate}
            onFilterDateChange={setLogFilterDate}
            filterCustomerId={logFilterCust}
            onFilterCustomerChange={setLogFilterCust}
            customerOptions={customerOptions}
            onClearFilters={() => {
              setLogFilterDate('')
              setLogFilterCust('')
            }}
            onEdit={(id) => setEditLogId(id)}
          />
        </>
      )}

      <CustomerPickModal
        open={pickerOpen}
        initialQuery={searchQuery}
        customers={customers}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => void selectCustomer(id)}
      />

      <ReceivingNoteModal
        open={noteOpen}
        initialNote={selectedCustomer?.recvNote ?? ''}
        onClose={() => setNoteOpen(false)}
        onSave={async (note) => {
          await handleSaveRecvNote(note)
        }}
      />

      <EditReceivingLogModal
        open={Boolean(editLogId && editEntry)}
        entry={editEntry}
        onClose={() => setEditLogId(null)}
        onSave={async (input) => {
          await updateReceivingLogEntry(supabase, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['receiving-logs'] }),
            queryClient.invalidateQueries({ queryKey: ['orders'] }),
          ])
        }}
        onDelete={async (logId) => {
          await deleteReceivingLogEntry(supabase, logId)
          await queryClient.invalidateQueries({ queryKey: ['receiving-logs'] })
        }}
      />
    </div>
  )
}
