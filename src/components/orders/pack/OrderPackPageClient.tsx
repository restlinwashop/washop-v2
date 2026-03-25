'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase'
import { useOrders } from '@/hooks/useOrders'
import { usePackCatalog } from '@/hooks/usePackCatalog'
import {
  useMarkPacked,
  useUndoPack,
  usePatchCheckedItems,
  usePatchBagCount,
  useSaveManualOrder,
  useSaveEditOrder,
  useDeleteOrder,
  useConvertToPUO,
} from '@/hooks/useOrderPackMutations'
import { autoCreateFixedOrders } from '@/lib/orders/fixedOrders'
import {
  buildPackDriverGroups,
  getOrderDriver,
  isCustomerDueOnDate,
  type PackGroupType,
} from '@/lib/orders/packUtils'
import { printLabels, printOrderSheet } from '@/lib/orders/printPack'
import { setLbVariantQty } from '@/lib/orders/setLbVariantQty'
import { removeOrderItemRow, addOrderItemRow } from '@/lib/orders/saveEditOrder'
import { addDays, getMonday, legacyUid, todayStr } from '@/lib/utils'
import type { Order, Product } from '@/types'
import { PackSummaryBar } from './PackSummaryBar'
import { WeekStrip } from './WeekStrip'
import { DriverFilterBar } from './DriverFilterBar'
import { DueCustomersBanner } from './DueCustomersBanner'
import { DriverOrderGroup } from './DriverOrderGroup'
import { ManualOrderModal } from './ManualOrderModal'
import { EditOrderModal } from './EditOrderModal'
import { LbPickerSheet, type LbVariant } from './LbPickerSheet'

