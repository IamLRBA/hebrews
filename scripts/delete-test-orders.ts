/**
 * Script to delete all test orders from the database
 * 
 * Usage:
 *   npx ts-node --compiler-options {"module":"CommonJS"} scripts/delete-test-orders.ts
 * 
 * Or add to package.json:
 *   "delete-orders": "ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/delete-test-orders.ts"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllOrders() {
  try {
    console.log('Starting to delete all orders...')

    // First, delete all payments (they reference orders)
    const paymentsDeleted = await prisma.payment.deleteMany({})
    console.log(`Deleted ${paymentsDeleted.count} payment(s)`)

    // Then delete all order items (they cascade, but being explicit)
    const orderItemsDeleted = await prisma.orderItem.deleteMany({})
    console.log(`Deleted ${orderItemsDeleted.count} order item(s)`)

    // Finally, delete all orders
    const ordersDeleted = await prisma.order.deleteMany({})
    console.log(`Deleted ${ordersDeleted.count} order(s)`)

    console.log('\n✅ Successfully deleted all orders and related data!')
  } catch (error) {
    console.error('❌ Error deleting orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllOrders()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
