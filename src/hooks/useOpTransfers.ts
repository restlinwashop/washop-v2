'use client'

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import { useAppStore } from '@/store'
import type { OpTransfer } from '@/types'
import { toYMDLocal } from '@/lib/utils'

interface OpTransferRow {
  id: string
  date: string
  product_id: string
  product_name: string
  qty: number
  time_sent: string | null
  note: string | null
}

function cutoff30(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return toYMDLocal(d)
}

export function useOpTransfers() {
  const supabase = useSupabase()
  const setOpTransfers = useAppStore((s) => s.setOpTransfers)

  return useQuery({
    queryKey: ['op-transfers'],
    queryFn: async (): Promise<OpTransfer[]> => {
      const { data, error } = await supabase
        .from('op_transfers')
        .select('*')
        .gte('date', cutoff30())
        .order('date', { ascending: false })
        .order('time_sent', { ascending: false })

      if (error) throw error

      const transfers: OpTransfer[] = (data ?? []).map((r: OpTransferRow) => ({
        id: r.id,
        date: r.date,
        productId: r.product_id,
        productName: r.product_name,
        qty: r.qty,
        time: r.time_sent ?? '',
        note: r.note ?? '',
      }))

      setOpTransfers(transfers)
      return transfers
    },
    staleTime: 15_000,
  })
}
