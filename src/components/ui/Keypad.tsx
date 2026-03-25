'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface KeypadExtraAction {
  label: string
  onClick: (value: number) => void
}

interface KeypadProps {
  title: string
  subtitle?: string
  initialValue?: number
  onConfirm: (value: number) => void
  onClose: () => void
  /** Optional primary action button rendered above the ✓ confirm button */
  extraAction?: KeypadExtraAction
}

export function Keypad({ title, subtitle, initialValue = 0, onConfirm, onClose, extraAction }: KeypadProps) {
  const [val, setVal] = useState(initialValue > 0 ? String(initialValue) : '')
  const [fresh, setFresh] = useState(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') confirm()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  function press(k: string) {
    if (k === '⌫') { setVal((v) => v.slice(0, -1)); setFresh(false); return }
    if (k === 'C') { setVal(''); setFresh(false); return }
    const next = fresh ? k : val + k
    if (next.length > 4) return
    setVal(next)
    setFresh(false)
  }

  function confirm() {
    onConfirm(parseInt(val || '0'))
    onClose()
  }

  const keys = ['7','8','9','4','5','6','1','2','3','C','0','⌫']

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-sm font-semibold text-gray-500">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
          <div className="text-5xl font-black mt-3 tracking-tight text-gray-800 min-h-[3rem]">
            {val || <span className="text-gray-200">0</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={cn(
                'h-14 rounded-xl text-xl font-bold transition-colors active:scale-95',
                k === 'C' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                k === '⌫' ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
            >
              {k}
            </button>
          ))}
        </div>
        {extraAction && (
          <button
            onClick={() => {
              extraAction.onClick(parseInt(val || '0'))
              onClose()
            }}
            className="w-full h-14 bg-green-600 text-white text-base font-bold rounded-xl active:bg-green-700 mb-2"
          >
            {extraAction.label}
          </button>
        )}
        <button
          onClick={confirm}
          className="w-full h-14 bg-blue-600 text-white text-xl font-bold rounded-xl active:bg-blue-700"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
