'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Keypad } from '@/components/ui/Keypad'
import type { Category, Order, OrderItem, Product } from '@/types'
import { catType } from '@/lib/orders/packUtils'
import { fmtDayShort } from '@/lib/utils'

interface EditOrderModalProps {
  open: boolean
  order: Order | null
  products: Product[]
  categories: Category[]
  custProductIds: Set<string>
  onClose: () => void
  onSave: (input: { order: Order; deliveryDate: string; note: string }) => Promise<void>
  onDelete: (orderId: string) => Promise<void>
  onConvertPUO: (orderId: string) => Promise<void>
  onAddItem: (orderId: string, product: Product, qty: number) => Promise<void>
  onRemoveItem: (orderId: string, productId: string) => Promise<void>
}

export function EditOrderModal({
  open,
  order,
  products,
  categories,
  custProductIds,
  onClose,
  onSave,
  onDelete,
  onConvertPUO,
  onAddItem,
  onRemoveItem,
}: EditOrderModalProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [keypad, setKeypad] = useState<{ mode: 'qty' | 'add'; product?: Product; pid?: string } | null>(
    null
  )

  useEffect(() => {
    if (order) {
      setItems(order.items.map((x) => ({ ...x })))
      setDeliveryDate(order.deliveryDate)
      setNote(order.note || '')
    }
  }, [order])

  if (!order) return null
  const curOrder = order

  const missingProds = products.filter(
    (p) => custProductIds.has(p.id) && !items.some((it) => it.productId === p.id)
  )

  function adj(pid: string, d: number) {
    setItems((prev) =>
      prev.map((it) => (it.productId === pid ? { ...it, qty: Math.max(0, it.qty + d) } : it))
    )
  }

  async function handleSave() {
    const totalQty = items.reduce((s, it) => s + (it.qty || 0), 0)
    if (totalQty === 0) {
      if (window.confirm('All items are zero. Delete this order completely?')) {
        await onDelete(curOrder.id)
        onClose()
      }
      return
    }
    const o: Order = {
      ...curOrder,
      items: items.filter((x) => x.qty > 0),
      deliveryDate,
      note,
    }
    await onSave({ order: o, deliveryDate, note })
    onClose()
  }

  async function handleDelete() {
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    await onDelete(curOrder.id)
    onClose()
  }

  async function handlePUO() {
    if (!window.confirm('Convert this order to PU Only? All items will be removed. This cannot be undone.')) {
      return
    }
    await onConvertPUO(curOrder.id)
    onClose()
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Edit Order — ${curOrder.customerName}`} className="sm:max-w-lg">
        <p className="text-xs text-gray-500 mb-3">
          {fmtDayShort(curOrder.deliveryDate)} · {curOrder.status.toUpperCase()}
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Delivery date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Note</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {items.map((it) => (
              <div key={it.productId} className="flex items-center gap-2 py-2 border-b border-gray-50">
                <span className="flex-1 text-sm font-medium truncate">{it.productName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    catType(categories, it.catId) === 'towel'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {catType(categories, it.catId)}
                </span>
                <button type="button" className="w-7 h-7 rounded border bg-gray-50" onClick={() => adj(it.productId, -1)}>
                  −
                </button>
                <button
                  type="button"
                  className="w-14 rounded border bg-gray-50 font-mono text-lg py-1"
                  onClick={() => setKeypad({ mode: 'qty', pid: it.productId })}
                >
                  {it.qty}
                </button>
                <button type="button" className="w-7 h-7 rounded border bg-gray-50" onClick={() => adj(it.productId, 1)}>
                  +
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600 font-semibold px-2"
                  onClick={async () => {
                    await onRemoveItem(curOrder.id, it.productId)
                    setItems((prev) => prev.filter((x) => x.productId !== it.productId))
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {missingProds.length > 0 && (
            <div className="border-t border-dashed border-red-200 pt-3">
              <div className="text-[11px] font-bold text-red-700 uppercase mb-2">Not in order — tap to add</div>
              {missingProds.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-2 border-b border-red-50">
                  <span className="flex-1 text-sm text-red-700">{p.name}</span>
                  <button
                    type="button"
                    className="text-xs font-bold text-green-700 border border-green-300 rounded px-2 py-1"
                    onClick={() => setKeypad({ mode: 'add', product: p })}
                  >
                    ＋ Add
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 pt-3">
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-xl bg-green-600 text-white font-bold py-3"
            >
              Save order
            </button>
            <button type="button" onClick={handlePUO} className="w-full rounded-xl border border-blue-200 text-blue-800 font-semibold py-2">
              Convert to PU Only
            </button>
            {curOrder.status !== 'delivered' && (
              <button type="button" onClick={handleDelete} className="w-full text-red-600 text-sm font-semibold py-2">
                Delete order
              </button>
            )}
          </div>
        </div>
      </Modal>
      {keypad?.mode === 'qty' && keypad.pid && (
        <Keypad
          title={items.find((i) => i.productId === keypad.pid)?.productName ?? ''}
          subtitle="Edit qty"
          initialValue={items.find((i) => i.productId === keypad.pid)?.qty ?? 0}
          onConfirm={(v) => {
            setItems((prev) => prev.map((it) => (it.productId === keypad.pid ? { ...it, qty: v } : it)))
            setKeypad(null)
          }}
          onClose={() => setKeypad(null)}
        />
      )}
      {keypad?.mode === 'add' && keypad.product && (
        <Keypad
          title={keypad.product.name}
          subtitle="Enter quantity"
          initialValue={0}
          onConfirm={async (v) => {
            if (v <= 0) {
              setKeypad(null)
              return
            }
            await onAddItem(curOrder.id, keypad.product!, v)
            setItems((prev) => [
              ...prev,
              {
                id: 'temp',
                productId: keypad.product!.id,
                productName: keypad.product!.name,
                catId: keypad.product!.catId,
                qty: v,
              },
            ])
            setKeypad(null)
          }}
          onClose={() => setKeypad(null)}
        />
      )}
    </>
  )
}
