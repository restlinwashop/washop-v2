import type { Category, Customer, Driver, Order, OrderItem, Product } from '@/types'

export type PackGroupType = 'linen' | 'towel'

export interface PackDriverGroup {
  driverId: string
  driverName: string
  vehicle: string
  type: PackGroupType
  orders: Order[]
}

const PROD_SORT = [
  'laundry bag',
  'tea towel',
  'cleaning cloth',
  'glass cloth',
  'microfibre',
  'napkin',
  'table cloth',
  'bath sheet',
  'bath towel',
  'hand towel',
  'face washer',
  'gym towel',
  'nappy',
]

export function prodSortKey(name: string): number {
  const n = (name || '').toLowerCase()
  for (let i = 0; i < PROD_SORT.length; i++) {
    if (n.includes(PROD_SORT[i])) return i
  }
  return 999
}

export function catType(
  categories: Category[],
  catId: string
): PackGroupType {
  return categories.find((c) => c.id === catId)?.type === 'towel' ? 'towel' : 'linen'
}

export function prodType(
  products: Product[],
  categories: Category[],
  productId: string
): PackGroupType {
  const p = products.find((x) => x.id === productId)
  return p ? catType(categories, p.catId) : 'linen'
}

export function getOrderDriver(
  customer: Customer | undefined,
  deliveryDate: string
): { driverId: string | null; routeOrder: number; packOrder: number } {
  if (!customer) {
    return { driverId: null, routeOrder: 99, packOrder: 99 }
  }
  if (customer.dayDrivers && customer.dayDrivers.length) {
    const wd = new Date(deliveryDate + 'T00:00:00').getDay()
    const match = customer.dayDrivers.find((dd) => dd.day === wd)
    if (match) {
      return {
        driverId: match.driverId,
        routeOrder: match.routeOrder,
        packOrder: match.packOrder ?? 99,
      }
    }
  }
  return {
    driverId: customer.driverId,
    routeOrder: customer.routeOrder || 99,
    packOrder: 99,
  }
}

/** Whether the customer is “due” on this calendar date (V1 isCustomerDueOnDate) */
export function isCustomerDueOnDate(customer: Customer, dateStr: string): boolean {
  if (customer.nextDeliveryOverride) {
    return dateStr === customer.nextDeliveryOverride
  }
  const d = new Date(dateStr + 'T00:00:00')
  const wd = d.getDay()
  if (customer.frequency === 'Daily') return true
  if (customer.deliveryDays && customer.deliveryDays.length) {
    return customer.deliveryDays.some((d) => d === wd || String(d) === String(wd))
  }
  if (customer.frequency === '3x Week') return [1, 3, 5].includes(wd)
  if (customer.frequency === '2x Week') return [1, 4].includes(wd)
  return wd === parseInt(String(customer.dueDay || 4), 10)
}

/** Line items shown in an order row for a linen/towel group (V1 typeItems). */
export function typeItemsForOrderRow(
  order: Order,
  customer: Customer | undefined,
  groupType: PackGroupType,
  products: Product[],
  categories: Category[]
): OrderItem[] {
  const useAllItems = customer?.custType === 'linen' || customer?.custType === 'towel'
  const raw = useAllItems
    ? order.items
    : order.items.filter((it) => prodType(products, categories, it.productId) === groupType)
  return [...raw].sort((a, b) => prodSortKey(a.productName) - prodSortKey(b.productName))
}

function orderBelongsInCell(
  order: Order,
  customer: Customer | undefined,
  driverId: string,
  groupType: PackGroupType,
  products: Product[],
  categories: Category[],
  allDriverIds: string[]
): boolean {
  const rawDid = order.driverId || customer?.driverId || '__none__'
  const oDid = allDriverIds.includes(rawDid) ? rawDid : '__none__'
  if (oDid !== driverId) return false
  if (order.note === 'PU Only') return groupType === 'linen'
  if (customer?.custType === 'linen') return groupType === 'linen'
  if (customer?.custType === 'towel') return groupType === 'towel'
  if (customer?.custType === 'both') {
    return order.items.some((it) => prodType(products, categories, it.productId) === groupType)
  }
  return order.items.some((it) => prodType(products, categories, it.productId) === groupType)
}

