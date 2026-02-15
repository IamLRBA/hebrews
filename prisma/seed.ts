/**
 * Cafe Havilah & Pizzeria — POS seed data
 * Run with: npx prisma db seed
 *
 * Creates:
 * - Staff (admins, manager, supervisor, cashiers, bartenders, service)
 * - Restaurant tables (Booth I/II, T1–T17)
 * - Drinks menu (alcoholic & non-alcoholic)
 *
 * Default password for all staff: "password123"
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'password123'

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  // Staff (username = lowercase first name)
  const staffData = [
    { username: 'able', fullName: 'Able', role: 'admin' as const },
    { username: 'david', fullName: 'David', role: 'admin' as const },
    { username: 'linus', fullName: 'Linus', role: 'manager' as const },
    { username: 'ritah', fullName: 'Ritah', role: 'manager' as const }, // Supervisor
    { username: 'phiona', fullName: 'Phiona', role: 'cashier' as const },
    { username: 'evyone', fullName: 'Evyone', role: 'cashier' as const },
    { username: 'patricia', fullName: 'Patricia', role: 'cashier' as const },
    { username: 'emma', fullName: 'Emma', role: 'kitchen' as const }, // Bartender
    { username: 'kelvin', fullName: 'Kelvin', role: 'kitchen' as const }, // Bartender
    { username: 'fred', fullName: 'Fred', role: 'cashier' as const }, // Service
    { username: 'gift', fullName: 'Gift', role: 'cashier' as const },
    { username: 'sharon', fullName: 'Sharon', role: 'cashier' as const },
    { username: 'shinnah', fullName: 'Shinnah', role: 'cashier' as const },
    { username: 'aishah', fullName: 'Aishah', role: 'cashier' as const },
  ]

  for (const s of staffData) {
    await prisma.staff.upsert({
      where: { username: s.username },
      update: { passwordHash, fullName: s.fullName, role: s.role },
      create: {
        username: s.username,
        passwordHash,
        fullName: s.fullName,
        role: s.role,
        isActive: true,
      },
    })
  }
  console.log('Seeded staff:', staffData.map((s) => s.fullName).join(', '))

  // Tables (Booth I, Booth II, T1–T17)
  const tables = [
    { code: 'Booth I', capacity: 3 },
    { code: 'Booth II', capacity: 3 },
    { code: 'T1', capacity: 2 },
    { code: 'T2', capacity: 2 },
    { code: 'T3', capacity: 2 },
    { code: 'T4', capacity: 2 },
    { code: 'T5', capacity: 2 },
    { code: 'T6', capacity: 2 },
    { code: 'T7', capacity: 2 },
    { code: 'T8', capacity: 2 },
    { code: 'T9', capacity: 2 },
    { code: 'T10', capacity: 2 },
    { code: 'T14', capacity: 6 },
    { code: 'T16', capacity: 6 },
    { code: 'T17', capacity: 8 },
  ]
  for (const t of tables) {
    await prisma.restaurantTable.upsert({
      where: { code: t.code },
      update: { capacity: t.capacity },
      create: {
        code: t.code,
        capacity: t.capacity,
        status: 'available',
        isActive: true,
      },
    })
  }
  console.log('Seeded tables:', tables.map((t) => t.code).join(', '))

  const PLACEHOLDER_IMG = '/pos-images/placeholder.svg'

  // Food & Drinks menu (placeholder prices in UGX — owner to update)
  type ProductSeed = { sku: string; name: string; category: string; section: string; priceUgx: number; isHappyHour?: boolean }
  const products: ProductSeed[] = [
    // Food — Starters / Appetizers
    { sku: 'STARTER-001', name: 'Soup of the Day', category: 'Food', section: 'Starters / Appetizers', priceUgx: 8000 },
    { sku: 'STARTER-002', name: 'Garlic Bread', category: 'Food', section: 'Starters / Appetizers', priceUgx: 6000 },
    { sku: 'STARTER-003', name: 'Spring Rolls', category: 'Food', section: 'Starters / Appetizers', priceUgx: 10000 },
    { sku: 'STARTER-004', name: 'Bruschetta', category: 'Food', section: 'Starters / Appetizers', priceUgx: 9000 },
    { sku: 'STARTER-005', name: 'Chicken Wings', category: 'Food', section: 'Starters / Appetizers', priceUgx: 12000 },
    // Food — Salads
    { sku: 'SALAD-001', name: 'Caesar Salad', category: 'Food', section: 'Salads', priceUgx: 12000 },
    { sku: 'SALAD-002', name: 'Greek Salad', category: 'Food', section: 'Salads', priceUgx: 12000 },
    { sku: 'SALAD-003', name: 'House Salad', category: 'Food', section: 'Salads', priceUgx: 8000 },
    { sku: 'SALAD-004', name: 'Mediterranean Salad', category: 'Food', section: 'Salads', priceUgx: 14000 },
    // Food — Main Course
    { sku: 'MAIN-001', name: 'Grilled Chicken', category: 'Food', section: 'Main Course', priceUgx: 22000 },
    { sku: 'MAIN-002', name: 'Fish & Chips', category: 'Food', section: 'Main Course', priceUgx: 25000 },
    { sku: 'MAIN-003', name: 'Beef Steak', category: 'Food', section: 'Main Course', priceUgx: 35000 },
    { sku: 'MAIN-004', name: 'Spaghetti Bolognese', category: 'Food', section: 'Main Course', priceUgx: 18000 },
    { sku: 'MAIN-005', name: 'Chicken Curry', category: 'Food', section: 'Main Course', priceUgx: 20000 },
    // Food — Grill
    { sku: 'GRILL-001', name: 'Grilled Chicken', category: 'Food', section: 'Grill', priceUgx: 22000 },
    { sku: 'GRILL-002', name: 'Lamb Chops', category: 'Food', section: 'Grill', priceUgx: 38000 },
    { sku: 'GRILL-003', name: 'Mixed Grill', category: 'Food', section: 'Grill', priceUgx: 42000 },
    { sku: 'GRILL-004', name: 'Pork Chops', category: 'Food', section: 'Grill', priceUgx: 28000 },
    { sku: 'GRILL-005', name: 'Beef Skewers', category: 'Food', section: 'Grill', priceUgx: 30000 },
    // Food — Platters / Sharing
    { sku: 'PLAT-001', name: 'Sharing Platter', category: 'Food', section: 'Platters / Sharing', priceUgx: 55000 },
    { sku: 'PLAT-002', name: 'Cheese Board', category: 'Food', section: 'Platters / Sharing', priceUgx: 28000 },
    { sku: 'PLAT-003', name: 'Meat Platter', category: 'Food', section: 'Platters / Sharing', priceUgx: 60000 },
    // Food — Sides
    { sku: 'SIDE-001', name: 'Fries', category: 'Food', section: 'Sides', priceUgx: 5000 },
    { sku: 'SIDE-002', name: 'Rice', category: 'Food', section: 'Sides', priceUgx: 4000 },
    { sku: 'SIDE-003', name: 'Coleslaw', category: 'Food', section: 'Sides', priceUgx: 4000 },
    { sku: 'SIDE-004', name: 'Mashed Potato', category: 'Food', section: 'Sides', priceUgx: 5000 },
    { sku: 'SIDE-005', name: 'Vegetables', category: 'Food', section: 'Sides', priceUgx: 4500 },
    // Food — Desserts
    { sku: 'DESSERT-001', name: 'Chocolate Cake', category: 'Food', section: 'Desserts', priceUgx: 10000 },
    { sku: 'DESSERT-002', name: 'Ice Cream', category: 'Food', section: 'Desserts', priceUgx: 7000 },
    { sku: 'DESSERT-003', name: 'Fruit Salad', category: 'Food', section: 'Desserts', priceUgx: 8000 },
    { sku: 'DESSERT-004', name: 'Tiramisu', category: 'Food', section: 'Desserts', priceUgx: 12000 },
    { sku: 'DESSERT-005', name: 'Brownie', category: 'Food', section: 'Desserts', priceUgx: 8000 },
    // Food — Chef Specials
    { sku: 'CHEF-001', name: "Chef's Special", category: 'Food', section: 'Chef Specials', priceUgx: 30000 },
    { sku: 'CHEF-002', name: "Daily Special", category: 'Food', section: 'Chef Specials', priceUgx: 28000 },
    // Drinks — Beers (Alcoholic)
    { sku: 'BEER-001', name: 'Local Beer', category: 'Drinks', section: 'Beers', priceUgx: 8000, isHappyHour: true },
    { sku: 'BEER-002', name: 'Imported Beer', category: 'Drinks', section: 'Beers', priceUgx: 12000, isHappyHour: true },
    { sku: 'BEER-003', name: 'Craft Beer', category: 'Drinks', section: 'Beers', priceUgx: 15000 },
    // Drinks — Wines
    { sku: 'WINE-001', name: 'Red Wine (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000 },
    { sku: 'WINE-002', name: 'Red Wine (Bottle)', category: 'Drinks', section: 'Wines', priceUgx: 45000 },
    { sku: 'WINE-003', name: 'White Wine (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000 },
    { sku: 'WINE-004', name: 'White Wine (Bottle)', category: 'Drinks', section: 'Wines', priceUgx: 45000 },
    { sku: 'WINE-005', name: 'Rosé (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000 },
    // Drinks — Spirits
    { sku: 'SPIRIT-001', name: 'Whisky (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 15000 },
    { sku: 'SPIRIT-002', name: 'Vodka (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 12000 },
    { sku: 'SPIRIT-003', name: 'Tequila (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 14000 },
    { sku: 'SPIRIT-004', name: 'Rum (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 12000 },
    { sku: 'SPIRIT-005', name: 'Gin (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 13000 },
    { sku: 'SPIRIT-006', name: 'Liquor (Shot)', category: 'Drinks', section: 'Spirits', priceUgx: 10000 },
    { sku: 'SPIRIT-007', name: 'Brandy (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 14000 },
    // Drinks — Champagnes
    { sku: 'CHAMP-001', name: 'Champagne (Glass)', category: 'Drinks', section: 'Champagnes', priceUgx: 25000 },
    { sku: 'CHAMP-002', name: 'Champagne (Bottle)', category: 'Drinks', section: 'Champagnes', priceUgx: 120000 },
    // Cocktails (Happy Hour)
    { sku: 'COCK-001', name: 'Classic Cocktail', category: 'Drinks', section: 'Cocktails', priceUgx: 18000, isHappyHour: true },
    { sku: 'COCK-002', name: 'Signature Cocktail', category: 'Drinks', section: 'Cocktails', priceUgx: 22000, isHappyHour: true },
    { sku: 'COCK-003', name: 'Margarita', category: 'Drinks', section: 'Cocktails', priceUgx: 20000 },
    // Drinks — Pitchers
    { sku: 'PITCH-001', name: 'Beer Pitcher', category: 'Drinks', section: 'Pitchers', priceUgx: 25000, isHappyHour: true },
    { sku: 'PITCH-002', name: 'Cocktail Pitcher', category: 'Drinks', section: 'Pitchers', priceUgx: 45000 },
    // Tea & Coffee
    { sku: 'TC-001', name: 'Espresso', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 6000 },
    { sku: 'TC-002', name: 'Cappuccino', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000 },
    { sku: 'TC-003', name: 'Latte', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000 },
    { sku: 'TC-004', name: 'Americano', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 6000 },
    { sku: 'TC-005', name: 'Tea', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 5000 },
    { sku: 'TC-006', name: 'Mocha', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 9000 },
    { sku: 'TC-007', name: 'Green Tea', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 5000 },
    { sku: 'TC-008', name: 'Chai Latte', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000 },
    // Drinks — Fresh Juices
    { sku: 'JUICE-001', name: 'Orange Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000 },
    { sku: 'JUICE-002', name: 'Mango Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000 },
    { sku: 'JUICE-003', name: 'Passion Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000 },
    { sku: 'JUICE-004', name: 'Mixed Fruit Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 8000 },
    { sku: 'JUICE-005', name: 'Pineapple Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000 },
    { sku: 'JUICE-006', name: 'Avocado Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 9000 },
    // Drinks — Milkshakes
    { sku: 'MILK-001', name: 'Vanilla Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000 },
    { sku: 'MILK-002', name: 'Chocolate Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000 },
    { sku: 'MILK-003', name: 'Strawberry Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000 },
    { sku: 'MILK-004', name: 'Oreo Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 10000 },
    // Drinks — Smoothies
    { sku: 'SMTH-001', name: 'Fruit Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 10000 },
    { sku: 'SMTH-002', name: 'Green Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 10000 },
    { sku: 'SMTH-003', name: 'Berry Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 11000 },
    { sku: 'SMTH-004', name: 'Tropical Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 11000 },
    // Drinks — Mocktails
    { sku: 'MOCK-001', name: 'Virgin Mojito', category: 'Drinks', section: 'Mocktails', priceUgx: 8000 },
    { sku: 'MOCK-002', name: 'Fruit Punch', category: 'Drinks', section: 'Mocktails', priceUgx: 8000 },
    { sku: 'MOCK-003', name: 'Shirley Temple', category: 'Drinks', section: 'Mocktails', priceUgx: 7000 },
    { sku: 'MOCK-004', name: 'Virgin Piña Colada', category: 'Drinks', section: 'Mocktails', priceUgx: 9000 },
    // Drinks — Sodas
    { sku: 'SODA-001', name: 'Coca-Cola', category: 'Drinks', section: 'Sodas', priceUgx: 4000 },
    { sku: 'SODA-002', name: 'Sprite', category: 'Drinks', section: 'Sodas', priceUgx: 4000 },
    { sku: 'SODA-003', name: 'Fanta', category: 'Drinks', section: 'Sodas', priceUgx: 4000 },
    { sku: 'SODA-004', name: 'Soda Water', category: 'Drinks', section: 'Sodas', priceUgx: 3000 },
    { sku: 'SODA-005', name: 'Pepsi', category: 'Drinks', section: 'Sodas', priceUgx: 4000 },
    // Drinks — Water
    { sku: 'WATER-001', name: 'Still Water', category: 'Drinks', section: 'Water', priceUgx: 3000 },
    { sku: 'WATER-002', name: 'Sparkling Water', category: 'Drinks', section: 'Water', priceUgx: 5000 },
    { sku: 'WATER-003', name: 'Flavoured Water', category: 'Drinks', section: 'Water', priceUgx: 4000 },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, category: p.category, section: p.section, priceUgx: p.priceUgx, isHappyHour: p.isHappyHour ?? false, images: [PLACEHOLDER_IMG] },
      create: {
        name: p.name,
        category: p.category,
        section: p.section,
        sku: p.sku,
        priceUgx: p.priceUgx,
        sizes: [],
        colors: [],
        images: [PLACEHOLDER_IMG],
        stockQty: 999,
        isActive: true,
        isHappyHour: p.isHappyHour ?? false,
      },
    })
  }
  console.log('Seeded products:', products.length, '(food + drinks)')

  // Create active shift for first manager (for quick start)
  const linus = await prisma.staff.findUnique({ where: { username: 'linus' } })
  if (linus) {
    const existingShift = await prisma.shift.findFirst({
      where: { staffId: linus.id, endTime: null },
    })
    if (!existingShift) {
      await prisma.shift.create({
        data: {
          staffId: linus.id,
          terminalId: 'POS-1',
          startTime: new Date(),
          endTime: null,
        },
      })
      console.log('Seeded active shift for Linus (POS-1)')
    }
  }
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
