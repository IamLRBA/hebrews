# POS Product Images

Place product images (JPG format) in these folders to display them on the POS:

- **Food**: `pos-images/food/{section}/`
  - Sections: `starters`, `salads`, `main-course`, `grill`, `platters`, `sides`, `desserts`, `chef-specials`
- **Drinks (Alcoholic)**: `pos-images/drinks/alcoholic/{section}/`
  - Sections: `beers`, `wines`, `spirits`, `champagnes`, `cocktails`, `pitchers`
- **Drinks (Non-Alcoholic)**: `pos-images/drinks/nonalcoholic/{section}/`
  - Sections: `tea-coffee`, `fresh-juices`, `milkshakes`, `smoothies`, `mocktails`, `sodas`, `water`

Name files to match product slugs (e.g. `grilled-chicken.jpg`). Update product `images` in the database to point to `/pos-images/...` paths (e.g. `/pos-images/food/grill/grilled-chicken.jpg`).

If no image exists, the placeholder is shown.
