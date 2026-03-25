'use client'

import type { Category, Customer, Order, Product } from '@/types'
import type { PackDriverGroup } from '@/lib/orders/packUtils'
import { groupTotalsByProductName } from '@/lib/orders/packUtils'
import { OrderPackRow } from './OrderPackRow'
import { cn } from '@/lib/utils'

interface DriverOrderGroupProps {
  group: PackDriverGroup
  customers: Customer[]
  products: Product[]
  categories: Category[]
  custProductMap: Map<string, Set<string>>
  onToggleChip: (orderId: string, productId: string, groupType: 'linen' | 'towel') => void
  onMarkPacked: (orderId: string) => void
  onUndoPack: (orderId: string) => void
  onEditOrder: (orderId: string) => void
  onLbClick: (orderId: string) => void
  onBagCountChange: (orderId: string, n: number) => void
  onPrintLabels: (orderId: string) => void
}

export function DriverOrderGroup({
  group,
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
}: DriverOrderGroupProps) {
  const allPacked = group.orders.every((o) => o.status !== 'pending')
  const packedCount = group.orders.filter((o) => o.status !== 'pending').length
  const pendingCount = group.orders.length - packedCount
  const progressStr = allPacked
    ? `${group.orders.length} orders · All packed ✓`
    : `${group.orders.length} orders · ${packedCount} packed ✓ ${pendingCount} pending`

  const totals = groupTotalsByProductName(group, customers, products, categories)
  const summaryStr = Object.entries(totals)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')

  const isTowel = group.type === 'towel'

  return (
    <div className="mb-6">
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-t-lg border px-4 py-3',
          isTowel ? 'bg-[#1e3a5f] border-gray-700' : 'bg-[#1e2235] border-gray-700',
          allPacked && (isTowel ? 'bg-green-800 border-green-600' : 'bg-green-700 border-green-500')
        )}
      >
        <span
          className={cn(
            'text-[11px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded',
            group.type === 'linen' ? 'bg-green-200 text-green-900' : 'bg-blue-200 text-blue-900'
          )}
        >
          {group.type.toUpperCase()}
        </span>
        <span className="text-sm font-bold text-white">
          {group.driverName}
          {group.vehicle ? ` — ${group.vehicle}` : ''}
        </span>
        <span
          className={cn(
            'text-[11px] font-mono whitespace-nowrap ml-auto',
            allPacked ? 'text-green-200 font-bold' : 'text-gray-400'
          )}
        >
          {progressStr}
        </span>
      </div>
      <div
        className={cn(
          'rounded-b-lg border border-t-0 overflow-hidden',
          allPacked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
        )}
      >
        <div className="px-4 py-2 text-[11px] text-gray-500 font-mono border-b border-gray-100 bg-gray-50">
          {summaryStr}
        </div>
        {group.orders.map((order, idx) => (
          <OrderPackRow
            key={`${order.id}-${group.type}`}
            index={idx}
            order={order}
            groupType={group.type}
            customers={customers}
            products={products}
            categories={categories}
            custProductMap={custProductMap}
            onToggleChip={onToggleChip}
            onMarkPacked={onMarkPacked}
            onUndoPack={onUndoPack}
            onEditOrder={onEditOrder}
            onLbClick={onLbClick}
            onBagCountChange={onBagCountChange}
            onPrintLabels={onPrintLabels}
          />
        ))}
      </div>
    </div>
  )
}
