'use client'

import { useEffect, useState } from 'react'
import type { Customer } from '@/types'
import { cn } from '@/lib/utils'

interface CustomerPickModalProps {
  open: boolean
  initialQuery: string
  customers: Customer[]
  onClose: () => void
  onSelect: (id: string) => void
}

function filterMatches(q: string, customers: Customer[]) {
  const ql = q.toLowerCase()
  const matches = ql
    ? customers.filter((c) => c.active && c.name.toLowerCase().includes(ql))
    : customers.filter((c) => c.active)
  matches.sort((a, b) => {
    if (!ql) return a.name.localeCompare(b.name)
    const an = a.name.toLowerCase()
    const bn = b.name.toLowerCase()
    if (an === ql && bn !== ql) return -1
    if (an !== ql && bn === ql) return 1
    if (an.startsWith(ql) && !bn.startsWith(ql)) return -1
    if (!an.startsWith(ql) && bn.startsWith(ql)) return 1
    return an.localeCompare(bn)
  })
  return matches
}

export function CustomerPickModal({ open, initialQuery, customers, onClose, onSelect }: CustomerPickModalProps) {
  const [q, setQ] = useState(initialQuery)

  useEffect(() => {
    if (open) setQ(initialQuery)
  }, [open, initialQuery])

  if (!open) return null

  const matches = filterMatches(q, customers)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex gap-2 items-center p-4 border-b border-gray-100">
          <input
            id="cust-modal-search"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Search customer..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-semibold">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {!matches.length ? (
            <div className="p-8 text-center text-gray-400 text-sm">No customers found</div>
          ) : (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  'w-full text-left px-4 py-3.5 border-b border-gray-50',
                  'hover:bg-gray-50 active:bg-gray-100'
                )}
                onClick={() => {
                  onSelect(c.id)
                  onClose()
                }}
              >
                <div className="font-semibold text-gray-900">{c.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {c.frequency} · {c.address || '—'}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