/**
 * Build driver × linen/towel groups for a single delivery day (V1 _renderOrdersInner).
 */
export function buildPackDriverGroups(
  dayOrders: Order[],
  customers: Customer[],
  drivers: Driver[],
  products: Product[],
  categories: Category[],
  driverFilterAll: boolean,
  selectedDriverId: string
): PackDriverGroup[] {
  const custMap = new Map(customers.map((c) => [c.id, c]))
  const driverOrder = drivers.map((d) => d.id)
  const allDriverIds = [...driverOrder, '__none__']

  const groups: PackDriverGroup[] = []

  for (const did of allDriverIds) {
    if (!driverFilterAll && did !== selectedDriverId) continue

    for (const type of ['linen', 'towel'] as const) {
      const drv = drivers.find((d) => d.id === did)
      const orders = dayOrders
        .filter((o) => {
          const c = custMap.get(o.customerId)
          return orderBelongsInCell(o, c, did, type, products, categories, allDriverIds)
        })
        .sort((a, b) => {
          const ca = custMap.get(a.customerId)
          const cb = custMap.get(b.customerId)
          const ra = getOrderDriver(ca, a.deliveryDate).packOrder
          const rb = getOrderDriver(cb, b.deliveryDate).packOrder
          return ra - rb
        })

      if (orders.length === 0) continue

      groups.push({
        driverId: did,
        driverName: drv ? drv.name : 'Unassigned',
        vehicle: drv?.vehicle || '',
        type,
        orders,
      })
    }
  }

  return groups
}

export function laundryBagQty(order: Order): number {
  return order.items
    .filter((it) => /laundry bag/i.test(it.productName))
    .reduce((s, it) => s + (it.qty || 0), 0)
}

export function groupTotalsByProductName(
  groups: PackDriverGroup,
  customers: Customer[],
  products: Product[],
  categories: Category[]
): Record<string, number> {
  const totals: Record<string, number> = {}
  const custMap = new Map(customers.map((c) => [c.id, c]))

  for (const o of groups.orders) {
    const c = custMap.get(o.customerId)
    const useAllItems = c?.custType === 'linen' || c?.custType === 'towel'
    const items = useAllItems
      ? o.items
      : o.items.filter(
          (it) => prodType(products, categories, it.productId) === groups.type
        )
    for (const it of items) {
      totals[it.productName] = (totals[it.productName] || 0) + it.qty
    }
  }
  return totals
}

export function renderOrderProdSummary(
  orders: Order[],
  products: Product[],
  categories: Category[]
): { productName: string; total: number; done: number; type: PackGroupType }[] {
  const tot: Record<string, number> = {}
  const done: Record<string, number> = {}
  const prodInfo: Record<string, PackGroupType> = {}

  for (const o of orders) {
    for (const it of o.items) {
      tot[it.productName] = (tot[it.productName] || 0) + it.qty
      if (!prodInfo[it.productName]) {
        prodInfo[it.productName] = prodType(products, categories, it.productId)
      }
    }
  }

  for (const o of orders) {
    for (const it of o.items) {
      if (o.status === 'packed' || o.status === 'delivered') {
        done[it.productName] = (done[it.productName] || 0) + it.qty
      } else if (o.checkedItems) {
        const ck =
          o.checkedItems[it.productId + 'linen'] ||
          o.checkedItems[it.productId + 'towel'] ||
          o.checkedItems[it.productId + 'both']
        if (ck) done[it.productName] = (done[it.productName] || 0) + it.qty
      }
    }
  }

  return Object.keys(tot).map((k) => ({
    productName: k,
    total: tot[k],
    done: done[k] || 0,
    type: prodInfo[k] || 'linen',
  }))
}
