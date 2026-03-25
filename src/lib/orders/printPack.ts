import type { Customer, Driver, Order } from '@/types'
import { fmtFullDate } from '@/lib/utils'
import { prodType } from '@/lib/orders/packUtils'
import type { Category } from '@/types'
import type { Product } from '@/types'

export function printOrderSheet(params: {
  selDay: string
  dayOrders: Order[]
  customers: Customer[]
  drivers: Driver[]
  products: Product[]
  categories: Category[]
}): void {
  const { selDay, dayOrders, customers, drivers, products, categories } = params
  if (!dayOrders.length) {
    window.alert('No orders for ' + selDay)
    return
  }
  const groups: Record<string, { name: string; orders: Order[] }> = {}
  for (const o of dayOrders) {
    const c = customers.find((x) => x.id === o.customerId)
    const cDriverId = c?.driverId || '__none__'
    const drv = drivers.find((d) => d.id === cDriverId)
    if (!groups[cDriverId]) {
      groups[cDriverId] = {
        name: drv ? `${drv.name} — ${drv.vehicle || ''}` : 'Unassigned',
        orders: [],
      }
    }
    groups[cDriverId].orders.push(o)
  }

  let body = `<!DOCTYPE html><html><head><style>
    body{font-family:sans-serif;padding:20px;font-size:13px}
    h1{font-size:18px;margin-bottom:4px}
    h2{font-size:14px;background:#1e2235;color:#fff;padding:8px 12px;border-radius:4px;margin-top:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    th,td{border:1px solid #ddd;padding:6px 10px}
    th{background:#f0f1f6;font-size:11px;text-transform:uppercase}
    .done{background:#f0fdf4}
    .linen{color:#15803d;font-weight:700}
    .towel{color:#1d4ed8;font-weight:700}
    @media print{button{display:none}}
  </style></head><body>
  <button onclick="window.print()" style="padding:8px 16px;margin-bottom:16px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print</button>
  <h1>Order Sheet — ${fmtFullDate(selDay)}</h1>
  <p style="color:#6b7280;font-size:11px">Generated: ${new Date().toLocaleString('en-AU')}</p>`

  for (const g of Object.values(groups)) {
    body += `<h2>🚗 ${g.name}</h2><table><thead><tr><th>#</th><th>Customer</th><th>Product</th><th>Type</th><th>Qty</th><th>Bags</th><th>Status</th></tr></thead><tbody>`
    const sorted = [...g.orders].sort((a, b) => (a.routeOrder || 99) - (b.routeOrder || 99))
    for (const o of sorted) {
      o.items.forEach((it, i) => {
        const t = prodType(products, categories, it.productId)
        body += `<tr class="${o.status === 'packed' ? 'done' : ''}">
          <td>${i === 0 ? String(o.routeOrder ?? '') : ''}</td>
          <td>${i === 0 ? `<strong>${o.customerName}</strong>` : ''}</td>
          <td>${it.productName}</td>
          <td class="${t}">${t}</td>
          <td><strong>${it.qty}</strong></td>
          <td>${i === 0 ? `${o.bagCount} bags` : ''}</td>
          <td>${i === 0 ? o.status.toUpperCase() : ''}</td>
        </tr>`
      })
    }
    body += '</tbody></table>'
  }
  body += '</body></html>'
  const w = window.open('', '_blank', 'width=780,height=900')
  if (w) {
    w.document.write(body)
    w.document.close()
  }
}

export function printLabels(order: Order, driverName: string): void {
  const w = window.open('', '_blank', 'width=420,height=520')
  if (!w) return
  const rows = Array.from({ length: order.bagCount }, (_, i) => i + 1)
    .map(
      (n) =>
        `<div style="border:2px solid #000;padding:14px;margin:10px 0;border-radius:4px">
      <div style="font-size:22px;font-weight:bold">${order.customerName}</div>
      <div>Delivery: ${order.deliveryDate}</div>
      <div style="font-size:12px;margin-top:6px">${order.items.map((x) => `${x.productName}: ${x.qty}`).join(' | ')}</div>
      <div style="font-size:13px;margin-top:4px">Bag ${n} of ${order.bagCount}</div>
    </div>`
    )
    .join('')
  w.document.write(`<!DOCTYPE html><html><body style="font-family:monospace;padding:20px">
    <h3>${order.customerName}</h3>
    <p>Delivery: ${order.deliveryDate} · Driver: ${driverName} · <b>${order.bagCount} bags</b></p>
    ${rows}
    <script>window.print();</script>
  </body></html>`)
  w.document.close()
}
