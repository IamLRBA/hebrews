export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  size?: string
  color?: string
  quantity: number
  image: string
  sku: string
}

export interface Order {
  id: string
  timestamp: string
  customer: {
    fullName: string
    email: string
    phone: string
    address: {
      street: string
      city: string
    }
  }
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  deliveryOption: 'kampala' | 'outside'
  notes?: string
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered'
}

export class CartManager {
  private static CART_KEY = 'fusioncraft_cart'
  
  static getCart(): CartItem[] {
    if (typeof window === 'undefined') return []
    const cartData = localStorage.getItem(this.CART_KEY)
    return cartData ? JSON.parse(cartData) : []
  }
  
  static addToCart(item: CartItem): void {
    const cart = this.getCart()
    const existingIndex = cart.findIndex(
      cartItem => 
        cartItem.productId === item.productId && 
        cartItem.size === item.size && 
        cartItem.color === item.color
    )
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += item.quantity
    } else {
      cart.push(item)
    }
    
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
  }
  
  static removeFromCart(index: number): void {
    const cart = this.getCart()
    cart.splice(index, 1)
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
  }
  
  static updateQuantity(index: number, quantity: number): void {
    const cart = this.getCart()
    if (quantity <= 0) {
      this.removeFromCart(index)
      return
    }
    cart[index].quantity = quantity
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart))
  }
  
  static clearCart(): void {
    localStorage.removeItem(this.CART_KEY)
  }
  
  static getCartTotal(): number {
    return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }
  
  static getCartCount(): number {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0)
  }
}

export class OrderManager {
  private static ORDERS_KEY = 'fusioncraft_orders'
  
  static createOrder(order: Omit<Order, 'id' | 'timestamp'>): Order {
    const newOrder: Order = {
      ...order,
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString()
    }
    
    const orders = this.getOrders()
    orders.push(newOrder)
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders))
    
    return newOrder
  }
  
  static getOrders(): Order[] {
    if (typeof window === 'undefined') return []
    const ordersData = localStorage.getItem(this.ORDERS_KEY)
    return ordersData ? JSON.parse(ordersData) : []
  }
  
  static getOrderById(id: string): Order | undefined {
    return this.getOrders().find(order => order.id === id)
  }
}

export function calculateDeliveryFee(deliveryOption: 'kampala' | 'outside', address?: string): number {
  if (deliveryOption === 'kampala') {
    return 0
  }
  
  // For outside Kampala, you could implement zone-based pricing
  // For now, returning a fixed fee
  return 15000 // UGX 15,000 for outside Kampala
}

// Kampala zones for free delivery
export const KAMPALA_ZONES = [
  'Kampala Central',
  'Kampala West',
  'Kampala East',
  'Kampala North',
  'Kampala South',
  'Makindye',
  'Nakawa',
  'Kawempe',
  'Rubaga'
]

export function isKampalaAddress(address: string): boolean {
  const lowercaseAddress = address.toLowerCase()
  return KAMPALA_ZONES.some(zone => lowercaseAddress.includes(zone.toLowerCase()))
}

