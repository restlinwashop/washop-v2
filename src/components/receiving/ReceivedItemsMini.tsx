'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'
import { prodType } from '@/lib/orders/packUtils'
import type { Product } from '@/types'
import { fmtDayShort } from '@/lib/utils'

interface ReceivedItemsMiniProps {
  filterDate: string
  onFilterDateChange: (d: string) => void
  onToday: () => void
  onExportCsv: () => void
  /** productName -> total qty for filterDate */
  totals: Record<string, number>
  products: Product[]
  categories: Category[]
}

export function ReceivedItemsMini({
  filterDate,
  onFilterDateChange,
  onToday,
  onExportCsv,
  totals,
  products,
  categories,
}: ReceivedItemsMiniProps) {
  const [expanded, setExpanded] = useState(true)

  const keys = Object.keys(totals)
  const prodInfo: Record<string, 'linen' | 'towel'> = {}
  for (const k of keys) {
    const p = products.find((x) => x.name === k)
    prodInfo[k] = p ? prodType(products, categories, p.id) : 'linen'
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden">
      {/* Header — always visible */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-100">
        <button
          type="button"
          className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wide hover:text-gray-800 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>📥 Received Items</span>
          <span className="text-gray-400 font-normal">{expanded ? '▲' : '▼'}</span>
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="rounded border border-gray-200 px-2 py-1 text-xs bg-white"
            value={filterDate}
            onChange={(e) => onFilterDateChange(e.target.value)}
          />
          <Button variant="secondary" size="sm" className="text-xs py-1" onClick={onToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" className="text-xs py-1" onClick={onExportCsv}>
            ⇩ CSV
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-3">
          {!keys.length ? (
            <p className="text-xs text-gray-500">No items received on {fmtDayShort(filterDate)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {keys.map((k) => {
                const t = prodInfo[k] || 'linen'
                const borderColor = t === 'towel' ? '#3b82f6' : '#16a34a'
                const bgColor = t === 'towel' ? '#eff6ff' : '#f0fdf4'
                return (
                  <div
                    key={k}
                    className="rounded-md border-2 px-2 py-1.5 min-w-0"
                    style={{ borderColor, background: bgColor }}
                  >
                    <div className="text-[10px] font-semibold text-gray-600 truncate leading-tight">{k}</div>
                    <div className="text-lg font-mono font-bold leading-tight" style={{ color: borderColor }}>
                      {totals[k]}
                    </div>
                    <div className="text-[9px] text-gray-500">{fmtDayShort(filterDate)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
