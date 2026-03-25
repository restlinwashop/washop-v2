import { Card, CardTitle } from '@/components/ui/Card'
import { fmtDate, todayStr } from '@/lib/utils'

export default function DashboardPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-800">Dashboard</h1>
        <span className="text-sm text-gray-500">{fmtDate(todayStr())}</span>
      </div>
      <Card>
        <CardTitle>Today&apos;s Overview</CardTitle>
        <p className="text-sm text-gray-500">Dashboard widgets coming soon.</p>
      </Card>
    </div>
  )
}
