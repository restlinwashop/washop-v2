'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dash',      icon: '📊' },
  { href: '/orders',     label: 'Orders',    icon: '📦' },
  { href: '/operation',  label: 'Operation', icon: '🏭' },
  { href: '/receiving',  label: 'Receiving', icon: '📥' },
  { href: '/dispatch',   label: 'Dispatch',  icon: '🚚' },
  { href: '/driver',     label: 'Driver',    icon: '🧺' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-safe">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 text-xs font-semibold transition-colors',
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="mt-0.5">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
