'use client'

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import type { ReceivingLogEntry, ReceivingLogItemRow, ReceivingLogRow } from '@/types'
import { toYMDLocal } from '@/lib/utils'

function cutoff90(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return toYMDLocal(d)
}

function mapRows(logs: ReceivingLogRow[], items: ReceivingLogItemRow[]): ReceivingLogEntry[] {
  const imap: Record<string, ReceivingLogEntry['items']> = {}
  for (const i of items) {
    if (!imap[i.log_id]) imap[i.log_id] = []
    imap[i.log_id].push({
      productId: i.product_id,
      productName: i.product_name,
      catId: i.cat_id ?? '',
      qty: i.qty,
    })
  }
  return logs.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    deliveryDate: r.delivery_date,
    receivedOn: r.received_on,
    time: r.time ?? '',
    items: imap[r.id] ?? [],
  }))
}

export function useReceivingLogs() {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['receiving-logs'],
    queryFn: async (): Promise<ReceivingLogEntry[]> => {
      const cutoff = cutoff90()
      const { data: logRows, error: lErr } = await supabase
        .from('receiving_log')
        .select('*')
        .gte('received_on', cutoff)
        .order('received_on', { ascending: false })
      if (lErr) throw lErr

      const logs = (logRows ?? []) as ReceivingLogRow[]
      if (!logs.length) return []

      const logIds = logs.map((l) => l.id)
      let allItems: ReceivingLogItemRow[] = []
      for (let i = 0; i < logIds.length; i += 200) {
        const batch = logIds.slice(i, i + 200)
        const { data, error } = await supabase.from('receiving_log_items').select('*').in('log_id', batch)
        if (error) throw error
        allItems = allItems.concat((data ?? []) as ReceivingLogItemRow[])
      }

      return mapRows(logs, allItems)
    },
    staleTime: 30_000,
  })
}
