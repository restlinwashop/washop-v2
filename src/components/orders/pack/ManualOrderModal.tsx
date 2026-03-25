'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Keypad } from '@/components/ui/Keypad'
import type { Customer, Product } from '@/types'
import { cn } from '@/lib/utils'

interface ManualOrderModalProps {
  open: boolean
  onClose: () => void
  customers: Customer[]
  products: Product[]
  defaultDate: string
  onSave: (input: {
    customerId: string
    moQtys: Record<string, number>
    date: string
    note: string
    isPUO: boolean
  }) => Promise<void>
}

export function ManualOrderModal({
  open,
  onClose,
  customers,
  products,
  defaultDate,
  onSave,
}: ManualOrderModalProps) {
  const [custId, setCustId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [note, setNote] = useState('')
  const [isPUO, setIsPUO] = useState(false)
  const [moQtys, setMoQtys] = useState<Record<string, number>>({})
  const [keypad, setKeypad] = useState<{ pid: string; name: string } | null>(null)

  const activeCusts = useMemo(() => customers.filter((c) => c.active), [customers])

  function adj(pid: string, d: number) {
    setMoQtys((q) => ({ ...q, [pid]: Math.max(0, (q[pid] || 0) + d) }))
  }

  async function handleSave() {
    if (!custId || !date) {
      window.alert('Select customer and date.')
      return
    }
    try {
      if (!isPUO) {
        const hasLine = products.some((p) => (moQtys[p.id] || 0) > 0)
        if (!hasLine) {
          window.alert('Add at least one item.')
          return
        }
      }
      await onSave({ customerId: custId, moQtys, date, note, isPUO })
      onClose()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manual Order" className="sm:max-w-lg">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Customer</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={custId}
              onChange={(e) => setCustId(e.target.value)}
            >
              <option value="">Select...</option>
              {activeCusts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Delivery date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={isPUO} onChange={(e) => setIsPUO(e.target.checked)} />
            PU Only (pickup only, no items)
          </label>
          {!isPUO && (
            <div>
              <label className="text-xs font-semibold text-gray-600">Note</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}
          {!isPUO && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {products.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <div className="text-xs font-semibold mb-1 truncate">{p.name}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border bg-white text-lg leading-none"
                      onClick={() => adj(p.id, -1)}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-md border bg-white py-1 font-mono text-lg font-semibold"
                      onClick={() => setKeypad({ pid: p.id, name: p.name })}
                    >
                      {moQtys[p.id] || 0}
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border bg-white text-lg leading-none"
                      onClick={() => adj(p.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                'flex-1 rounded-xl py-3 font-bold text-white',
                isPUO ? 'bg-blue-600' : 'bg-green-600'
              )}
            >
              Save
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-3 font-semibold">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      {keypad && (
        <Keypad
          title={keypad.name}
          subtitle="Manual order qty"
          initialValue={moQtys[keypad.pid] || 0}
          onConfirm={(v) => {
            setMoQtys((q) => ({ ...q, [keypad.pid]: v }))
            setKeypad(null)
          }}
          onClose={() => setKeypad(null)}
        />
      )}
    </>
  )
}
