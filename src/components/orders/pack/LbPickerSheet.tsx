'use client'

import { Keypad } from '@/components/ui/Keypad'
export interface LbVariant {
  productId: string
  productName: string
  qty: number
}

interface LbPickerSheetProps {
  customerName: string
  variants: LbVariant[]
  sheetOpen: boolean
  keypadTarget: LbVariant | null
  onSelectVariant: (v: LbVariant) => void
  onCloseKeypad: () => void
  onConfirmQty: (productId: string, qty: number) => void
  onCloseSheet: () => void
}

export function LbPickerSheet({
  customerName,
  variants,
  sheetOpen,
  keypadTarget,
  onSelectVariant,
  onCloseKeypad,
  onConfirmQty,
  onCloseSheet,
}: LbPickerSheetProps) {
  return (
    <>
      {sheetOpen && variants.length > 1 && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45"
          onClick={(e) => e.target === e.currentTarget && onCloseSheet()}
        >
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 pb-8">
            <div className="font-bold text-base mb-0.5">LB · {customerName}</div>
            <div className="text-xs text-gray-500 mb-4">Tap a variant to edit qty</div>
            {variants.map((v) => (
              <button
                key={v.productId}
                type="button"
                onClick={() => onSelectVariant(v)}
                className="w-full flex items-center justify-between p-4 rounded-xl mb-2 border-2 bg-gray-50 text-left"
                style={{ borderColor: v.qty > 0 ? '#c084fc' : '#e5e7eb' }}
              >
                <span className="text-sm font-semibold">{v.productName}</span>
                <span
                  className="text-2xl font-black"
                  style={{ color: v.qty > 0 ? '#7e22ce' : '#9ca3af' }}
                >
                  {v.qty}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onCloseSheet}
              className="w-full mt-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {keypadTarget && (
        <Keypad
          title={`LB · ${customerName}`}
          subtitle={keypadTarget.productName}
          initialValue={keypadTarget.qty}
          onConfirm={(qty) => {
            onConfirmQty(keypadTarget.productId, qty)
            onCloseKeypad()
          }}
          onClose={onCloseKeypad}
        />
      )}
    </>
  )
}