export function OrderPackPageClient() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const catalog = usePackCatalog()
  const ordersQuery = useOrders()

  const markPacked = useMarkPacked()
  const undoPack = useUndoPack()
  const patchChecked = usePatchCheckedItems()
  const patchBag = usePatchBagCount()
  const saveManual = useSaveManualOrder()
  const saveEdit = useSaveEditOrder()
  const deleteOrderM = useDeleteOrder()
  const convertPUO = useConvertToPUO()

  const [curWeekMon, setCurWeekMon] = useState(() => getMonday(todayStr()))
  const [selDay, setSelDay] = useState(() => todayStr())
  const [selDriverFilter, setSelDriverFilter] = useState<string | 'all'>('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const chipTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const [lbState, setLbState] = useState<{
    orderId: string
    customerName: string
    variants: LbVariant[]
    sheetOpen: boolean
    keypad: LbVariant | null
  } | null>(null)

  const orders = ordersQuery.data ?? []
  const customers = catalog.data?.customers ?? []
  const drivers = catalog.data?.drivers ?? []
  const products = catalog.data?.products ?? []
  const categories = catalog.data?.categories ?? []
  const custProductMap = catalog.data?.custProductMap ?? new Map<string, Set<string>>()

  const fixedRan = useRef(false)
  useEffect(() => {
    if (!catalog.data || !ordersQuery.data || fixedRan.current) return
    fixedRan.current = true
    void (async () => {
      await autoCreateFixedOrders(supabase, {
        customers: catalog.data!.customers,
        products: catalog.data!.products,
        existingOrders: ordersQuery.data!,
      })
      await ordersQuery.refetch()
    })()
  }, [catalog.data, ordersQuery.data, supabase, ordersQuery])

  const dayOrders = useMemo(() => orders.filter((o) => o.deliveryDate === selDay), [orders, selDay])

  const dueNone = useMemo(() => {
    return customers.filter((c) => {
      const due = isCustomerDueOnDate(c, selDay)
      const hasO = orders.some((o) => o.customerId === c.id && o.deliveryDate === selDay)
      return due && !hasO && c.active
    })
  }, [customers, orders, selDay])

  const groups = useMemo(() => {
    if (!catalog.data) return []
    return buildPackDriverGroups(
      dayOrders,
      customers,
      drivers,
      products,
      categories,
      selDriverFilter === 'all',
      selDriverFilter === 'all' ? '' : selDriverFilter
    )
  }, [catalog.data, dayOrders, customers, drivers, products, categories, selDriverFilter])

  const dayHasOrders = useCallback(
    (d: string) => orders.some((o) => o.deliveryDate === d && o.status !== 'delivered'),
    [orders]
  )

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders])

  const updateOrdersCache = useCallback(
    (updater: (rows: Order[]) => Order[]) => {
      queryClient.setQueryData<Order[]>(['orders'], (old) => {
        if (!old) return old
        return updater(old)
      })
    },
    [queryClient]
  )

  const onToggleChip = useCallback(
    (orderId: string, productId: string, groupType: PackGroupType) => {
      updateOrdersCache((rows) =>
        rows.map((o) => {
          if (o.id !== orderId) return o
          const key = productId + groupType
          const checkedItems = { ...(o.checkedItems || {}), [key]: !o.checkedItems?.[key] }
          return { ...o, checkedItems }
        })
      )
      clearTimeout(chipTimers.current[orderId])
      chipTimers.current[orderId] = setTimeout(() => {
        const o = (queryClient.getQueryData<Order[]>(['orders']) ?? []).find((x) => x.id === orderId)
        if (!o?.checkedItems) return
        void patchChecked.mutateAsync({ orderId, checkedItems: o.checkedItems })
      }, 800)
    },
    [patchChecked, queryClient, updateOrdersCache]
  )

  const onBagCountChange = useCallback(
    (orderId: string, n: number) => {
      updateOrdersCache((rows) => rows.map((o) => (o.id === orderId ? { ...o, bagCount: n } : o)))
    },
    [updateOrdersCache]
  )

  const onPrintLabels = useCallback(
    async (orderId: string) => {
      const o = orders.find((x) => x.id === orderId)
      if (!o) return
      await patchBag.mutateAsync({ orderId, bagCount: o.bagCount })
      const drv = drivers.find((d) => d.id === o.driverId)
      printLabels(o, drv?.name ?? '—')
    },
    [orders, drivers, patchBag]
  )

  const openLbPicker = useCallback(
    (orderId: string) => {
      const o = orders.find((x) => x.id === orderId)
      if (!o) return
      const assigned = custProductMap.get(o.customerId) ?? new Set()
      const lbInOrder = o.items.filter((it) => /laundry bag/i.test(it.productName))
      const lbPids = new Set(lbInOrder.map((it) => it.productId))
      const extra = products.filter(
        (p) => /laundry bag/i.test(p.name) && assigned.has(p.id) && !lbPids.has(p.id)
      )
      let variants: LbVariant[] = [
        ...lbInOrder.map((it) => ({ productId: it.productId, productName: it.productName, qty: it.qty })),
        ...extra.map((p) => ({ productId: p.id, productName: p.name, qty: 0 })),
      ]
      if (!variants.length) {
        const anyLB = products.find((p) => /laundry bag/i.test(p.name))
        if (!anyLB) {
          window.alert('No Laundry Bag product found')
          return
        }
        variants = [{ productId: anyLB.id, productName: anyLB.name, qty: 0 }]
      }
      if (variants.length === 1) {
        setLbState({
          orderId,
          customerName: o.customerName,
          variants,
          sheetOpen: false,
          keypad: variants[0],
        })
      } else {
        setLbState({ orderId, customerName: o.customerName, variants, sheetOpen: true, keypad: null })
      }
    },
    [orders, custProductMap, products]
  )

  const confirmLbQty = useCallback(
    async (productId: string, qty: number) => {
      if (!lbState) return
      const o = orders.find((x) => x.id === lbState.orderId)
      if (!o) return
      try {
        await setLbVariantQty(supabase, {
          orderId: lbState.orderId,
          productId,
          qty,
          currentItems: o.items,
          products,
        })
        await ordersQuery.refetch()
      } catch (e) {
        console.warn(e)
      }
      setLbState(null)
    },
    [lbState, orders, supabase, products, updateOrdersCache, ordersQuery]
  )

  const editOrder = editId ? orders.find((o) => o.id === editId) : null

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-black text-gray-800">Order / Pack</h1>
        {pendingCount > 0 && (
          <span className="text-[11px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full font-mono">
            {pendingCount}
          </span>
        )}
      </div>

      <PackSummaryBar
        selDay={selDay}
        dayOrders={dayOrders}
        products={products}
        categories={categories}
        onRefresh={() => void ordersQuery.refetch()}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
          onClick={() => setCurWeekMon((w) => addDays(w, -7))}
        >
          ← Prev Week
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
          onClick={() => setCurWeekMon((w) => addDays(w, 7))}
        >
          Next Week →
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
            onClick={() => setManualOpen(true)}
          >
            ＋ Manual Order
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() =>
              printOrderSheet({
                selDay,
                dayOrders,
                customers,
                drivers,
                products,
                categories,
              })
            }
          >
            🖨 Print Order Sheet
          </button>
        </div>
      </div>

      <WeekStrip
        curWeekMon={curWeekMon}
        selDay={selDay}
        dayHasOrders={dayHasOrders}
        onSelectDay={(d) => {
          setSelDay(d)
          setSelDriverFilter('all')
        }}
      />

      <DriverFilterBar
        selDay={selDay}
        orders={orders}
        drivers={drivers}
        selDriverFilter={selDriverFilter}
        onChange={setSelDriverFilter}
      />

      <DueCustomersBanner customers={dueNone} />

      {catalog.isLoading || ordersQuery.isLoading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      ) : ordersQuery.isError ? (
        <div className="text-sm text-red-600 py-4">Failed to load orders.</div>
      ) : dayOrders.length === 0 ? (
        <div className="text-gray-500 text-sm py-6">No orders for this day.</div>
      ) : !groups.length ? (
        <div className="text-gray-500 text-sm py-6">No orders match the current driver filter.</div>
      ) : (
        groups.map((g) => (
          <DriverOrderGroup
            key={`${g.driverId}-${g.type}`}
            group={g}
            customers={customers}
            products={products}
            categories={categories}
            custProductMap={custProductMap}
            onToggleChip={onToggleChip}
            onMarkPacked={(id) => void markPacked.mutateAsync(id)}
            onUndoPack={(id) => void undoPack.mutateAsync(id)}
            onEditOrder={(id) => setEditId(id)}
            onLbClick={openLbPicker}
            onBagCountChange={onBagCountChange}
            onPrintLabels={onPrintLabels}
          />
        ))
      )}

      <ManualOrderModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        customers={customers}
        products={products}
        defaultDate={selDay}
        onSave={async ({ customerId, moQtys, date, note, isPUO }) => {
          const c = customers.find((x) => x.id === customerId)
          if (!c) return
          const od = getOrderDriver(c, date)
          const oid = legacyUid()
          const items = products
            .filter((p) => (moQtys[p.id] || 0) > 0)
            .map((p) => ({ productId: p.id, productName: p.name, catId: p.catId, qty: moQtys[p.id]! }))
          await saveManual.mutateAsync({
            id: oid,
            customerId: c.id,
            customerName: c.name,
            driverId: od.driverId,
            routeOrder: od.routeOrder || 99,
            deliveryDate: date,
            note,
            isManual: true,
            isPUO,
            items,
          })
        }}
      />

      <EditOrderModal
        open={!!editId && !!editOrder}
        order={editOrder ?? null}
        products={products}
        categories={categories}
        custProductIds={editOrder ? custProductMap.get(editOrder.customerId) ?? new Set() : new Set()}
        onClose={() => setEditId(null)}
        onSave={async ({ order, deliveryDate, note }) => {
          const r = await saveEdit.mutateAsync({ order, deliveryDate, note })
          if (r.deleted) setEditId(null)
        }}
        onDelete={async (orderId) => {
          await deleteOrderM.mutateAsync(orderId)
        }}
        onConvertPUO={async (orderId) => {
          await convertPUO.mutateAsync(orderId)
        }}
        onAddItem={async (orderId: string, product: Product, qty: number) => {
          await addOrderItemRow(supabase, orderId, {
            productId: product.id,
            productName: product.name,
            catId: product.catId,
            qty,
          })
          await ordersQuery.refetch()
        }}
        onRemoveItem={async (orderId: string, productId: string) => {
          await removeOrderItemRow(supabase, orderId, productId)
          await ordersQuery.refetch()
        }}
      />

      {lbState && (lbState.sheetOpen || lbState.keypad) && (
        <LbPickerSheet
          customerName={lbState.customerName}
          variants={lbState.variants}
          sheetOpen={lbState.sheetOpen}
          keypadTarget={lbState.keypad}
          onSelectVariant={(v) =>
            setLbState((s) => (s ? { ...s, sheetOpen: false, keypad: v } : s))
          }
          onCloseKeypad={() => setLbState(null)}
          onConfirmQty={confirmLbQty}
          onCloseSheet={() => setLbState(null)}
        />
      )}
    </div>
  )
}
