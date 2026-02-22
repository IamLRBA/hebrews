/**
 * Generates a unique order_number for the DB (max 32 chars) so the same display name
 * can be used for multiple orders without violating the unique constraint.
 */
export function uniqueOrderNumberForTakeaway(userOrderNumber: string): { unique: string; display: string } {
  const display = userOrderNumber.trim().slice(0, 18)
  const unique = `${display}-${Date.now().toString().slice(-10)}`.slice(0, 32)
  return { unique, display: display || unique }
}
