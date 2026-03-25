'use client'

import { useQuery } from '@tanstack/react-query'
import { useSupabase } from './useSupabase'
import { useAppStore } from '@/store'
import type {
  Category,
  CategoryRow,
  CustProductRow,
  Customer,
  CustomerRow,
  Driver,
  DriverRow,
  Product,
  ProductRow,
} from '@/types'

function mapCustomerRow(c: CustomerRow): Customer {
  let deliveryDays: number[]
  if (c.delivery_days) {
    try {
      const parsed = JSON.parse(c.delivery_days) as unknown
      deliveryDays = Array.isArray(parsed)
        ? (parsed as number[]).map((x) => Number(x))
        : [c.due_day ?? 4]
    } catch {
      deliveryDays = [c.due_day ?? 4]
    }
  } else {
    deliveryDays = [c.due_day ?? 4]
  }

  let dayDrivers = null
  if (c.day_drivers) {
    try {
      dayDrivers = JSON.parse(c.day_drivers)
    } catch {
      dayDrivers = null
    }
  }

  let fixedQtys: Record<string, number> = {}
  if (c.fixed_qtys != null) {
    try {
      if (typeof c.fixed_qtys === 'object' && !Array.isArray(c.fixed_qtys)) {
        fixedQtys = c.fixed_qtys as Record<string, number>
      } else {
        fixedQtys = JSON.parse(String(c.fixed_qtys))
      }
    } catch {
      fixedQtys = {}
    }
  }

  const rawCt = c.cust_type as string | null
  let custType: Customer['custType'] = null
  if (rawCt === 'mixed') custType = 'both'
  else if (rawCt === 'linen' || rawCt === 'towel' || rawCt === 'both') custType = rawCt

  return {
    id: c.id,
    name: c.name,
    address: c.address ?? '',
    frequency: (c.frequency as Customer['frequency']) || 'Weekly',
    dueDay: c.due_day ?? 4,
    deliveryDays,
    dayDrivers,
    custType,
    nextDeliveryOverride: c.next_delivery_override,
    email: c.email ?? '',
    phone: c.phone ?? '',
    notes: c.notes ?? '',
    recvNote: c.recv_note ?? '',
    active: c.active === 1 || c.active === true,
    driverId: c.driver_id,
    routeOrder: c.route_order ?? 99,
    fixedOrder: c.fixed_order ?? false,
    fixedQtys,
    skipReturn: c.skip_return ?? false,
  }
}

function mapDriverRow(d: DriverRow): Driver {
  let workDays: number[] = [1, 2, 3, 4, 5, 6]
  if (d.work_days) {
    try {
      workDays = JSON.parse(d.work_days)
    } catch {
      workDays = [1, 2, 3, 4, 5, 6]
    }
  }
  return {
    id: d.id,
    name: d.name,
    vehicle: d.vehicle ?? '',
    pin: d.pin ?? '',
    phone: d.phone ?? '',
    workDays,
    active: true,
  }
}

function mapProductRow(p: ProductRow): Product {
  return {
    id: p.id,
    name: p.name,
    catId: p.cat_id,
    trackStock: p.track_stock !== false,
    sortOrder: 0,
  }
}

function mapCategoryRow(c: CategoryRow): Category {
  return {
    id: c.id,
    name: c.name,
    type: c.type === 'towel' ? 'towel' : 'linen',
  }
}

export interface PackCatalog {
  customers: Customer[]
  drivers: Driver[]
  products: Product[]
  categories: Category[]
  /** cust_id -> Set of product_id */
  custProductMap: Map<string, Set<string>>
}

export function usePackCatalog() {
  const supabase = useSupabase()
  const setCustomers = useAppStore((s) => s.setCustomers)
  const setDrivers = useAppStore((s) => s.setDrivers)
  const setProducts = useAppStore((s) => s.setProducts)
  const setCategories = useAppStore((s) => s.setCategories)

  return useQuery({
    queryKey: ['pack-catalog'],
    queryFn: async (): Promise<PackCatalog> => {
      const [
        { data: custRows, error: e1 },
        { data: drvRows, error: e2 },
        { data: prodRows, error: e3 },
        { data: catRows, error: e4 },
        { data: cpRows, error: e5 },
      ] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('cust_products').select('cust_id,product_id'),
      ])

      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4
      if (e5) throw e5

      const customers = (custRows as CustomerRow[]).map(mapCustomerRow)
      const drivers = (drvRows as DriverRow[]).map(mapDriverRow)
      const products = (prodRows as ProductRow[]).map(mapProductRow)
      const categories = (catRows as CategoryRow[]).map(mapCategoryRow)

      const custProductMap = new Map<string, Set<string>>()
      for (const r of (cpRows ?? []) as CustProductRow[]) {
        if (!custProductMap.has(r.cust_id)) custProductMap.set(r.cust_id, new Set())
        custProductMap.get(r.cust_id)!.add(r.product_id)
      }
      for (const c of customers) {
        if (!custProductMap.has(c.id)) custProductMap.set(c.id, new Set())
      }

      setCustomers(customers)
      setDrivers(drivers)
      setProducts(products)
      setCategories(categories)

      return { customers, drivers, products, categories, custProductMap }
    },
    staleTime: 60_000,
  })
}
