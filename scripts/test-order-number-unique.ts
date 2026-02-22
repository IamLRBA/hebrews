/**
 * Verifies that uniqueOrderNumberForTakeaway produces different DB values for the same
 * display name (so creating two orders with the same name does not hit unique constraint).
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-order-number-unique.ts
 */
import { uniqueOrderNumberForTakeaway } from '../lib/pos-order-number'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

;(async () => {
  const { unique: u1, display: d1 } = uniqueOrderNumberForTakeaway('John')
  await new Promise((r) => setTimeout(r, 2))
  const { unique: u2, display: d2 } = uniqueOrderNumberForTakeaway('John')

  assert(d1 === 'John' && d2 === 'John', 'Display name should be trimmed and preserved')
  assert(u1.length <= 32 && u2.length <= 32, 'Unique order_number must fit in VarChar(32)')
  assert(u1 !== u2, 'Same display name must produce different unique values (timestamp suffix)')
  assert(u1.startsWith('John-') && u2.startsWith('John-'), 'Unique should start with display name')

  console.log('OK: uniqueOrderNumberForTakeaway produces unique DB values for same display name')
  console.log('  display:', d1)
  console.log('  unique 1:', u1)
  console.log('  unique 2:', u2)
})()
