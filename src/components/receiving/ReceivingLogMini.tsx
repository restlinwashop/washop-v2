'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { ReceivingLogEntry } from '@/types'
import { fmtDayShort } from '@/lib/utils'

interface ReceivingLogMiniProps {
  entries: ReceivingLogEntry[]
  filterDate: string
  onFilterDateChange: (d: string) => void
  filterCustomerId: string
  onFilterCustomerChange: (id: string) => void
  customerOptions: { id: string; name: string }[]
  onClearFilters: () => void
  onEdit: (id: string) => void
}

export function ReceivingLogMini({
  entries,
  filterDate,
  onFilterDateChange,
  filterCustomerId,
  onFilterCustomerChange,
  customerOptions,
  onClearFilters,
  onEdit,
}: ReceivingLogMiniProps) {
  const [expanded, setExpanded] = useState(false)

  let filtered = entries
  if (filterDate) {
    filtered = filtered.filter((e) => e.receivedOn === filterDate || (e.time && !e.receivedOn))
  }
  if (filterCustomerId) {
    filtered = filtered.filter((e) => e.customerId === filterCustomerId)
  }
  const rows = [...filtered].reverse()

  return (
    <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-100 border-b border-gray-200 hover:bg-gray-150 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Receiving Log</h3>
        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
          {entries.length} entries
        </span>
        <span className="ml-auto text-xs text-gray-400">{expanded ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {/* Collapsible body */}
      {expanded && (
        <>
          <div className="px-3 py-2 flex flex-wrap gap-2 items-end border-b border-gray-100 bg-gray-50/80">
            <div className="min-w-[120px]">
              <label className="text-[10px] text-gray-500 block">Received on</label>
              <input
                type="date"
                className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                value={filterDate}
                onChange={(e) => onFilterDateChange(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="text-[10px] text-gray-500 block">Customer</label>
              <select
                className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
                value={filterCustomerId}
                onChange={(e) => onFilterCustomerChange(e.target.value)}
              >
                <option value="">All</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="sm" className="text-xs py-1 h-7" onClick={onClearFilters}>
              Clear
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-gray-100 text-gray-500 uppercase text-[9px]">
                <tr>
                  <th className="text-left px-2 py-1 font-semibold">Customer</th>
                  <th className="text-left px-1 py-1 font-semibold">Items</th>
                  <th className="text-right px-1 py-1 font-semibold">Tot</th>
                  <th className="text-left px-1 py-1 font-semibold">Deliv</th>
                  <th className="text-left px-1 py-1 font-semibold">Recv</th>
                  <th className="text-left px-1 py-1 font-semibold">Time</th>
                  <th className="w-14 px-1 py-1" />
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-gray-400 text-xs">
                      No entries
                    </td>
                  </tr>
                ) : (
                  rows.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="px-2 py-1 font-semibold text-gray-900 truncate max-w-[100px]">{e.customerName}</td>
                      <td
                        className="px-1 py-1 text-gray-600 max-w-[180px] truncate"
                        title={e.items.map((i) => `${i.productName}(${i.qty})`).join(', ')}
                      >
                        {e.items.map((i) => `${i.productName}(${i.qty})`).join(', ')}
                      </td>
                      <td className="px-1 py-1 text-right font-mono">{e.items.reduce((a, b) => a + b.qty, 0)}</td>
                      <td className="px-1 py-1 text-gray-600 whitespace-nowrap">{fmtDayShort(e.deliveryDate)}</td>
                      <td className="px-1 py-1 text-gray-500 whitespace-nowrap">
                        {e.receivedOn ? fmtDayShort(e.receivedOn) : 'today'}
                      </td>
                      <td className="px-1 py-1 font-mono text-gray-500">{e.time}</td>
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-blue-700 underline"
                          onClick={() => onEdit(e.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
