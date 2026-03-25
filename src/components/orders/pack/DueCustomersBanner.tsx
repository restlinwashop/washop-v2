'use client'

import type { Customer } from '@/types'

interface DueCustomersBannerProps {
  customers: Customer[]
}

export function DueCustomersBanner({ customers }: DueCustomersBannerProps) {
  if (!customers.length) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-2">
        Due Today — No Order Received Yet
      </div>
      <div className="flex flex-wrap gap-2">
        {customers.map((c) => (
          <span
            key={c.id}
            className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300"
          >
            {c.name} ({c.frequency})
            {c.recvNote ? ` 📝 ${c.recvNote}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
