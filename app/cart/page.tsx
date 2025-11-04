'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react'
import { CartManager, type CartItem } from '@/lib/cart'

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const loadCart = () => {
      setCart(CartManager.getCart())
    }
    
    loadCart()
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart()
    }
    
    window.addEventListener('storage', handleCartUpdate)
    window.addEventListener('cartUpdated', handleCartUpdate)
    
    // Poll for updates
    const interval = setInterval(loadCart, 500)
    
    return () => {
      window.removeEventListener('storage', handleCartUpdate)
      window.removeEventListener('cartUpdated', handleCartUpdate)
      clearInterval(interval)
    }
  }, [])

  // Quantity update is removed since each product is a single piece
  // Quantity is always 1 and cannot be changed

  const removeItem = (index: number) => {
    setIsUpdating(true)
    CartManager.removeFromCart(index)
    setCart(CartManager.getCart())
    
    setTimeout(() => setIsUpdating(false), 200)
  }

  const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      setIsUpdating(true)
      CartManager.clearCart()
      setCart([])
      
      setTimeout(() => setIsUpdating(false), 200)
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900/20 via-primary-900 to-accent-900/20 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/sections/fashion" className="inline-flex items-center space-x-2 text-primary-300 hover:text-primary-100 transition-colors duration-300 mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Continue Shopping</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Shopping Cart</h1>
              <p className="text-primary-200">
                {cart.length === 0 
                  ? 'Your cart is empty' 
                  : `${cart.length} ${cart.length === 1 ? 'item' : 'items'} in your cart`
                }
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200"
              >
                Clear Cart
              </button>
            )}
          </div>
        </motion.div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <ShoppingCart className="w-24 h-24 mx-auto text-primary-400/30 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
            <p className="text-primary-300 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link 
              href="/sections/fashion"
              className="inline-block btn btn-primary"
            >
              Start Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="md:col-span-2 space-y-4">
              {cart.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-primary-800/30 rounded-xl border border-primary-500/30 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-6">
                    {/* Product Image */}
                    <div className="w-full sm:w-32 h-32 bg-primary-900/20 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image || '/assets/images/placeholder.jpg'} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/assets/images/placeholder.jpg'
                        }}
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{item.name}</h3>
                      <p className="text-primary-300 text-sm mb-2">SKU: {item.sku}</p>
                      {item.size && (
                        <p className="text-primary-400 text-sm mb-1">Size: {item.size}</p>
                      )}
                      {item.color && (
                        <p className="text-primary-400 text-sm mb-3">Color: {item.color}</p>
                      )}
                      
                      {/* Remove Button - Quantity is always 1 for single pieces */}
                      <div className="flex items-center space-x-4">
                        <div className="px-3 py-2 bg-primary-900/30 rounded-lg border border-primary-600/30">
                          <span className="text-primary-200 text-sm">Single Piece</span>
                        </div>

                        <button
                          onClick={() => removeItem(index)}
                          disabled={isUpdating}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-400 mb-1">
                        UGX {item.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-primary-400 text-xs mt-1">
                        Single piece
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="md:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="sticky top-24 bg-primary-800/30 rounded-xl border border-primary-500/30 p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
                
                <div className="space-y-4 pb-6 border-b border-primary-700/50">
                  <div className="flex justify-between text-primary-200">
                    <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-medium">UGX {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-primary-200">
                    <span>Delivery</span>
                    <span className="text-primary-400">Calculated at checkout</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-6">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-3xl font-bold text-primary-400">
                    UGX {subtotal.toLocaleString()}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full py-4 rounded-lg font-bold text-lg text-center bg-primary-500 hover:bg-primary-600 text-white transition-all duration-200 mb-4"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/sections/fashion"
                  className="block w-full py-3 rounded-lg font-medium text-center bg-primary-800/50 hover:bg-primary-800/70 text-primary-200 transition-all duration-200"
                >
                  Continue Shopping
                </Link>

                <div className="mt-6 pt-6 border-t border-primary-700/50">
                  <div className="flex items-start space-x-3 text-sm text-primary-300">
                    <div className="flex-shrink-0 mt-1">
                      <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-primary-200 mb-1">Secure Checkout</p>
                      <p>Pay on delivery available. Your information is safe and secure.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

