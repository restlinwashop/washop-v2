import type { SupabaseClient } from '@supabase/supabase-js'
import type { Customer } from '@/types'
import { getOrderDriver } from '@/lib/orders/packUtils'
import { legacyUid, todayStr } from '@/lib/utils'

function timeStrAu(): string {
  return new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export interface ReceiveLine {
  productId: string
  productName: string
  catId: string
  qty: number
}

/**
 * Persist receiving: orders merge/create, receiving_log, receiving_log_items, history;
 * clear next_delivery_override on customer (V1 saveReceiving DB override).
 */
export async function saveReceivingToDb(
  supabase: SupabaseClient,
  input: {
    customer: Customer
    deliveryDate: string
    items: ReceiveLine[]
  }
): Promise<void> {
  const { customer: c, deliveryDate: delivDate, items } = input
  if (!items.length) throw new Error('No items')

  const { data: pendingOrders, error: poErr } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', c.id)
    .eq('delivery_date', delivDate)
    .eq('status', 'pending')
    .limit(1)
  if (poErr) throw poErr

  const ex = pendingOrders?.[0]

  if (ex) {
    const { data: oiRows, error: oiErr } = await supabase
      .from('order_items')
      .select('id,product_id,qty')
      .eq('order_id', ex.id)
    if (oiErr) throw oiErr

    for (const ni of items) {
      const existing = (oiRows ?? []).find((r: { product_id: string }) => r.product_id === ni.productId)
      if (existing) {
        const { error } = await supabase
          .from('order_items')
          .update({ qty: (existing as { qty: number }).qty + ni.qty })
          .eq('id', (existing as { id: string }).id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('order_items').insert({
          id: legacyUid(),
          order_id: ex.id,
          product_id: ni.productId,
          product_name: ni.productName,
          cat_id: ni.catId,
          qty: ni.qty,
        })
        if (error) throw error
      }
    }
  } else {
    const oid = legacyUid()
    const od = getOrderDriver(c, delivDate)
    const { error: oErr } = await supabase.from('orders').insert({
      id: oid,
      customer_id: c.id,
      customer_name: c.name,
      driver_id: od.driverId,
      route_order: od.routeOrder || 99,
      delivery_date: delivDate,
      bag_count: 1,
      status: 'pending',
      note: '',
      is_manual: false,
      checked_items: {},
    })
    if (oErr) throw oErr

    const { error: iErr } = await supabase.from('order_items').insert(
      items.map((it) => ({
        id: legacyUid(),
        order_id: oid,
        product_id: it.productId,
        product_name: it.productName,
        cat_id: it.catId,
        qty: it.qty,
      }))
    )
    if (iErr) throw iErr
  }

  const lid = legacyUid()
  const { error: rlErr } = await supabase.from('receiving_log').insert({
    id: lid,
    customer_id: c.id,
    customer_name: c.name,
    delivery_date: delivDate,
    received_on: todayStr(),
    time: timeStrAu(),
  })
  if (rlErr) throw rlErr

  const { error: rliErr } = await supabase.from('receiving_log_items').insert(
    items.map((it) => ({
      id: legacyUid(),
      log_id: lid,
      product_id: it.productId,
      product_name: it.productName,
      cat_id: it.catId,
      qty: it.qty,
    }))
  )
  if (rliErr) throw rliErr

  const { error: hErr } = await supabase.from('history').insert(
    items.map((it) => ({
      id: legacyUid(),
      date: todayStr(),
      customer_id: c.id,
      product_id: it.productId,
      qty: it.qty,
      type: 'receive',
    }))
  )
  if (hErr) throw hErr

  if (c.nextDeliveryOverride) {
    await supabase
      .from('customers')
      .update({ next_delivery_override: null })
      .eq('id', c.id)
    // Non-fatal
  }
}
