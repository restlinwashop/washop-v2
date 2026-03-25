'use client'

import type { Category, Customer, Order, Product } from '@/types'
import {
  laundryBagQty,
  type PackGroupType,
  typeItemsForOrderRow,
} from '@/lib/orders/packUtils'
import { cn } from '@/lib/utils'

interface OrderPackRowProps {
  index: number
  order: Order
  groupType: PackGroupType
  customers: Customer[]
  products: Product[]
  categories: Category[]
  custProductMap: Map<string, Set<string>>
  onToggleChip: (orderId: string, productId: string, groupType: PackGroupType) => void
  onMarkPacked: (orderId: string) => void
  onUndoPack: (orderId: string) => void
  onEditOrder: (orderId: string) => void
  onLbClick: (orderId: string) => void
  onBagCountChange: (orderId: string, n: number) => void
  onPrintLabels: (orderId: string) => void
}

function statusBadge(status: Order['status']) {
  if (status === 'pending') return 'bg-amber-100 text-amber-900 border-amber-300'
  if (status === 'packed') return 'bg-green-100 text-green-900 border-green-300'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}

export function OrderPackRow({
  index,
  order,
  groupType,
  customers,
  products,
  categories,
  custProductMap,
  onToggleChip,
  onMarkPacked,
  onUndoPack,
  onEditOrder,
  onLbClick,
  onBagCountChange,
  onPrintLabels,
}: OrderPackRowProps) {
  const c = customers.find((x) => x.id === order.customerId)
  const isPacked = order.status === 'packed'
  const isDeliveredLike = order.status === 'delivered' || order.status === 'dispatched'
  const typeItems = typeItemsForOrderRow(order, c, groupType, products, categories)
  const lbQty = laundryBagQty(order)

  const assigned = custProductMap.get(order.customerId) ?? new Set()
  const missing = products.filter((p) => assigned.has(p.id) && !order.items.some((it) => it.productId === p.id))

  return (
    <div
      className={cn(
        'border-b border-gray-200 last:border-b-0 transition-colors',
        isPacked &&
          'bg-emerald-200 border-emerald-400/70 shadow-[inset_4px_0_0_0_#047857]',
        isDeliveredLike && 'bg-slate-300 border-slate-400 shadow-[inset_4px_0_0_0_#334155]'
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 cursor-default">
        <span className="text-xs font-mono text-gray-400 w-6">{index + 1}</span>
        <span className="font-bold text-sm text-gray-900 flex-1 min-w-[120px]">{order.customerName}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onLbClick(order.id)
          }}
          className={cn(
            'inline-flex items-center rounded-full border-2 px-3 py-1 text-[13px] font-bold shrink-0',
            lbQty > 0
              ? 'border-purple-400 bg-purple-100 text-purple-800'
              : 'border-gray-300 bg-gray-100 text-gray-500'
          )}
        >
          LB&nbsp;{lbQty}
        </button>
        <span className="text-[11px] text-gray-500">{c?.frequency ?? ''}</span>
        <span
          className={cn(
            'text-[11px] font-bold uppercase px-2 py-0.5 rounded border ml-2',
            statusBadge(order.status)
          )}
        >
          {order.status}
        </span>
        {order.note === 'Fixed' && (
          <span className="text-[11px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            📋 FIXED
          </span>
        )}
        {order.note && order.note !== 'Fixed' && (
          <span
            className={cn(
              'text-[11px] font-bold ml-2 px-2 py-0.5 rounded',
              order.note === 'PU Only'
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-500'
            )}
          >
            {order.note === 'PU Only' ? '📦 PU ONLY' : `📝 ${order.note}`}
          </span>
        )}
        {c?.recvNote && (
          <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold">
            ⚠ {c.recvNote}
          </span>
        )}
        {order.status === 'pending' && missing.length > 0 && (
          <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
            ⚠ {missing.length} missing
          </span>
        )}
      </div>

      <div className="px-4 pb-3 pl-12 sm:pl-14">
        {c?.recvNote && (
          <div className="mb-2 px-3 py-2 rounded border-l-4 border-yellow-500 bg-yellow-50 text-xs font-semibold text-yellow-900">
            ⚠ COG/Special: {c.recvNote}
          </div>
        )}
        {typeItems.map((it) => {
          const ck = order.checkedItems[it.productId + groupType]
          return (
            <div key={it.productId + groupType} className="mb-1.5">
              <button
                type="button"
                onClick={() => onToggleChip(order.id, it.productId, groupType)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  ck
                    ? 'border-green-600 bg-green-100 text-green-800 line-through'
                    : 'border-gray-200 bg-white text-gray-800'
                )}
              >
                <span className="font-mono">{it.qty}</span>
                <span>{it.productName}</span>
                {ck && <span>✓</span>}
              </button>
            </div>
          )
        })}
        {order.status === 'pending' &&
          missing.map((p) => (
            <div key={p.id} className="mb-1.5">
              <button
                type="button"
                onClick={() => onEditOrder(order.id)}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-semibold text-red-700"
              >
                <span className="font-mono bg-red-600 text-white rounded px-1.5 text-xs">0</span>
                <span>{p.name}</span>
                <span className="text-[11px] opacity-70">tap to add →</span>
              </button>
            </div>
          ))}
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-2 px-4 py-3 pl-12 sm:pl-14 border-t',
          isPacked && 'border-emerald-500/50',
          isDeliveredLike && 'border-slate-500/50',
          order.status === 'pending' && 'border-gray-100 bg-gray-50'
        )}
      >
        {order.status === 'pending' && (
          <button
            type="button"
            onClick={() => onMarkPacked(order.id)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            ✓ Mark Packed
          </button>
        )}
        {order.status === 'packed' && (
          <button
            type="button"
            onClick={() => onUndoPack(order.id)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
          >
            ↩ Undo Pack
          </button>
        )}
        <button
          type="button"
          onClick={() => onEditOrder(order.id)}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
        >
          ✏ Edit / Delete
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-600 mb-0">Bags</label>
          <input
            type="number"
            min={1}
            className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-sm"
            value={order.bagCount}
            onChange={(e) => onBagCountChange(order.id, parseInt(e.target.value, 10) || 1)}
          />
          <button
            type="button"
            onClick={() => onPrintLabels(order.id)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            🖨 Labels
          </button>
        </div>
      </div>
    </div>
  )
}
