/** Category -> sections used in admin product modal */
export const CATEGORY_SECTIONS: Record<string, string[]> = {
  Food: [
    'Breakfast',
    'Starters',
    'Chicken Dishes',
    'Soups',
    'Salads & Sandwiches',
    'Burgers',
    'Pasta',
    'Main Dishes',
    "Weekend Chef's Platters",
    'Weekend Burger Offers',
    'Desserts',
    'Spicy / Specialty Dishes',
  ],
  Drinks: [
    'Beers',
    'Wines',
    'Spirits',
    'Champagnes',
    'Cocktails',
    'Pitchers',
    'Tea & Coffee',
    'Fresh Juices',
    'Milkshakes',
  ],
}

export const CATEGORIES = Object.keys(CATEGORY_SECTIONS)
