/**
 * Permanent seed data for POS local development and production bootstrap.
 * Run with: npx prisma db seed
 *
 * Creates:
 * - 2 Staff (cashier, kitchen), active
 * - 2 Restaurant tables (T1, T2)
 * - 2 Products (Espresso, Croissant)
 *
 * POS login uses staff ID only (no password check); passwordHash is a placeholder.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Staff: POS uses staff id from localStorage; passwordHash not used by POS login
  const cashier = await prisma.staff.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      passwordHash: 'pos-session-only-no-password-check',
      fullName: 'POS Cashier',
      role: 'cashier',
      isActive: true,
    },
  })
  const kitchen = await prisma.staff.upsert({
    where: { username: 'kitchen' },
    update: {},
    create: {
      username: 'kitchen',
      passwordHash: 'pos-session-only-no-password-check',
      fullName: 'Kitchen Staff',
      role: 'kitchen',
      isActive: true,
    },
  })
  console.log('Seeded staff:', cashier.fullName, kitchen.fullName)

  // One active shift for cashier so POS can create orders without a "Start shift" UI
  const existingShift = await prisma.shift.findFirst({
    where: { staffId: cashier.id, endTime: null },
  })
  if (!existingShift) {
    await prisma.shift.create({
      data: {
        staffId: cashier.id,
        terminalId: 'TERM-1',
        startTime: new Date(),
        endTime: null,
      },
    })
    console.log('Seeded active shift for cashier (TERM-1)')
  }

  // Tables
  const t1 = await prisma.restaurantTable.upsert({
    where: { code: 'T1' },
    update: {},
    create: {
      code: 'T1',
      capacity: 4,
      status: 'available',
      isActive: true,
    },
  })
  const t2 = await prisma.restaurantTable.upsert({
    where: { code: 'T2' },
    update: {},
    create: {
      code: 'T2',
      capacity: 2,
      status: 'available',
      isActive: true,
    },
  })
  console.log('Seeded tables:', t1.code, t2.code)

  // Products (required: name, category, section, priceUgx)
  const espresso = await prisma.product.upsert({
    where: { sku: 'PROD-001' },
    update: {},
    create: {
      name: 'Espresso',
      category: 'Beverages',
      section: 'Coffee',
      sku: 'PROD-001',
      priceUgx: 5000,
      sizes: [],
      colors: [],
      images: [],
      stockQty: 100,
      isActive: true,
    },
  })
  const croissant = await prisma.product.upsert({
    where: { sku: 'PROD-002' },
    update: {},
    create: {
      name: 'Croissant',
      category: 'Food',
      section: 'Pastries',
      sku: 'PROD-002',
      priceUgx: 8000,
      sizes: [],
      colors: [],
      images: [],
      stockQty: 50,
      isActive: true,
    },
  })
  console.log('Seeded products:', espresso.name, croissant.name)
}

main()
  .then(() => {
    console.log('Seed completed.')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
