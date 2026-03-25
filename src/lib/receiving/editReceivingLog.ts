import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReceivingLogLine } from '@/types'

export async function updateReceivingLogEntry(
  supabase: SupabaseClient,
  input: {
    logId: string
    customerId: string
    deliveryDate: string
    items: ReceivingLogLine[]
  }
): Promise<void> {
  const { logId, customerId, deliveryDate, items } = input

  const { error: logErr } = await supabase
    .from('receiving_log')
    .update({ delivery_date: deliveryDate })
    .eq('id', logId)
  if (logErr) throw logErr

  for (const it of items) {
    const { error } = await supabase
      .from('receiving_log_items')
      .update({ qty: it.qty })
      .eq('log_id', logId)
      .eq('product_id', it.productId)
    if (error) throw error
  }

  const { data: ordRows, error: oErr } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('delivery_date', deliveryDate)
    .eq('status', 'pending')
    .limit(1)
  if (oErr) throw oErr
  const orderId = ordRows?.[0]?.id
  if (!orderId) return

  const { data: oiRows, error: oiErr } = await supabase
    .from('order_items')
    .select('id,product_id')
    .eq('order_id', orderId)
  if (oiErr) throw oiErr

  for (const it of items) {
    const row = (oiRows ?? []).find((r: { product_id: string }) => r.product_id === it.productId)
    if (row) {
      const { error } = await supabase.from('order_items').update({ qty: it.qty }).eq('id', (row as { id: string }).id)
      if (error) throw error
    }
  }
}

export async function deleteReceivingLogEntry(supabase: SupabaseClient, logId: string): Promise<void> {
  const { error: iErr } = await supabase.from('receiving_log_items').delete().eq('log_id', logId)
  if (iErr) throw iErr
  const { error: lErr } = await supabase.from('receiving_log').delete().eq('id', logId)
  if (lErr) throw lErr
}
