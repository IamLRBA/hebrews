/**
 * Cafe Havilah & Pizzeria — POS seed data (Node/CommonJS, no ts-node)
 * Run with: npx prisma db seed  (or node prisma/seed.js)
 * Default password for all staff: "password123"
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = 'password123'

const img = (path) => `/pos-images/${path}`
const PLACEHOLDER_IMG = '/pos-images/placeholder.svg'

const staffData = [
  { username: 'able', fullName: 'Able', role: 'admin' },
  { username: 'david', fullName: 'David', role: 'admin' },
  { username: 'linus', fullName: 'Linus', role: 'manager' },
  { username: 'ritah', fullName: 'Ritah', role: 'manager' },
  { username: 'phiona', fullName: 'Phiona', role: 'cashier' },
  { username: 'evyone', fullName: 'Evyone', role: 'cashier' },
  { username: 'patricia', fullName: 'Patricia', role: 'cashier' },
  { username: 'emma', fullName: 'Emma', role: 'kitchen' },
  { username: 'kelvin', fullName: 'Kelvin', role: 'kitchen' },
  { username: 'fred', fullName: 'Fred', role: 'cashier' },
  { username: 'gift', fullName: 'Gift', role: 'cashier' },
  { username: 'sharon', fullName: 'Sharon', role: 'cashier' },
  { username: 'shinnah', fullName: 'Shinnah', role: 'cashier' },
  { username: 'aishah', fullName: 'Aishah', role: 'cashier' },
]

const terminalCodes = ['pos-1', 'kds-1', 'mgr-1']
const terminalMeta = {
  'pos-1': { name: 'POS 1', type: 'POS' },
  'kds-1': { name: 'Kitchen Display 1', type: 'KDS' },
  'mgr-1': { name: 'Manager Console', type: 'manager' },
}

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

const products = [
  { sku: 'FOOD-BF-001', name: 'English Breakfast', category: 'Food', section: 'Breakfast', priceUgx: 30000, image: img('food/breakfast/english-breakfast.jpg') },
  { sku: 'FOOD-BF-002', name: 'Quick Man Breakfast', category: 'Food', section: 'Breakfast', priceUgx: 30000, image: img('food/breakfast/quick-man-breakfast.jpg') },
  { sku: 'FOOD-BF-003', name: 'Home Made Breakfast (V)', category: 'Food', section: 'Breakfast', priceUgx: 30000, image: img('food/breakfast/home-made-breakfast-v.jpg') },
  { sku: 'FOOD-BF-004', name: 'Fresh Fruit Salad & Granola', category: 'Food', section: 'Breakfast', priceUgx: 20000, image: img('food/breakfast/fresh-fruit-salad-granola.jpg') },
  { sku: 'FOOD-ST-001', name: 'French Fries Plate', category: 'Food', section: 'Starters', priceUgx: 10000, image: img('food/starters/french-fries-plate.jpg') },
  { sku: 'FOOD-ST-002', name: 'Fish Fingers', category: 'Food', section: 'Starters', priceUgx: 20000, image: img('food/starters/fish-fingers.jpg') },
  { sku: 'FOOD-ST-003', name: 'Chicken Samosa Pair', category: 'Food', section: 'Starters', priceUgx: 6000, image: img('food/starters/chicken-samosa-pair.jpg') },
  { sku: 'FOOD-CH-001', name: 'Chicken Wings', category: 'Food', section: 'Chicken Dishes', priceUgx: 25000, image: img('food/chicken-dishes/chicken-wings.jpg') },
  { sku: 'FOOD-CH-002', name: 'Chicken Gizzards', category: 'Food', section: 'Chicken Dishes', priceUgx: 25000, image: img('food/chicken-dishes/chicken-gizzards.jpg') },
  { sku: 'FOOD-CH-003', name: 'Jimbo Rolex', category: 'Food', section: 'Chicken Dishes', priceUgx: 20000, image: img('food/chicken-dishes/jimbo-rolex.jpg') },
  { sku: 'FOOD-CH-004', name: 'Drums of Havilah (3 pcs)', category: 'Food', section: 'Chicken Dishes', priceUgx: 35000, image: img('food/chicken-dishes/drums-of-havilah.jpg') },
  { sku: 'FOOD-CH-005', name: 'Grilled Lemon Paprika Chicken Breast', category: 'Food', section: 'Chicken Dishes', priceUgx: 35000, image: img('food/chicken-dishes/grilled-lemon-paprika-chicken-breast.jpg') },
  { sku: 'FOOD-CH-006', name: 'Stir Fry Chicken / Beef', category: 'Food', section: 'Chicken Dishes', priceUgx: 35000, image: img('food/chicken-dishes/stir-fry-chicken-beef.jpg') },
  { sku: 'FOOD-SOUP-001', name: 'Tomato & Roast Pepper Soup', category: 'Food', section: 'Soups', priceUgx: 20000, image: img('food/soups/tomato-roast-pepper-soup.jpg') },
  { sku: 'FOOD-SOUP-002', name: 'Mushroom Soup (V)', category: 'Food', section: 'Soups', priceUgx: 20000, image: img('food/soups/mushroom-soup-v.jpg') },
  { sku: 'FOOD-SOUP-003', name: 'Bone Soup (Clear)', category: 'Food', section: 'Soups', priceUgx: 20000, image: img('food/soups/bone-soup-clear.jpg') },
  { sku: 'FOOD-SOUP-004', name: 'Mulokoni (Caribbean Style)', category: 'Food', section: 'Soups', priceUgx: 25000, image: img('food/soups/mulokoni-caribbean-style.jpg') },
  { sku: 'FOOD-SAL-001', name: 'Chicken Caesar Salad', category: 'Food', section: 'Salads & Sandwiches', priceUgx: 30000, image: img('food/salads-sandwiches/chicken-caesar-salad.jpg') },
  { sku: 'FOOD-SAL-002', name: 'Espaniole Salad (V)', category: 'Food', section: 'Salads & Sandwiches', priceUgx: 30000, image: img('food/salads-sandwiches/espaniole-salad-v.jpg') },
  { sku: 'FOOD-SAL-003', name: 'Club Chicken Sandwich', category: 'Food', section: 'Salads & Sandwiches', priceUgx: 25000, image: img('food/salads-sandwiches/club-chicken-sandwich.jpg') },
  { sku: 'FOOD-SAL-004', name: 'Beef Philly Sandwich', category: 'Food', section: 'Salads & Sandwiches', priceUgx: 30000, image: img('food/salads-sandwiches/beef-philly-sandwich.jpg') },
  { sku: 'FOOD-SAL-005', name: 'Grilled Vegetable Antipasto', category: 'Food', section: 'Salads & Sandwiches', priceUgx: 30000, image: img('food/salads-sandwiches/grilled-vegetable-antipasto.jpg') },
  { sku: 'FOOD-BRG-001', name: 'Beef & Cheese Burger', category: 'Food', section: 'Burgers', priceUgx: 30000, image: img('food/burgers/beef-cheese-burger.jpg') },
  { sku: 'FOOD-BRG-002', name: 'Classic Chicken Burger', category: 'Food', section: 'Burgers', priceUgx: 30000, image: img('food/burgers/classic-chicken-burger.jpg') },
  { sku: 'FOOD-BRG-003', name: 'Vegetarian Burger (V)', category: 'Food', section: 'Burgers', priceUgx: 30000, image: img('food/burgers/vegetarian-burger-v.jpg') },
  { sku: 'FOOD-PST-001', name: 'Mushroom, Chicken & Cream Pasta', category: 'Food', section: 'Pasta', priceUgx: 35000, image: img('food/pasta/mushroom-chicken-cream-pasta.jpg') },
  { sku: 'FOOD-PST-002', name: 'Chicken, Bacon & Cream Pasta', category: 'Food', section: 'Pasta', priceUgx: 30000, image: img('food/pasta/chicken-bacon-cream-pasta.jpg') },
  { sku: 'FOOD-MAIN-001', name: 'Goat (½ kg)', category: 'Food', section: 'Main Dishes', priceUgx: 35000, image: img('food/main-dishes/goat.jpg') },
  { sku: 'FOOD-MAIN-002', name: 'Local Chicken (various styles)', category: 'Food', section: 'Main Dishes', priceUgx: 45000, image: img('food/main-dishes/local-chicken.jpg') },
  { sku: 'FOOD-PLAT-001', name: 'White Meat Platter', category: 'Food', section: "Weekend Chef's Platters", priceUgx: 75000, image: img('food/weekend-chefs-platters/white-meat-platter.jpg') },
  { sku: 'FOOD-PLAT-002', name: 'Mixed Meat Platter', category: 'Food', section: "Weekend Chef's Platters", priceUgx: 85000, image: img('food/weekend-chefs-platters/mixed-meat-platter.jpg') },
  { sku: 'FOOD-WBO-001', name: 'Beef Bacon Cheese Burger', category: 'Food', section: 'Weekend Burger Offers', priceUgx: 25000, image: img('food/weekend-burger-offers/beef-bacon-cheese-burger.jpg') },
  { sku: 'FOOD-WBO-002', name: 'Chicken Burger Special', category: 'Food', section: 'Weekend Burger Offers', priceUgx: 25000, image: img('food/weekend-burger-offers/chicken-burger-special.jpg') },
  { sku: 'FOOD-WBO-003', name: 'Vegetarian Burger', category: 'Food', section: 'Weekend Burger Offers', priceUgx: 20000, image: img('food/weekend-burger-offers/vegetarian-burger.jpg') },
  { sku: 'FOOD-DES-001', name: 'Triple Baller Ice Cream', category: 'Food', section: 'Desserts', priceUgx: 10000, image: img('food/desserts/triple-baller-ice-cream.jpg') },
  { sku: 'FOOD-DES-002', name: 'Chocolate Brownie with Ice Cream', category: 'Food', section: 'Desserts', priceUgx: 15000, image: img('food/desserts/chocolate-brownie-ice-cream.jpg') },
  { sku: 'FOOD-SPEC-001', name: 'Thai Chicken Thighs Satay', category: 'Food', section: 'Spicy / Specialty Dishes', priceUgx: 40000, image: img('food/spicy-specialty-dishes/thai-chicken-thighs-satay.jpg') },
  { sku: 'FOOD-SPEC-002', name: 'Cajun Spicy Paneer (V)', category: 'Food', section: 'Spicy / Specialty Dishes', priceUgx: 45000, image: img('food/spicy-specialty-dishes/cajun-spicy-paneer-v.jpg') },
  { sku: 'FOOD-SPEC-003', name: 'Spicy Drums of Havilah', category: 'Food', section: 'Spicy / Specialty Dishes', priceUgx: 45000, image: img('food/spicy-specialty-dishes/spicy-drums-of-havilah.jpg') },
  { sku: 'FOOD-SPEC-004', name: 'Chili Garlic Spicy Shrimps', category: 'Food', section: 'Spicy / Specialty Dishes', priceUgx: 60000, image: img('food/spicy-specialty-dishes/chili-garlic-spicy-shrimps.jpg') },
  { sku: 'BEER-001', name: 'Local Beer', category: 'Drinks', section: 'Beers', priceUgx: 8000, isHappyHour: true, image: img('drinks/alcoholic/beers/local-beer.jpg') },
  { sku: 'BEER-002', name: 'Imported Beer', category: 'Drinks', section: 'Beers', priceUgx: 12000, isHappyHour: true, image: img('drinks/alcoholic/beers/imported-beer.jpg') },
  { sku: 'BEER-003', name: 'Craft Beer', category: 'Drinks', section: 'Beers', priceUgx: 15000, image: img('drinks/alcoholic/beers/craft-beer.jpg') },
  { sku: 'WINE-001', name: 'Red Wine (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000, image: img('drinks/alcoholic/wines/red-wine-glass.jpg') },
  { sku: 'WINE-002', name: 'Red Wine (Bottle)', category: 'Drinks', section: 'Wines', priceUgx: 45000, image: img('drinks/alcoholic/wines/red-wine-bottle.jpg') },
  { sku: 'WINE-003', name: 'White Wine (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000, image: img('drinks/alcoholic/wines/white-wine-glass.jpg') },
  { sku: 'WINE-004', name: 'White Wine (Bottle)', category: 'Drinks', section: 'Wines', priceUgx: 45000, image: img('drinks/alcoholic/wines/white-wine-bottle.jpg') },
  { sku: 'WINE-005', name: 'Rosé (Glass)', category: 'Drinks', section: 'Wines', priceUgx: 12000, image: img('drinks/alcoholic/wines/rose-glass.jpg') },
  { sku: 'SPIRIT-001', name: 'Whisky (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 15000, image: img('drinks/alcoholic/spirits/whisky-single.jpg') },
  { sku: 'SPIRIT-002', name: 'Vodka (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 12000, image: img('drinks/alcoholic/spirits/vodka-single.jpg') },
  { sku: 'SPIRIT-003', name: 'Tequila (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 14000, image: img('drinks/alcoholic/spirits/tequila-single.jpg') },
  { sku: 'SPIRIT-004', name: 'Rum (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 12000, image: img('drinks/alcoholic/spirits/rum-single.jpg') },
  { sku: 'SPIRIT-005', name: 'Gin (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 13000, image: img('drinks/alcoholic/spirits/gin-single.jpg') },
  { sku: 'SPIRIT-006', name: 'Liquor (Shot)', category: 'Drinks', section: 'Spirits', priceUgx: 10000, image: img('drinks/alcoholic/spirits/liquor-shot.jpg') },
  { sku: 'SPIRIT-007', name: 'Brandy (Single)', category: 'Drinks', section: 'Spirits', priceUgx: 14000, image: img('drinks/alcoholic/spirits/brandy-single.jpg') },
  { sku: 'CHAMP-001', name: 'Champagne (Glass)', category: 'Drinks', section: 'Champagnes', priceUgx: 25000, image: img('drinks/alcoholic/champagnes/champagne-glass.jpg') },
  { sku: 'CHAMP-002', name: 'Champagne (Bottle)', category: 'Drinks', section: 'Champagnes', priceUgx: 120000, image: img('drinks/alcoholic/champagnes/champagne-bottle.jpg') },
  { sku: 'COCK-001', name: 'Classic Cocktail', category: 'Drinks', section: 'Cocktails', priceUgx: 18000, isHappyHour: true, image: img('drinks/alcoholic/cocktails/classic-cocktail.jpg') },
  { sku: 'COCK-002', name: 'Signature Cocktail', category: 'Drinks', section: 'Cocktails', priceUgx: 22000, isHappyHour: true, image: img('drinks/alcoholic/cocktails/signature-cocktail.jpg') },
  { sku: 'COCK-003', name: 'Margarita', category: 'Drinks', section: 'Cocktails', priceUgx: 20000, image: img('drinks/alcoholic/cocktails/margarita.jpg') },
  { sku: 'PITCH-001', name: 'Beer Pitcher', category: 'Drinks', section: 'Pitchers', priceUgx: 25000, isHappyHour: true, image: img('drinks/alcoholic/pitchers/beer-pitcher.jpg') },
  { sku: 'PITCH-002', name: 'Cocktail Pitcher', category: 'Drinks', section: 'Pitchers', priceUgx: 45000, image: img('drinks/alcoholic/pitchers/cocktail-pitcher.jpg') },
  { sku: 'TC-001', name: 'Espresso', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 6000, image: img('drinks/nonalcoholic/tea-coffee/espresso.jpg') },
  { sku: 'TC-002', name: 'Cappuccino', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000, image: img('drinks/nonalcoholic/tea-coffee/cappuccino.jpg') },
  { sku: 'TC-003', name: 'Latte', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000, image: img('drinks/nonalcoholic/tea-coffee/latte.jpg') },
  { sku: 'TC-004', name: 'Americano', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 6000, image: img('drinks/nonalcoholic/tea-coffee/americano.jpg') },
  { sku: 'TC-005', name: 'Tea', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 5000, image: img('drinks/nonalcoholic/tea-coffee/tea.jpg') },
  { sku: 'TC-006', name: 'Mocha', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 9000, image: img('drinks/nonalcoholic/tea-coffee/mocha.jpg') },
  { sku: 'TC-007', name: 'Green Tea', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 5000, image: img('drinks/nonalcoholic/tea-coffee/green-tea.jpg') },
  { sku: 'TC-008', name: 'Chai Latte', category: 'Drinks', section: 'Tea & Coffee', priceUgx: 8000, image: img('drinks/nonalcoholic/tea-coffee/chai-latte.jpg') },
  { sku: 'JUICE-001', name: 'Orange Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000, image: img('drinks/nonalcoholic/fresh-juices/orange-juice.jpg') },
  { sku: 'JUICE-002', name: 'Mango Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000, image: img('drinks/nonalcoholic/fresh-juices/mango-juice.jpg') },
  { sku: 'JUICE-003', name: 'Passion Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000, image: img('drinks/nonalcoholic/fresh-juices/passion-juice.jpg') },
  { sku: 'JUICE-004', name: 'Mixed Fruit Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 8000, image: img('drinks/nonalcoholic/fresh-juices/mixed-fruit-juice.jpg') },
  { sku: 'JUICE-005', name: 'Pineapple Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 7000, image: img('drinks/nonalcoholic/fresh-juices/pineapple-juice.jpg') },
  { sku: 'JUICE-006', name: 'Avocado Juice', category: 'Drinks', section: 'Fresh Juices', priceUgx: 9000, image: img('drinks/nonalcoholic/fresh-juices/avocado-juice.jpg') },
  { sku: 'MILK-001', name: 'Vanilla Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000, image: img('drinks/nonalcoholic/milkshakes/vanilla-milkshake.jpg') },
  { sku: 'MILK-002', name: 'Chocolate Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000, image: img('drinks/nonalcoholic/milkshakes/chocolate-milkshake.jpg') },
  { sku: 'MILK-003', name: 'Strawberry Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 9000, image: img('drinks/nonalcoholic/milkshakes/strawberry-milkshake.jpg') },
  { sku: 'MILK-004', name: 'Oreo Milkshake', category: 'Drinks', section: 'Milkshakes', priceUgx: 10000, image: img('drinks/nonalcoholic/milkshakes/oreo-milkshake.jpg') },
  { sku: 'SMTH-001', name: 'Fruit Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 10000, image: img('drinks/nonalcoholic/smoothies/fruit-smoothie.jpg') },
  { sku: 'SMTH-002', name: 'Green Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 10000, image: img('drinks/nonalcoholic/smoothies/green-smoothie.jpg') },
  { sku: 'SMTH-003', name: 'Berry Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 11000, image: img('drinks/nonalcoholic/smoothies/berry-smoothie.jpg') },
  { sku: 'SMTH-004', name: 'Tropical Smoothie', category: 'Drinks', section: 'Smoothies', priceUgx: 11000, image: img('drinks/nonalcoholic/smoothies/tropical-smoothie.jpg') },
  { sku: 'MOCK-001', name: 'Virgin Mojito', category: 'Drinks', section: 'Mocktails', priceUgx: 8000, image: img('drinks/nonalcoholic/mocktails/virgin-mojito.jpg') },
  { sku: 'MOCK-002', name: 'Fruit Punch', category: 'Drinks', section: 'Mocktails', priceUgx: 8000, image: img('drinks/nonalcoholic/mocktails/fruit-punch.jpg') },
  { sku: 'MOCK-003', name: 'Shirley Temple', category: 'Drinks', section: 'Mocktails', priceUgx: 7000, image: img('drinks/nonalcoholic/mocktails/shirley-temple.jpg') },
  { sku: 'MOCK-004', name: 'Virgin Piña Colada', category: 'Drinks', section: 'Mocktails', priceUgx: 9000, image: img('drinks/nonalcoholic/mocktails/virgin-pina-colada.jpg') },
  { sku: 'SODA-001', name: 'Coca-Cola', category: 'Drinks', section: 'Sodas', priceUgx: 4000, image: img('drinks/nonalcoholic/sodas/coca-cola.jpg') },
  { sku: 'SODA-002', name: 'Sprite', category: 'Drinks', section: 'Sodas', priceUgx: 4000, image: img('drinks/nonalcoholic/sodas/sprite.jpg') },
  { sku: 'SODA-003', name: 'Fanta', category: 'Drinks', section: 'Sodas', priceUgx: 4000, image: img('drinks/nonalcoholic/sodas/fanta.jpg') },
  { sku: 'SODA-004', name: 'Soda Water', category: 'Drinks', section: 'Sodas', priceUgx: 3000, image: img('drinks/nonalcoholic/sodas/soda-water.jpg') },
  { sku: 'SODA-005', name: 'Pepsi', category: 'Drinks', section: 'Sodas', priceUgx: 4000, image: img('drinks/nonalcoholic/sodas/pepsi.jpg') },
  { sku: 'WATER-001', name: 'Still Water', category: 'Drinks', section: 'Water', priceUgx: 3000, image: img('drinks/nonalcoholic/water/still-water.jpg') },
  { sku: 'WATER-002', name: 'Sparkling Water', category: 'Drinks', section: 'Water', priceUgx: 5000, image: img('drinks/nonalcoholic/water/sparkling-water.jpg') },
  { sku: 'WATER-003', name: 'Flavoured Water', category: 'Drinks', section: 'Water', priceUgx: 4000, image: img('drinks/nonalcoholic/water/flavoured-water.jpg') },
]

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

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

  try {
    for (const code of terminalCodes) {
      const meta = terminalMeta[code]
      await prisma.terminal.upsert({
        where: { code },
        update: { name: meta.name, type: meta.type },
        create: { code, name: meta.name, type: meta.type, isActive: true },
      })
    }
    console.log('Seeded terminals:', terminalCodes.join(', '))
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : ''
    if (code === 'P2021' || (e instanceof Error && e.message && e.message.includes('does not exist'))) {
      console.warn('Terminal table not found; run Phase 4 migration (or db push) then seed again.')
    } else {
      throw e
    }
  }

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

  const foodProducts = await prisma.product.findMany({ where: { category: 'Food' }, select: { id: true } })
  const foodProductIds = foodProducts.map((p) => p.id)
  if (foodProductIds.length > 0) {
    await prisma.orderItem.deleteMany({ where: { productId: { in: foodProductIds } } })
    await prisma.product.deleteMany({ where: { category: 'Food' } })
    console.log('Removed', foodProductIds.length, 'existing Food products')
  }

  for (const p of products) {
    const productImage = p.image ?? PLACEHOLDER_IMG
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, category: p.category, section: p.section, priceUgx: p.priceUgx, isHappyHour: p.isHappyHour ?? false, images: [productImage] },
      create: {
        name: p.name,
        category: p.category,
        section: p.section,
        sku: p.sku,
        priceUgx: p.priceUgx,
        sizes: [],
        colors: [],
        images: [productImage],
        stockQty: 999,
        isActive: true,
        isHappyHour: p.isHappyHour ?? false,
      },
    })
  }
  console.log('Seeded products:', products.length, '(food + drinks)')

  const linus = await prisma.staff.findUnique({ where: { username: 'linus' } })
  if (linus) {
    const existingShift = await prisma.shift.findFirst({
      where: { staffId: linus.id, endTime: null },
    })
    if (!existingShift) {
      await prisma.shift.create({
        data: {
          staffId: linus.id,
          terminalId: 'pos-1',
          startTime: new Date(),
          endTime: null,
        },
      })
      console.log('Seeded active shift for Linus (pos-1)')
    }
  }

  console.log('Seed completed.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
