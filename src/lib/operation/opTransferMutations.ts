import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpTransfer } from '@/types'
import { legacyUid } from '@/lib/utils'

function timeSentAu(): string {
  return new Date().toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export interface TransferInput {
  date: string
  productId: string
  productName: string
  qty: number
}

export async function saveOpTransfers(
  supabase: SupabaseClient,
  inputs: TransferInput[]
): Promise<OpTransfer[]> {
  if (!inputs.length) throw new Error('No transfers to save')

  const now = timeSentAu()
  const rows = inputs.map((i) => ({
    id: legacyUid(),
    date: i.date,
    product_id: i.productId,
    product_name: i.productName,
    qty: i.qty,
    time_sent: now,
    note: null,
  }))

  const { error } = await supabase.from('op_transfers').insert(rows)
  if (error) throw error

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    productId: r.product_id,
    productName: r.product_name,
    qty: r.qty,
    time: r.time_sent,
    note: '',
  }))
}

export async function deleteOpTransfer(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('op_transfers').delete().eq('id', id)
  if (error) throw error
}
