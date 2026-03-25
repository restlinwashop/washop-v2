'use client'

import type { Driver, Order } from '@/types'
import { cn } from '@/lib/utils'

interface DriverFilterBarProps {
  selDay: string
  orders: Order[]
  drivers: Driver[]
  selDriverFilter: string | 'all'
  onChange: (id: string | 'all') => void
}

export function DriverFilterBar({
  selDay,
  orders,
  drivers,
  selDriverFilter,
  onChange,
}: DriverFilterBarProps) {
  const dayOrders = orders.filter((o) => o.deliveryDate === selDay)
  const driverIds = new Set<string>()
  dayOrders.forEach((o) => {
    driverIds.add(o.driverId || '__none__')
  })
  const activeDrivers = drivers.filter((d) => driverIds.has(d.id))
  const hasUnassigned = driverIds.has('__none__')
  const list: { id: string; name: string }[] = [
    ...activeDrivers.map((d) => ({ id: d.id, name: d.name })),
    ...(hasUnassigned ? [{ id: '__none__', name: 'Unassigned' }] : []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Driver</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={cn(
            'rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors',
            selDriverFilter === 'all'
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-gray-200 bg-white text-gray-700'
          )}
        >
          All
        </button>
        {list.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            className={cn(
              'rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors',
              selDriverFilter === d.id
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-200 bg-white text-gray-700'
            )}
          >
            {d.name}
          </button>
        ))}
      </div>
    </div>
  )
}
