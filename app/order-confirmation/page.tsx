'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, Printer, Home, Package } from 'lucide-react'
import { OrderManager, type Order } from '@/lib/cart'

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [orderId, setOrderId] = useState<string>('')

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

  const handlePrint = () => {
    window.print()
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900/20 via-primary-900 to-accent-900/20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Order Not Found</h1>
          <p className="text-primary-300 mb-8">We couldn't find an order with that ID.</p>
          <Link href="/products/shirts" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900/20 via-primary-900 to-accent-900/20 py-20 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="flex justify-center mb-8 print:hidden"
        >
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Confirmation Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12 print:mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 print:text-gray-900">
            Order Confirmed!
          </h1>
          <p className="text-xl text-primary-200 print:text-gray-600">
            Thank you for your order. We've received your order and will process it shortly.
          </p>
        </motion.div>

        {/* Order Receipt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary-800/30 rounded-xl border border-primary-500/30 p-8 print:bg-white print:border-gray-300 print:p-6"
        >
          {/* Order Header */}
          <div className="border-b border-primary-700/50 pb-6 mb-6 print:border-gray-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-primary-300 text-sm print:text-gray-600">Order Number</p>
                <p className="text-2xl font-bold text-white print:text-gray-900">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-primary-300 text-sm print:text-gray-600">Order Date</p>
                <p className="text-white font-medium print:text-gray-900">
                  {new Date(order.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <p className="text-primary-400 text-sm print:text-gray-600">
              Status: <span className="font-bold text-primary-300 print:text-gray-900">{order.status.toUpperCase()}</span>
            </p>
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 print:text-gray-900">
              <Package className="w-5 h-5 inline mr-2" />
              Delivery Information
            </h2>
            <div className="bg-primary-900/30 rounded-lg p-4 print:bg-gray-50">
              <p className="text-white print:text-gray-900">
                <strong>Full Name:</strong> {order.customer.fullName}
              </p>
              <p className="text-white mt-2 print:text-gray-900">
                <strong>Email:</strong> {order.customer.email}
              </p>
              <p className="text-white mt-2 print:text-gray-900">
                <strong>Phone:</strong> {order.customer.phone}
              </p>
              <p className="text-white mt-2 print:text-gray-900">
                <strong>Address:</strong> {order.customer.address.street}, {order.customer.address.city}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 print:text-gray-900">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start justify-between pb-4 border-b border-primary-700/50 print:border-gray-200">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-16 h-16 bg-primary-900/20 rounded-lg overflow-hidden flex-shrink-0 print:bg-gray-100 print:border print:border-gray-300">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium print:text-gray-900">{item.name}</h3>
                      <p className="text-primary-300 text-sm print:text-gray-600">{item.sku}</p>
                      {item.size && <p className="text-primary-400 text-sm print:text-gray-600">Size: {item.size}</p>}
                      {item.color && <p className="text-primary-400 text-sm print:text-gray-600">Color: {item.color}</p>}
                      <p className="text-primary-200 text-sm mt-1 print:text-gray-700">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold print:text-gray-900">
                      UGX {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-primary-900/30 rounded-lg p-4 mb-6 print:bg-gray-50">
            <div className="flex justify-between text-primary-200 mb-2 print:text-gray-700">
              <span>Subtotal</span>
              <span>UGX {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-primary-200 mb-2 print:text-gray-700">
              <span>Delivery Fee</span>
              <span>{order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-primary-700/50 print:border-gray-300">
              <span className="text-xl font-bold text-white print:text-gray-900">Total</span>
              <span className="text-2xl font-bold text-primary-400 print:text-gray-900">
                UGX {order.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Delivery Notes */}
          {order.notes && (
            <div className="mb-6">
              <h3 className="text-white font-medium mb-2 print:text-gray-900">Special Instructions</h3>
              <p className="text-primary-200 text-sm print:text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Payment Notice */}
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 text-center print:bg-yellow-50 print:border-yellow-300">
            <p className="text-white font-medium print:text-yellow-900">
              💳 Payment will be collected on delivery
            </p>
            <p className="text-primary-200 text-sm mt-2 print:text-yellow-700">
              Expected delivery within 2-3 business days
            </p>
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
            onClick={handlePrint}
            className="btn btn-outline inline-flex items-center justify-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Print Receipt</span>
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

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:text-gray-900 {
            color: #111827 !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:border-gray-200 {
            border-color: #e5e7eb !important;
          }
          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:text-yellow-900 {
            color: #78350f !important;
          }
          .print\\:text-yellow-700 {
            color: #a16207 !important;
          }
          .print\\:border-yellow-300 {
            border-color: #fde68a !important;
          }
        }
      `}</style>
    </div>
  )
}

