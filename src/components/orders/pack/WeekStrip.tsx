'use client'

import { addDays, cn, todayStr } from '@/lib/utils'

interface WeekStripProps {
  curWeekMon: string
  selDay: string
  dayHasOrders: (d: string) => boolean
  onSelectDay: (d: string) => void
}

export function WeekStrip({ curWeekMon, selDay, dayHasOrders, onSelectDay }: WeekStripProps) {
  const today = todayStr()
  const pills = []
  // Mon–Sat (6 days), same as V1 — curWeekMon must be the Monday of the visible week (local dates)
  for (let i = 0; i < 6; i++) {
    const d = addDays(curWeekMon, i)
    const dt = new Date(d + 'T00:00:00')
    const hasO = dayHasOrders(d)
    const isSel = d === selDay
    const isToday = d === today
    pills.push(
      <button
        key={d}
        type="button"
        onClick={() => onSelectDay(d)}
        className={cn(
          'relative min-w-[62px] rounded-[10px] border-[1.5px] px-3 py-2 text-center transition-colors',
          isSel
            ? 'border-green-600 bg-green-100 text-green-800'
            : 'border-gray-200 bg-white text-gray-500 hover:border-sky-500 hover:text-sky-600',
          isToday && !isSel && 'border-sky-500'
        )}
      >
        {hasO && !isSel && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
        )}
        <div className="text-[10px]">
          {dt.toLocaleDateString('en-AU', { weekday: 'short' })}
        </div>
        <div className="text-[15px] font-bold">{dt.getDate()}</div>
        <div className="text-[9px] text-gray-400">
          {dt.toLocaleDateString('en-AU', { month: 'short' })}
        </div>
      </button>
    )
  }

  const s = new Date(curWeekMon + 'T00:00:00')
  const e = new Date(addDays(curWeekMon, 5) + 'T00:00:00')
  const label = `${s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="flex flex-wrap gap-2">{pills}</div>
      <div className="w-full h-px bg-gray-100 sm:hidden" />
      <div className="text-sm font-bold text-gray-800 w-full text-center sm:text-left sm:w-auto sm:ml-4">{label}</div>
    </div>
  )
}
