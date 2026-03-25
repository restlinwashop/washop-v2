'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Keypad } from '@/components/ui/Keypad'
import { Button } from '@/components/ui/Button'
import type { ReceivingLogEntry, ReceivingLogLine } from '@/types'
import { fmtDayShort } from '@/lib/utils'

interface EditReceivingLogModalProps {
  open: boolean
  entry: ReceivingLogEntry | null
  onClose: () => void
  onSave: (input: { logId: string; customerId: string; deliveryDate: string; items: ReceivingLogLine[] }) => Promise<void>
  onDelete: (logId: string) => Promise<void>
}

export function EditReceivingLogModal({ open, entry, onClose, onSave, onDelete }: EditReceivingLogModalProps) {
  const [items, setItems] = useState<ReceivingLogLine[]>([])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [keypad, setKeypad] = useState<{ pid: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setItems(entry.items.map((x) => ({ ...x })))
      setDeliveryDate(entry.deliveryDate)
    }
  }, [entry])

  function adj(pid: string, d: number) {
    setItems((prev) =>
      prev.map((it) => (it.productId === pid ? { ...it, qty: Math.max(0, it.qty + d) } : it))
    )
  }

  async function handleSave() {
    if (!entry) return
    setSaving(true)
    try {
      await onSave({
        logId: entry.id,
        customerId: entry.customerId,
        deliveryDate,
        items,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!entry) return
    if (!window.confirm('Delete this receiving entry? This will NOT remove the associated order.')) return
    await onDelete(entry.id)
    onClose()
  }

  if (!open || !entry) return null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Edit — ${entry.customerName}`}
        className="sm:max-w-md"
      >
        <p className="text-[11px] text-gray-500 mb-3">
          Received: {fmtDayShort(entry.receivedOn)} · Delivery was: {fmtDayShort(entry.deliveryDate)}
        </p>
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-600">Delivery Date</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Quantities</div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((it) => (
            <div key={it.productId} className="flex items-center gap-2 py-2 border-b border-gray-50">
              <span className="flex-1 text-sm font-medium truncate">{it.productName}</span>
              <button type="button" className="w-8 h-8 rounded border bg-gray-50" onClick={() => adj(it.productId, -1)}>
                −
              </button>
              <button
                type="button"
                className="w-14 rounded border bg-gray-50 font-mono text-lg py-1"
                onClick={() => setKeypad({ pid: it.productId, name: it.productName })}
              >
                {it.qty}
              </button>
              <button type="button" className="w-8 h-8 rounded border bg-gray-50" onClick={() => adj(it.productId, 1)}>
                +
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
          <Button variant="secondary" className="text-red-700 border-red-200" size="sm" onClick={handleDelete}>
            🗑 Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
      {keypad && (
        <Keypad
          title={keypad.name}
          subtitle="Correct quantity"
          initialValue={items.find((i) => i.productId === keypad.pid)?.qty ?? 0}
          onConfirm={(v) => {
            setItems((prev) => prev.map((it) => (it.productId === keypad.pid ? { ...it, qty: v } : it)))
            setKeypad(null)
          }}
          onClose={() => setKeypad(null)}
        />
      )}
    </>
  )
}
