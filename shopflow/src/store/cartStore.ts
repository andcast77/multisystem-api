import { create } from 'zustand'
import type { Product } from '@prisma/client'

export interface CartItem {
  product: Pick<Product, 'id' | 'name' | 'price' | 'sku' | 'stock'>
  quantity: number
  discount: number
}

interface CartStore {
  items: CartItem[]
  customerId: string | null
  discount: number
  addItem: (product: CartItem['product'], quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateDiscount: (productId: string, discount: number) => void
  setGlobalDiscount: (discount: number) => void
  setCustomer: (customerId: string | null) => void
  clearCart: () => void
  getSubtotal: () => number
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerId: null,
  discount: 0,

  addItem: (product, quantity = 1) => {
    const { items } = get()
    const existingItem = items.find((item) => item.product.id === product.id)

    if (existingItem) {
      // Update quantity if item already exists
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      })
    } else {
      // Add new item
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            discount: 0,
          },
        ],
      })
    }
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.product.id !== productId),
    })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set({
      items: get().items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    })
  },

  updateDiscount: (productId, discount) => {
    set({
      items: get().items.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, discount) }
          : item
      ),
    })
  },

  setGlobalDiscount: (discount) => {
    set({ discount: Math.max(0, discount) })
  },

  setCustomer: (customerId) => {
    set({ customerId })
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      discount: 0,
    })
  },

  getSubtotal: () => {
    const { items, discount: globalDiscount } = get()
    const itemsTotal = items.reduce(
      (sum, item) =>
        sum + (item.product.price * item.quantity - item.discount),
      0
    )
    return itemsTotal - globalDiscount
  },

  getTotal: () => {
    return get().getSubtotal()
  },
}))

