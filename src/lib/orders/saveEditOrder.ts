import type { SupabaseClient } from '@supabase/supabase-js'
import type { Order, OrderItem } from '@/types'
import { legacyUid } from '@/lib/utils'

/**
 * Persist edit-order modal: date, note, reconcile order_items (V1 saveEO override).
 */
export async function persistEditOrder(
  supabase: SupabaseClient,
  orderId: string,
  order: Order,
  newDeliveryDate: string,
  newNote: string
): Promise<void> {
  const { error: oErr } = await supabase
    .from('orders')
    .update({
      delivery_date: newDeliveryDate,
      note: newNote,
    })
    .eq('id', orderId)
  if (oErr) throw oErr

  const { data: dbItemsRaw, error: dbErr } = await supabase
    .from('order_items')
    .select('id,product_id,qty')
    .eq('order_id', orderId)
  if (dbErr) throw dbErr

  const seen = new Set<string>()
  const dbItems = (dbItemsRaw ?? []).filter((i: { product_id: string }) => {
    if (seen.has(i.product_id)) return false
    seen.add(i.product_id)
    return true
  })

  const localPids = new Set(order.items.filter((it) => it.qty > 0).map((it) => it.productId))

  for (const dbi of dbItems) {
    if (!localPids.has(dbi.product_id)) {
      const { error } = await supabase.from('order_items').delete().eq('id', dbi.id)
      if (error) throw error
    }
  }

  for (const it of order.items.filter((x) => x.qty > 0)) {
    const existing = dbItems.find((d: { product_id: string }) => d.product_id === it.productId)
    if (existing) {
      const { error } = await supabase
        .from('order_items')
        .update({ qty: it.qty })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('order_items').insert({
        id: legacyUid(),
        order_id: orderId,
        product_id: it.productId,
        product_name: it.productName,
        cat_id: it.catId || '',
        qty: it.qty,
      })
      if (error) throw error
    }
  }
}

export async function deleteOrderCascade(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  const { error: iErr } = await supabase.from('order_items').delete().eq('order_id', orderId)
  if (iErr) throw iErr
  const { error: oErr } = await supabase.from('orders').delete().eq('id', orderId)
  if (oErr) throw oErr
}

export async function addOrderItemRow(
  supabase: SupabaseClient,
  orderId: string,
  item: Omit<OrderItem, 'id'> & { id?: string }
): Promise<void> {
  const { error } = await supabase.from('order_items').insert({
    id: item.id ?? legacyUid(),
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName,
    cat_id: item.catId || '',
    qty: item.qty,
  })
  if (error) throw error
}

export async function removeOrderItemRow(
  supabase: SupabaseClient,
  orderId: string,
  productId: string
): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)
    .eq('product_id', productId)
  if (error) throw error
}
