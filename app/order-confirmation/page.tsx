'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, Download, Home, Package } from 'lucide-react'
import { OrderManager, type Order } from '@/lib/cart'
import { downloadReceipt } from '@/lib/utils/receipt-generator'
import MysticalPiecesWord from '@/components/ui/MysticalPiecesWord'

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [orderId, setOrderId] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get order ID from URL params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('orderId')
      if (id) {
        setOrderId(id)
        const foundOrder = OrderManager.getOrderById(id)
        setOrder(foundOrder || null)
      }
    }
  }, [])

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !order) return
    
    setIsDownloading(true)
    try {
      await downloadReceipt(receiptRef.current, order.id, {
        width: 800,
        backgroundColor: '#ffffff'
      })
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert('Failed to download receipt. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-unified">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-850 dark:text-primary-50 mb-4">Order Not Found</h1>
          <p className="text-primary-300 dark:text-primary-400 mb-8">We couldn't find an order with that ID.</p>
          <Link href="/products/shirts" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-unified py-20 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="flex justify-center mb-8 print:hidden"
        >
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-neutral-850 dark:text-white" />
          </div>
        </motion.div>

        {/* Confirmation Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12 print:mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-850 dark:text-primary-50 mb-4 print:text-gray-900">
            Order Confirmed!
          </h1>
          <p className="text-xl text-primary-200 dark:text-primary-300 print:text-gray-600">
            Thank you for your order. We've received your order and will process it shortly.
          </p>
        </motion.div>

        {/* Order Receipt */}
        <motion.div
          ref={receiptRef}
          data-receipt
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-2xl p-8 mx-auto max-w-2xl receipt-container"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937'
          }}
        >
          {/* Receipt Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ letterSpacing: '0.5px' }}>
                <MysticalPiecesWord />
              </h1>
              <p className="text-gray-600 text-sm">Mystical Thrift Fashion & Soulful Style Curators</p>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="text-left">
                <p className="font-semibold text-gray-900">Order Receipt</p>
                <p className="mt-1">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">Date</p>
                <p className="mt-1">
                  {new Date(order.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide text-sm">
              Customer Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="text-gray-900 font-medium">{order.customer.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="text-gray-900 font-medium">{order.customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="text-gray-900 font-medium text-xs">{order.customer.email}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-gray-600 text-xs mb-1">Delivery Address:</p>
                <p className="text-gray-900 font-medium text-sm">
                  {order.customer.address.street}<br />
                  {order.customer.address.city}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide text-sm">
              Items Ordered
            </h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
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
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 font-semibold text-sm mb-1">{item.name}</h4>
                      <p className="text-gray-500 text-xs mb-1">SKU: {item.sku}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        {item.size && <span>Size: <strong>{item.size}</strong></span>}
                        {item.color && <span>Color: <strong>{item.color}</strong></span>}
                        <span>Qty: <strong>{item.quantity}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-gray-900 font-bold text-base">
                      UGX {(item.price * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      UGX {item.price.toLocaleString()} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">UGX {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="text-gray-900 font-medium">
                  {order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="pt-3 border-t-2 border-gray-300 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 uppercase tracking-wide">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    UGX {order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Notes */}
          {order.notes && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Special Instructions</h3>
              <p className="text-gray-700 text-sm">{order.notes}</p>
            </div>
          )}

          {/* Payment Notice */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center mb-6">
            <p className="text-amber-900 font-semibold text-sm mb-1">
              💳 Payment Method: Cash on Delivery
            </p>
            <p className="text-amber-700 text-xs">
              Expected delivery within 2-3 business days
            </p>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 border-t-2 border-gray-200">
            <p className="text-gray-600 text-xs mb-2">
              Thank you for shopping with <MysticalPiecesWord />!
            </p>
            <div className="text-gray-500 text-xs space-y-1">
              <p>Email: jerrylarubafestus@gmail.com</p>
              <p>Phone: +256 755 915 549</p>
              <p className="mt-2">
                © {new Date().getFullYear()} <MysticalPiecesWord />. All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mt-12 print:hidden"
        >
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="btn btn-outline inline-flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>{isDownloading ? 'Downloading...' : 'Download Receipt'}</span>
          </button>
          <Link href="/products/shirts" className="btn btn-primary inline-flex items-center justify-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Continue Shopping</span>
          </Link>
          <Link href="/" className="btn btn-secondary inline-flex items-center justify-center space-x-2">
            <Home className="w-5 h-5" />
            <span>Go Home</span>
          </Link>
        </motion.div>
      </div>

      {/* Receipt Styles */}
      <style jsx global>{`
        .receipt-container {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        @media print {
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

