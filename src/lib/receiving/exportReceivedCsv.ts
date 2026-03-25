import type { Category, ReceivingLogEntry } from '@/types'

export function exportReceivedCsv(
  entries: ReceivingLogEntry[],
  filterDate: string,
  categories: Category[]
): void {
  const rows: (string | number)[][] = [['Date', 'Customer', 'Product', 'Category', 'Qty', 'Delivery Date']]
  entries
    .filter((l) => l.receivedOn === filterDate)
    .forEach((l) => {
      ;(l.items ?? []).forEach((it) => {
        const cat = categories.find((c) => c.id === it.catId)
        rows.push([l.receivedOn, l.customerName, it.productName, cat?.name ?? '', it.qty, l.deliveryDate])
      })
    })
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = `received_${filterDate}.csv`
  a.click()
}
