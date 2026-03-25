'use client'

import { useState } from 'react'
import { Keypad } from '@/components/ui/Keypad'
import { Button } from '@/components/ui/Button'
import type { Customer, Product } from '@/types'
import { prodSortKey } from '@/lib/orders/packUtils'
import { cn } from '@/lib/utils'
import { fmtDayShort } from '@/lib/utils'

interface ReceiveGoodsHeroProps {
  searchValue: string
  onSearchClick: () => void
  onSearchChange: (v: string) => void
  selectedCustomer: Customer | null
  deliveryDate: string
  driverName: string
  bagsCollected: number | null
  recvNote: string | null
  products: Product[]
  qtys: Record<string, number>
  onQtyChange: (productId: string, qty: number) => void
  onResetQtys: () => void
  onSave: () => void
  onClearSelection: () => void
  onOpenNoteModal: () => void
  onClearRecvNote: () => void
  saving: boolean
}

export function ReceiveGoodsHero({
  searchValue,
  onSearchClick,
  onSearchChange,
  selectedCustomer,
  deliveryDate,
  driverName,
  bagsCollected,
  recvNote,
  products,
  qtys,
  onQtyChange,
  onResetQtys,
  onSave,
  onClearSelection,
  onOpenNoteModal,
  onClearRecvNote,
  saving,
}: ReceiveGoodsHeroProps) {
  const [keypad, setKeypad] = useState<{ id: string; name: string } | null>(null)
  const sorted = [...products].sort((a, b) => prodSortKey(a.name) - prodSortKey(b.name))

  function inc(p: Product, delta: number) {
    const cur = qtys[p.id] || 0
    onQtyChange(p.id, Math.max(0, cur + delta))
  }

  return (
    <>
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-white to-blue-50/40 shadow-lg shadow-blue-100/50 overflow-hidden">
        {/* Header bar */}
        <div className="bg-blue-600 px-5 py-5 sm:px-7 sm:py-6">
          <h2 className="text-white font-black text-xl sm:text-2xl tracking-tight">📦 Receive Goods</h2>
          <p className="text-blue-100 text-sm mt-1">Select a customer, enter quantities, then save to add to orders.</p>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Customer search */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer</label>
            <input
              type="text"
              className="mt-1.5 w-full rounded-xl border-2 border-gray-200 px-4 py-4 text-lg font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              placeholder="Tap to search customers…"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onClick={onSearchClick}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          {/* Selected customer info */}
          {selectedCustomer && (
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/80 p-4 flex flex-wrap gap-3 items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-black text-gray-900 text-xl">{selectedCustomer.name}</div>
                <div className="text-sm text-gray-600 mt-1.5">
                  Frequency: {selectedCustomer.frequency} · Scheduled: {fmtDayShort(deliveryDate)} · Driver:{' '}
                  {driverName}
                </div>
                {bagsCollected != null && bagsCollected > 0 && (
                  <div className="mt-2 text-sm font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 inline-block">
                    📦 Driver collected {bagsCollected} bags from this customer
                  </div>
                )}
                {recvNote && (
                  <div className="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    📝 <strong>Note:</strong> {recvNote}{' '}
                    <button type="button" onClick={onClearRecvNote} className="text-amber-800 underline text-xs ml-2">
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={onClearSelection}>
                ✕ Clear
              </Button>
            </div>
          )}

          {/* Product quantity grid */}
          {selectedCustomer && (
            <>
              {sorted.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No products assigned. Add products in the customer card → Products.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sorted.map((p) => {
                    const q = qtys[p.id] || 0
                    const hasQty = q > 0
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'rounded-2xl border-2 bg-white flex flex-col overflow-hidden transition-colors',
                          hasQty ? 'border-green-300 shadow-md shadow-green-100' : 'border-gray-200 shadow-sm'
                        )}
                      >
                        {/* Product name */}
                        <div className="px-3 pt-3 pb-1">
                          <div className="text-sm font-bold text-gray-800 leading-snug">{p.name}</div>
                        </div>

                        {/* Qty display — tap for keypad */}
                        <button
                          type="button"
                          onClick={() => setKeypad({ id: p.id, name: p.name })}
                          className={cn(
                            'mx-3 rounded-xl py-5 text-5xl font-mono font-bold transition-colors leading-none',
                            hasQty
                              ? 'text-green-700 bg-green-50 border-2 border-dashed border-green-300'
                              : 'text-gray-300 bg-gray-50 border-2 border-dashed border-gray-200'
                          )}
                        >
                          {q}
                        </button>

                        {/* Quick ± buttons */}
                        <div className="flex gap-1.5 p-3">
                          <button
                            type="button"
                            onClick={() => inc(p, -1)}
                            className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl transition-colors"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => inc(p, 1)}
                            className="flex-1 h-11 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xl transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-3 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={onOpenNoteModal}
                  className="text-sm font-semibold text-gray-600 underline decoration-dotted"
                >
                  📝 Add receiving note (own goods / special)
                </button>
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" onClick={onResetQtys}>
                    Reset
                  </Button>
                  <Button onClick={onSave} disabled={saving} className="min-w-[220px] text-base py-3.5 font-black">
                    {saving ? 'Saving…' : '💾 Save & Add to Orders'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {!selectedCustomer && (
            <p className="text-base text-gray-400 text-center py-8">← Select a customer to begin receiving</p>
          )}
        </div>
      </section>

      {keypad && (
        <Keypad
          title={keypad.name}
          subtitle="Enter qty received"
          initialValue={qtys[keypad.id] || 0}
          onConfirm={(v) => {
            onQtyChange(keypad.id, v)
            setKeypad(null)
          }}
          onClose={() => setKeypad(null)}
        />
      )}
    </>
  )
}
