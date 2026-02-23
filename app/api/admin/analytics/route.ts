import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { assertStaffRole } from '@/lib/domain/role-guard'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)
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

      async function getFoodDrinksRevenueCustom(gte: Date, lt?: Date) {
        const where: { order: { status: string; createdAt: { gte: Date; lte?: Date; lt?: Date } } } = {
          order: { status: 'served', createdAt: { gte } },
        }
        if (lt) where.order.createdAt.lt = lt
        else where.order.createdAt.lte = customEnd
        const items = await prisma.orderItem.findMany({
          where,
          select: { lineTotalUgx: true, product: { select: { category: true } } },
        })
        let food = 0
        let drinks = 0
        for (const item of items) {
          const amt = Number(item.lineTotalUgx)
          const cat = (item.product as { category?: string | null }).category
          if (cat === 'Food') food += amt
          else if (cat === 'Drinks') drinks += amt
        }
        return { foodRevenue: food, drinksRevenue: drinks }
      }
      const customFoodDrinks = await getFoodDrinksRevenueCustom(customStart)

      const topFoodProductsCustom = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { status: 'served', createdAt: customRange },
          product: { category: 'Food' },
        },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      })
      const topDrinksProductsCustom = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { status: 'served', createdAt: customRange },
          product: { category: 'Drinks' },
        },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      })
      const foodDetails = await prisma.product.findMany({
        where: { id: { in: topFoodProductsCustom.map((p) => p.productId) } },
        select: { id: true, name: true },
      })
      const drinksDetails = await prisma.product.findMany({
        where: { id: { in: topDrinksProductsCustom.map((p) => p.productId) } },
        select: { id: true, name: true },
      })
      const topFoodProductsCustomWithNames = topFoodProductsCustom.map((item) => {
        const product = foodDetails.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          quantity: item._sum.quantity || 0,
          orderCount: item._count.id || 0,
        }
      })
      const topDrinksProductsCustomWithNames = topDrinksProductsCustom.map((item) => {
        const product = drinksDetails.find((p) => p.id === item.productId)
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          quantity: item._sum.quantity || 0,
          orderCount: item._count.id || 0,
        }
      })

      // Revenue trends for custom range (daily breakdown) with Food/Drinks
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
        const dayFoodDrinks = await getFoodDrinksRevenueCustom(date, nextDate)

        revenueTrends.push({
          date: date.toISOString().split('T')[0],
          revenue: dayPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          foodRevenue: dayFoodDrinks.foodRevenue,
          drinksRevenue: dayFoodDrinks.drinksRevenue,
        })
      }

      return NextResponse.json({
        daily: {
          revenue: dailyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          foodRevenue: customFoodDrinks.foodRevenue,
          drinksRevenue: customFoodDrinks.drinksRevenue,
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        weekly: {
          revenue: weeklyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          foodRevenue: customFoodDrinks.foodRevenue,
          drinksRevenue: customFoodDrinks.drinksRevenue,
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        monthly: {
          revenue: monthlyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
          foodRevenue: customFoodDrinks.foodRevenue,
          drinksRevenue: customFoodDrinks.drinksRevenue,
          orders: await prisma.order.count({
            where: { status: 'served', createdAt: customRange },
          }),
        },
        topProducts: topProductsWithNames,
        topFoodProducts: topFoodProductsCustomWithNames,
        topDrinksProducts: topDrinksProductsCustomWithNames,
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

    // Food vs Drinks revenue (order item totals by product category for served orders in range)
    async function getFoodDrinksRevenue(gte: Date, lt?: Date) {
      const where: { order: { status: string; createdAt: { gte: Date; lt?: Date } } } = {
        order: { status: 'served', createdAt: { gte } },
      }
      if (lt) where.order.createdAt.lt = lt
      const items = await prisma.orderItem.findMany({
        where,
        select: { lineTotalUgx: true, product: { select: { category: true } } },
      })
      let food = 0
      let drinks = 0
      for (const item of items) {
        const amt = Number(item.lineTotalUgx)
        const cat = (item.product as { category?: string | null }).category
        if (cat === 'Food') food += amt
        else if (cat === 'Drinks') drinks += amt
      }
      return { foodRevenue: food, drinksRevenue: drinks }
    }
    const [dailyFoodDrinks, weeklyFoodDrinks, monthlyFoodDrinks] = await Promise.all([
      getFoodDrinksRevenue(todayStart),
      getFoodDrinksRevenue(weekStart),
      getFoodDrinksRevenue(monthStart),
    ])

    // Top products by category (Food and Drinks separately)
    const topFoodProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { status: 'served', createdAt: { gte: monthStart } },
        product: { category: 'Food' },
      },
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })
    const topDrinksProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { status: 'served', createdAt: { gte: monthStart } },
        product: { category: 'Drinks' },
      },
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })
    const foodProductDetails = await prisma.product.findMany({
      where: { id: { in: topFoodProductsRaw.map((p) => p.productId) } },
      select: { id: true, name: true },
    })
    const drinksProductDetails = await prisma.product.findMany({
      where: { id: { in: topDrinksProductsRaw.map((p) => p.productId) } },
      select: { id: true, name: true },
    })
    const topFoodProducts = topFoodProductsRaw.map((item) => {
      const product = foodProductDetails.find((p) => p.id === item.productId)
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        quantity: item._sum.quantity || 0,
        orderCount: item._count.id || 0,
      }
    })
    const topDrinksProducts = topDrinksProductsRaw.map((item) => {
      const product = drinksProductDetails.find((p) => p.id === item.productId)
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        quantity: item._sum.quantity || 0,
        orderCount: item._count.id || 0,
      }
    })

    // Revenue trends (last 7 days) with Food and Drinks
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
      const dayFoodDrinks = await getFoodDrinksRevenue(date, nextDate)

      revenueTrends.push({
        date: date.toISOString().split('T')[0],
        revenue: dayPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        foodRevenue: dayFoodDrinks.foodRevenue,
        drinksRevenue: dayFoodDrinks.drinksRevenue,
      })
    }

    return NextResponse.json({
      daily: {
        revenue: dailyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        foodRevenue: dailyFoodDrinks.foodRevenue,
        drinksRevenue: dailyFoodDrinks.drinksRevenue,
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: todayStart } },
        }),
      },
      weekly: {
        revenue: weeklyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        foodRevenue: weeklyFoodDrinks.foodRevenue,
        drinksRevenue: weeklyFoodDrinks.drinksRevenue,
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: weekStart } },
        }),
      },
      monthly: {
        revenue: monthlyPayments.reduce((sum, p) => sum + Number(p.amountUgx), 0),
        foodRevenue: monthlyFoodDrinks.foodRevenue,
        drinksRevenue: monthlyFoodDrinks.drinksRevenue,
        orders: await prisma.order.count({
          where: { status: 'served', createdAt: { gte: monthStart } },
        }),
      },
      topProducts: topProductsWithNames,
      topFoodProducts,
      topDrinksProducts,
      salesByMethod,
      revenueTrends,
    })
  } catch (error: unknown) {
    console.error('[admin/analytics] Error:', error)
    const err = error as { name?: string }
    if (err.name === 'UnauthorizedError' || err.name === 'InvalidTokenError') {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
