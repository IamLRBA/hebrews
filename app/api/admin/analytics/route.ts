import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertStaffRole } from '@/lib/domain/role-guard'

export async function GET(request: NextRequest) {
  try {
    const staffId = request.headers.get('x-staff-id')?.trim()
    if (!staffId) {
      return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
    }

    await assertStaffRole(staffId, ['admin'])

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'month'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const now = new Date()
    let todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    
    let weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    
    let monthStart = new Date(now)
    monthStart.setDate(monthStart.getDate() - 30)

    // Override with custom date range if provided
    if (startDateParam && endDateParam) {
      const customStart = new Date(startDateParam)
      customStart.setHours(0, 0, 0, 0)
      const customEnd = new Date(endDateParam)
      customEnd.setHours(23, 59, 59, 999)
      
      todayStart = customStart
      weekStart = customStart
      monthStart = customStart
      
      // Use custom range for all queries
      const customRange = { gte: customStart, lte: customEnd }
      
      // Update date filters to use custom range
      const dailyPayments = await prisma.payment.findMany({
        where: {
          createdAt: customRange,
          status: 'completed',
          order: { status: 'served' },
        },
        select: { amountUgx: true, method: true },
      })

      const monthlyPayments = dailyPayments // Same data for custom range
      const weeklyPayments = dailyPayments

      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: 'served',
            createdAt: customRange,
          },
        },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      })

      const productDetails = await prisma.product.findMany({
        where: {
          id: { in: topProducts.map((p) => p.productId) },
        },
        select: { id: true, name: true },
      })

      const topProductsWithNames = topProducts.map((item) => {
        const product = productDetails.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          quantity: item._sum.quantity || 0,
          orderCount: item._count.id || 0,
        }
      })

      const salesByMethod = {
        cash: monthlyPayments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + Number(p.amountUgx), 0),
        mtn_momo: monthlyPayments.filter((p) => p.method === 'mtn_momo').reduce((sum, p) => sum + Number(p.amountUgx), 0),
        airtel_money: monthlyPayments.filter((p) => p.method === 'airtel_money').reduce((sum, p) => sum + Number(p.amountUgx), 0),
        card: monthlyPayments.filter((p) => p.method === 'card').reduce((sum, p) => sum + Number(p.amountUgx), 0),
      }

      // Revenue trends for custom range (daily breakdown)
      const daysDiff = Math.ceil((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24))
      const revenueTrends = []
      for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
        const date = new Date(customStart)
        date.setDate(date.getDate() + i)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const dayPayments = await prisma.payment.findMany({
          where: {
            createdAt: { gte: date, lt: nextDate },
            status: 'completed',
            order: { status: 'served' },
          },
          select: { amountUgx: true },
        })

        revenueTrends.push({
          date: date.toISOString().split('T')[0],
          revenue: dayPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        })
      }

      return NextResponse.json({
        daily: {
          revenue: dailyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        weekly: {
          revenue: weeklyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        monthly: {
          revenue: monthlyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        topProducts: topProductsWithNames,
        salesByMethod,
        revenueTrends,
      })
    }

    // Use predefined ranges
    if (range === 'today') {
      monthStart = todayStart
      weekStart = todayStart
    } else if (range === 'week') {
      monthStart = weekStart
    }

    // Daily revenue
    const dailyPayments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: 'completed',
        order: { status: 'served' },
      },
      select: { amountUgx: true, method: true },
    })

    // Weekly revenue
    const weeklyPayments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: weekStart },
        status: 'completed',
        order: { status: 'served' },
      },
      select: { amountUgx: true, method: true },
    })

    // Monthly revenue
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: monthStart },
        status: 'completed',
        order: { status: 'served' },
      },
      select: { amountUgx: true, method: true },
    })

    // Top products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: 'served',
          createdAt: { gte: monthStart },
        },
      },
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })

    const productDetails = await prisma.product.findMany({
      where: {
        id: { in: topProducts.map((p) => p.productId) },
      },
      select: { id: true, name: true },
    })

    const topProductsWithNames = topProducts.map((item) => {
      const product = productDetails.find((p) => p.id === item.productId)
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        quantity: item._sum.quantity || 0,
        orderCount: item._count.id || 0,
      }
    })

    // Sales by payment method
    const salesByMethod = {
      cash: monthlyPayments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + Number(p.amountUgx), 0),
      mtn_momo: monthlyPayments.filter((p) => p.method === 'mtn_momo').reduce((sum, p) => sum + Number(p.amountUgx), 0),
      airtel_money: monthlyPayments.filter((p) => p.method === 'airtel_money').reduce((sum, p) => sum + Number(p.amountUgx), 0),
      card: monthlyPayments.filter((p) => p.method === 'card').reduce((sum, p) => sum + Number(p.amountUgx), 0),
    }

    // Revenue trends (last 7 days)
    const revenueTrends = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayPayments = await prisma.payment.findMany({
        where: {
          createdAt: { gte: date, lt: nextDate },
          status: 'completed',
          order: { status: 'served' },
        },
        select: { amountUgx: true },
      })

      revenueTrends.push({
        date: date.toISOString().split('T')[0],
        revenue: dayPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
      })
    }

    return NextResponse.json({
      daily: {
        revenue: dailyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: todayStart } },
        }),
      },
      weekly: {
        revenue: weeklyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: weekStart } },
        }),
      },
      monthly: {
        revenue: monthlyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: monthStart } },
        }),
      },
      topProducts: topProductsWithNames,
      salesByMethod,
      revenueTrends,
    })
  } catch (error) {
    console.error('[admin/analytics] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
