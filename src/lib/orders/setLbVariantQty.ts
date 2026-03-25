import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrderItem, Product } from '@/types'
import { legacyUid } from '@/lib/utils'

export async function setLbVariantQty(
  supabase: SupabaseClient,
  params: {
    orderId: string
    productId: string
    qty: number
    currentItems: OrderItem[]
    products: Product[]
  }
): Promise<{ items: OrderItem[]; bagCount: number }> {
  const { orderId, productId, qty, currentItems, products } = params
  let items = [...currentItems]
  let row = items.find((it) => it.productId === productId)

  if (!row) {
    if (qty <= 0) return { items, bagCount: computeBagCount(items) }
    const prod = products.find((x) => x.id === productId)
    if (!prod) throw new Error('Product not found')
    const newId = legacyUid()
    row = {
      id: newId,
      productId: prod.id,
      productName: prod.name,
      catId: prod.catId,
      qty: 0,
    }
    items.push(row)
    const { error } = await supabase.from('order_items').insert({
      id: newId,
      order_id: orderId,
      product_id: prod.id,
      product_name: prod.name,
      cat_id: prod.catId,
      qty: 0,
    })
    if (error) throw error
  }

  row.qty = qty

  const { error: uErr } = await supabase
    .from('order_items')
    .update({ qty })
    .eq('order_id', orderId)
    .eq('product_id', productId)
  if (uErr) throw uErr

  const bagCount = Math.max(1, computeBagCount(items))
  const { error: bErr } = await supabase.from('orders').update({ bag_count: bagCount }).eq('id', orderId)
  if (bErr) throw bErr

  return { items, bagCount }
}

function computeBagCount(items: OrderItem[]): number {
  return items.filter((it) => /laundry bag/i.test(it.productName)).reduce((s, it) => s + (it.qty || 0), 0)
}
