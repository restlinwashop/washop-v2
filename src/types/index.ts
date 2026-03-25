// ─── Core domain types ───────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'packed' | 'dispatched' | 'delivered'
export type CustomerFrequency =
  | 'Daily'
  | '3x Week'
  | '2x Week'
  | 'Weekly'
  | 'Fortnightly'
  | 'Monthly'
  | 'On Demand'

/** Matches DB / V1: linen, towel, both (split by product), or unset */
export type CustomerType = 'linen' | 'towel' | 'both' | null

export interface DayDriverEntry {
  day: number
  driverId: string | null
  routeOrder: number
  packOrder?: number
}

export interface Customer {
  id: string
  name: string
  address: string
  frequency: CustomerFrequency
  dueDay: number
  email: string
  phone: string
  notes: string
  active: boolean
  driverId: string | null
  routeOrder: number
  custType: CustomerType
  recvNote: string
  nextDeliveryOverride: string | null
  deliveryDays: number[]
  dayDrivers: DayDriverEntry[] | null
  fixedOrder: boolean
  fixedQtys: Record<string, number>
  skipReturn: boolean
}

export interface Category {
  id: string
  name: string
  type: 'linen' | 'towel'
}

export interface Product {
  id: string
  name: string
  catId: string
  trackStock: boolean
  sortOrder: number
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  catId: string
  qty: number
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  driverId: string | null
  routeOrder: number
  deliveryDate: string        // YYYY-MM-DD
  status: OrderStatus
  note: string
  items: OrderItem[]
  bagCount: number
  isManual: boolean
  checkedItems: Record<string, boolean>
  bagsCollected: number
}

export interface Driver {
  id: string
  name: string
  vehicle: string
  pin: string
  phone: string
  workDays: number[]
  active: boolean
}

export interface OpTransfer {
  id: string
  date: string               // YYYY-MM-DD
  time: string               // HH:MM
  productId: string
  productName: string
  qty: number
  note: string
}

export interface ReceivingEntry {
  id: string
  date: string
  customerId: string
  customerName: string
  productId: string
  productName: string
  catId: string
  qty: number
}

/** One line in receiving_log_items / embedded in receiving log UI */
export interface ReceivingLogLine {
  productId: string
  productName: string
  catId: string
  qty: number
}

/** receiving_log + items (V1 S.receivingLog shape) */
export interface ReceivingLogEntry {
  id: string
  customerId: string
  customerName: string
  deliveryDate: string
  receivedOn: string
  time: string
  items: ReceivingLogLine[]
}

export interface ReceivingLogRow {
  id: string
  customer_id: string
  customer_name: string
  delivery_date: string
  received_on: string
  time: string | null
}

export interface ReceivingLogItemRow {
  id: string
  log_id: string
  product_id: string
  product_name: string
  cat_id: string | null
  qty: number
}

// ─── Supabase row types (snake_case from DB) ─────────────────────────────────

export interface OrderRow {
  id: string
  customer_id: string
  customer_name: string
  driver_id: string | null
  route_order: number | null
  delivery_date: string
  status: string
  note: string | null
  bag_count: number | null
  is_manual: boolean | null
  checked_items: Record<string, boolean> | null
  bags_collected: number | null
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  cat_id: string | null
  qty: number
}

export interface CustomerRow {
  id: string
  name: string
  address: string | null
  frequency: string | null
  due_day: number | null
  delivery_days: string | null
  day_drivers: string | null
  cust_type: string | null
  next_delivery_override: string | null
  email: string | null
  phone: string | null
  notes: string | null
  recv_note: string | null
  access_code: string | null
  active: number | boolean | null
  driver_id: string | null
  route_order: number | null
  fixed_order: boolean | null
  fixed_qtys: unknown
  skip_return: boolean | null
}

export interface DriverRow {
  id: string
  name: string
  vehicle: string | null
  pin: string | null
  phone: string | null
  work_days: string | null
}

export interface ProductRow {
  id: string
  name: string
  cat_id: string
  track_stock: boolean | null
}

export interface CategoryRow {
  id: string
  name: string
  type: string | null
}

export interface CustProductRow {
  cust_id: string
  product_id: string
}
