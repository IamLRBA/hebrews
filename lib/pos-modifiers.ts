/**
 * Modifier groups by section (e.g. Grill gets Size, Side, Spice Level).
 * Used by POS to show modifier popup instead of creating many product variants.
 */

export type ModifierGroup = {
  name: string
  options: string[]
}

export const MODIFIER_GROUPS_BY_SECTION: Record<string, ModifierGroup[]> = {
  Grill: [
    { name: 'Size', options: ['Half', 'Full'] },
    { name: 'Side', options: ['Fries', 'Rice', 'Salad'] },
    { name: 'Spice Level', options: ['Mild', 'Medium', 'Hot'] },
  ],
  'Main Course': [
    { name: 'Size', options: ['Half', 'Full'] },
    { name: 'Side', options: ['Fries', 'Rice', 'Salad'] },
  ],
  'Starters / Appetizers': [
    { name: 'Size', options: ['Small', 'Regular'] },
  ],
  Desserts: [
    { name: 'Size', options: ['Single', 'Sharing'] },
  ],
  Salads: [
    { name: 'Dressing', options: ['Caesar', 'Vinaigrette', 'None'] },
  ],
  Cocktails: [
    { name: 'Size', options: ['Single', 'Double'] },
  ],
  'Tea & Coffee': [
    { name: 'Size', options: ['Small', 'Regular', 'Large'] },
  ],
}

export function getModifierGroupsForProduct(section: string | null): ModifierGroup[] {
  if (!section) return []
  return MODIFIER_GROUPS_BY_SECTION[section] ?? []
}
