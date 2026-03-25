'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { Order } from '@/types'
import { legacyUid } from '@/lib/utils'
import {
  deleteOrderCascade,
  persistEditOrder,
} from '@/lib/orders/saveEditOrder'
import { useAppStore } from '@/store'

export function useInvalidatePackQueries() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
    void queryClient.invalidateQueries({ queryKey: ['pack-catalog'] })
  }
}

export function useMarkPacked() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()
  const updateOrder = useAppStore((s) => s.updateOrder)

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from('orders').update({ status: 'packed' }).eq('id', orderId)
      if (error) throw error
    },
    onSuccess: (_, orderId) => {
      updateOrder(orderId, { status: 'packed' })
      invalidate()
    },
  })
}

export function useUndoPack() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()
  const updateOrder = useAppStore((s) => s.updateOrder)

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from('orders').update({ status: 'pending' }).eq('id', orderId)
      if (error) throw error
    },
    onSuccess: (_, orderId) => {
      updateOrder(orderId, { status: 'pending' })
      invalidate()
    },
  })
}

/** Persists pack line checks; caller should optimistically update React Query cache (no refetch on success). */
export function usePatchCheckedItems() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async ({ orderId, checkedItems }: { orderId: string; checkedItems: Record<string, boolean> }) => {
      const { error } = await supabase.from('orders').update({ checked_items: checkedItems }).eq('id', orderId)
      if (error) throw error
    },
  })
}

export function usePatchBagCount() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()

  return useMutation({
    mutationFn: async ({ orderId, bagCount }: { orderId: string; bagCount: number }) => {
      const { error } = await supabase.from('orders').update({ bag_count: bagCount }).eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => invalidate(),
  })
}

/** Manual order with driver/route from getOrderDriver (V1 saveMO). */
export function useSaveManualOrder() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()

  return useMutation({
    mutationFn: async (input: {
      id: string
      customerId: string
      customerName: string
      driverId: string | null
      routeOrder: number
      deliveryDate: string
      note: string
      isManual: boolean
      isPUO: boolean
      items: { productId: string; productName: string; catId: string; qty: number }[]
    }) => {
      const oid = input.id
      if (input.isPUO) {
        const { error } = await supabase.from('orders').insert({
          id: oid,
          customer_id: input.customerId,
          customer_name: input.customerName,
          driver_id: input.driverId,
          route_order: input.routeOrder,
          delivery_date: input.deliveryDate,
          bag_count: 1,
          status: 'pending',
          note: 'PU Only',
          is_manual: true,
          checked_items: {},
        })
        if (error) throw error
        return
      }

      if (!input.items.length) throw new Error('Add at least one item.')

      const { error: oErr } = await supabase.from('orders').insert({
        id: oid,
        customer_id: input.customerId,
        customer_name: input.customerName,
        driver_id: input.driverId,
        route_order: input.routeOrder,
        delivery_date: input.deliveryDate,
        bag_count: 1,
        status: 'pending',
        note: input.note,
        is_manual: input.isManual,
        checked_items: {},
      })
      if (oErr) throw oErr

      const { error: iErr } = await supabase.from('order_items').insert(
        input.items.map((it) => ({
          id: legacyUid(),
          order_id: oid,
          product_id: it.productId,
          product_name: it.productName,
          cat_id: it.catId,
          qty: it.qty,
        }))
      )
      if (iErr) throw iErr
    },
    onSuccess: () => invalidate(),
  })
}

export function useSaveEditOrder() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()

  return useMutation({
    mutationFn: async (input: { order: Order; deliveryDate: string; note: string }) => {
      const totalQty = input.order.items.reduce((s, it) => s + (it.qty || 0), 0)
      if (totalQty === 0) {
        await deleteOrderCascade(supabase, input.order.id)
        return { deleted: true as const }
      }
      await persistEditOrder(supabase, input.order.id, input.order, input.deliveryDate, input.note)
      return { deleted: false as const }
    },
    onSuccess: () => invalidate(),
  })
}

export function useDeleteOrder() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()

  return useMutation({
    mutationFn: async (orderId: string) => {
      await deleteOrderCascade(supabase, orderId)
    },
    onSuccess: () => invalidate(),
  })
}

export function useConvertToPUO() {
  const supabase = useSupabase()
  const invalidate = useInvalidatePackQueries()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error: dErr } = await supabase.from('order_items').delete().eq('order_id', orderId)
      if (dErr) throw dErr
      const { error: pErr } = await supabase.from('orders').update({ note: 'PU Only' }).eq('id', orderId)
      if (pErr) throw pErr
    },
    onSuccess: () => invalidate(),
  })
}
