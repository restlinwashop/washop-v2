import { create } from 'zustand'
import type { Order, Customer, Product, Category, Driver, OpTransfer } from '@/types'

interface AppState {
  // Data
  orders: Order[]
  customers: Customer[]
  products: Product[]
  categories: Category[]
  drivers: Driver[]
  opTransfers: OpTransfer[]

  // Sync state
  lastSynced: Date | null
  isSyncing: boolean

  // Setters
  setOrders: (orders: Order[]) => void
  setCustomers: (customers: Customer[]) => void
  setProducts: (products: Product[]) => void
  setCategories: (categories: Category[]) => void
  setDrivers: (drivers: Driver[]) => void
  setOpTransfers: (transfers: OpTransfer[]) => void
  setIsSyncing: (v: boolean) => void
  setLastSynced: (d: Date) => void

  // Order mutations
  updateOrder: (id: string, patch: Partial<Order>) => void
  updateOrderItem: (orderId: string, productId: string, qty: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  orders: [],
  customers: [],
  products: [],
  categories: [],
  drivers: [],
  opTransfers: [],
  lastSynced: null,
  isSyncing: false,

  setOrders: (orders) => set({ orders }),
  setCustomers: (customers) => set({ customers }),
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setDrivers: (drivers) => set({ drivers }),
  setOpTransfers: (opTransfers) => set({ opTransfers }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSynced: (lastSynced) => set({ lastSynced }),

  updateOrder: (id, patch) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  updateOrderItem: (orderId, productId, qty) =>
    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id !== orderId) return o
        const items = o.items.map((it) =>
          it.productId === productId ? { ...it, qty } : it
        )
        return { ...o, items }
      }),
    })),
}))
