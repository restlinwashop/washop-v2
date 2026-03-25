'use client'

import { useMemo } from 'react'
import type { Category, Order, Product } from '@/types'
import { renderOrderProdSummary } from '@/lib/orders/packUtils'
import { fmtFullDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PackSummaryBarProps {
  selDay: string
  dayOrders: Order[]
  products: Product[]
  categories: Category[]
  onRefresh: () => void
}

export function PackSummaryBar({
  selDay,
  dayOrders,
  products,
  categories,
  onRefresh,
}: PackSummaryBarProps) {
  const rows = useMemo(
    () => renderOrderProdSummary(dayOrders, products, categories),
    [dayOrders, products, categories]
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm font-bold text-gray-800">📦 Pack Summary</div>
        <span className="text-xs text-gray-500">{fmtFullDate(selDay)}</span>
        <button
          type="button"
          onClick={onRefresh}
          className="ml-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          ↻
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {rows.length === 0 ? (
          <div className="text-xs text-gray-500">No orders for this day</div>
        ) : (
          rows.map((r) => {
            const rem = Math.max(0, r.total - r.done)
            const isTowel = r.type === 'towel'
            const borderColor = isTowel ? '#3b82f6' : '#16a34a'
            const bg = rem === 0 ? (isTowel ? '#eff6ff' : '#f0fdf4') : '#fff'
            return (
              <div
                key={r.productName}
                className={cn('rounded-lg border-2 p-3 min-w-[120px]', rem === 0 && 'opacity-70')}
                style={{ borderColor, background: bg }}
              >
                <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide truncate">
                  {r.productName}
                </div>
                <div className="text-2xl font-mono font-bold" style={{ color: borderColor }}>
                  {rem}
                </div>
                <div className="text-[11px] text-gray-500">
                  of {r.total} · {r.done} done
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
