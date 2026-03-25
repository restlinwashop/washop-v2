import type { SupabaseClient } from '@supabase/supabase-js'
import type { Customer, Product } from '@/types'

/** Auto-assign purple/black laundry bag products when custType requires (V1 selectRecvCust). */
export async function ensureLaundryBagProducts(
  supabase: SupabaseClient,
  customer: Customer,
  products: Product[],
  custProductIds: Set<string>
): Promise<Set<string>> {
  const next = new Set(custProductIds)
  if (!customer.custType) return next

  const purpleProd = products.find((p) => /laundry bag \(purple\)/i.test(p.name))
  const blackProd = products.find((p) => /laundry bag \(black\)/i.test(p.name))
  const needsPurple =
    (customer.custType === 'linen' || customer.custType === 'both') && purpleProd && !next.has(purpleProd.id)
  const needsBlack =
    (customer.custType === 'towel' || customer.custType === 'both') && blackProd && !next.has(blackProd.id)

  const rows: { cust_id: string; product_id: string }[] = []
  if (needsPurple && purpleProd) {
    next.add(purpleProd.id)
    rows.push({ cust_id: customer.id, product_id: purpleProd.id })
  }
  if (needsBlack && blackProd) {
    next.add(blackProd.id)
    rows.push({ cust_id: customer.id, product_id: blackProd.id })
  }
  if (rows.length) {
    const { error } = await supabase.from('cust_products').insert(rows)
    if (error && !String(error.message).includes('duplicate') && !String(error).includes('23505')) {
      console.warn('ensureLaundryBagProducts:', error.message)
    }
  }
  return next
}
