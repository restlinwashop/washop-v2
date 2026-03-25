import type { SupabaseClient } from '@supabase/supabase-js'
import type { Customer, Order, Product } from '@/types'
import { getOrderDriver } from '@/lib/orders/packUtils'
import { isCustomerDueOnDate } from '@/lib/orders/packUtils'
import { addDays, legacyUid, todayStr } from '@/lib/utils'

/**
 * Auto-create DB orders for customers with fixed recurring qtys (V1 autoCreateFixedOrders).
 */
export async function autoCreateFixedOrders(
  supabase: SupabaseClient,
  params: {
    customers: Customer[]
    products: Product[]
    existingOrders: Order[]
  }
): Promise<void> {
  const { customers, products, existingOrders } = params
  const fixedCusts = customers.filter((c) => c.fixedOrder && c.active)
  if (!fixedCusts.length) return

  const today = todayStr()

  for (const c of fixedCusts) {
    const qtys = c.fixedQtys || {}
    const items = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([pid, qty]) => {
        const p = products.find((x) => x.id === pid)
        return p
          ? {
              productId: pid,
              productName: p.name,
              catId: p.catId,
              qty: parseInt(String(qty), 10),
            }
          : null
      })
      .filter(Boolean) as {
      productId: string
      productName: string
      catId: string
      qty: number
    }[]

    if (!items.length) continue

    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i)
      const dow = new Date(date + 'T00:00:00').getDay()
      if (dow === 0) continue
      if (!isCustomerDueOnDate(c, date)) continue

      const exists = existingOrders.some(
        (o) => o.customerId === c.id && o.deliveryDate === date && o.status !== 'delivered'
      )
      if (exists) continue

      const oid = legacyUid()
      const od = getOrderDriver(c, date)

      try {
        const { error: oErr } = await supabase.from('orders').insert({
          id: oid,
          customer_id: c.id,
          customer_name: c.name,
          driver_id: od.driverId,
          route_order: od.routeOrder || 99,
          delivery_date: date,
          bag_count: 1,
          status: 'pending',
          note: 'Fixed',
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

        const { error: hErr } = await supabase.from('history').insert(
          items.map((it) => ({
            id: legacyUid(),
            date: date,
            customer_id: c.id,
            product_id: it.productId,
            qty: it.qty,
            type: 'receive',
          }))
        )
        if (hErr) console.warn('fixedOrders history:', hErr.message)
      } catch (e) {
        console.warn('Fixed order create error:', e)
      }
    }
  }
}
