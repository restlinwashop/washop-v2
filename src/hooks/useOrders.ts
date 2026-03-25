'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import { useAppStore } from '@/store'
import type { Order, OrderRow, OrderItemRow } from '@/types'

function cutoff90(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

function rowToOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    driverId: row.driver_id,
    routeOrder: row.route_order ?? 99,
    deliveryDate: row.delivery_date,
    status: row.status as Order['status'],
    note: row.note ?? '',
    items: items
      .filter((i) => i.order_id === row.id)
      .map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        catId: i.cat_id ?? '',
        qty: i.qty,
      })),
    bagCount: row.bag_count ?? 1,
    isManual: row.is_manual ?? false,
    checkedItems: row.checked_items ?? {},
    bagsCollected: row.bags_collected ?? 0,
  }
}

export function useOrders() {
  const supabase = useSupabase()
  const setOrders = useAppStore((s) => s.setOrders)

  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const cutoff = cutoff90()

      const { data: orderRows, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .gte('delivery_date', cutoff)
        .order('delivery_date', { ascending: false })
        .order('route_order', { ascending: true, nullsFirst: false })

      if (ordersErr) throw ordersErr

      const orderIds = orderRows.map((o: OrderRow) => o.id)
      let itemRows: OrderItemRow[] = []

      // Fetch in batches of 200
      for (let i = 0; i < orderIds.length; i += 200) {
        const batch = orderIds.slice(i, i + 200)
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', batch)
        if (error) throw error
        itemRows = itemRows.concat(data ?? [])
      }

      const orders = orderRows.map((row: OrderRow) => rowToOrder(row, itemRows))
      setOrders(orders)
      return orders
    },
    staleTime: 30_000,
  })
}

export function useUpdateOrderStatus() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const updateOrder = useAppStore((s) => s.updateOrder)

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: (_, { orderId, status }) => {
      updateOrder(orderId, { status })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
