import { Card, CardTitle } from '@/components/ui/Card'

export default function AdminPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black text-gray-800">Admin</h1>
      <Card>
        <CardTitle>Settings &amp; Administration</CardTitle>
        <p className="text-sm text-gray-500">Admin module coming soon.</p>
      </Card>
    </div>
  )
}
