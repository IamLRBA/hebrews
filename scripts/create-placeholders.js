const fs = require('fs');
const path = require('path');

// Service categories and their product subcategories
const services = {
  'shirts': ['gentle', 'checked', 'textured', 'denim'],
  'tees': ['plain', 'graphic', 'collared', 'sporty'],
  'coats': ['sweater', 'hoodie', 'coat', 'jacket'],
  'pants-and-shorts': ['gentle', 'denim', 'cargo', 'sporty'],
  'footwear': ['gentle', 'sneakers', 'sandals', 'boots'],
  'accessories': ['rings-necklaces', 'shades-glasses', 'bracelets-watches', 'decor']
};

// Colors for different categories
const categoryColors = {
  'shirts': ['#8B7355', '#A68B5B', '#C9A86F', '#E6C896'],
  'tees': ['#6B7A8F', '#7889A1', '#8898AB', '#A4B4C6'],
  'coats': ['#5A3E2D', '#6F4E37', '#8B6640', '#A0825D'],
  'pants-and-shorts': ['#4A5568', '#5A6781', '#6B7A95', '#7F8FA8'],
  'footwear': ['#2C2C2C', '#3C3C3C', '#4C4C4C', '#5C5C5C'],
  'accessories': ['#C2A77A', '#D4B88A', '#E6C99A', '#F5DAB0']
};

function createSVGPlaceholder(category, productIndex, width = 400, height = 400) {
  const color = categoryColors[category][productIndex - 1] || '#666666';
  const bgColor = color + '15'; // Add transparency
  const borderColor = color;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${category}${productIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color}80;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${color}40;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${bgColor}"/>
  
  <!-- Grid pattern -->
  <defs>
    <pattern id="grid${category}${productIndex}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${borderColor}20" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid${category}${productIndex})"/>
  
  <!-- Border -->
  <rect width="100%" height="100%" fill="none" stroke="${borderColor}" stroke-width="2" rx="8"/>
  
  <!-- Center icon placeholder -->
  <rect x="150" y="150" width="100" height="100" fill="${color}30" rx="8" stroke="${borderColor}" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Text -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
        fill="${color}">
    Placeholder
  </text>
</svg>`;
}

function createPlaceholderImages() {
  const baseDir = path.join(__dirname, '../public/assets/images/services/fashion');
  
  Object.entries(services).forEach(([category, products]) => {
    const categoryDir = path.join(baseDir, category);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    // Create placeholder images for each product
    products.forEach((product, index) => {
      const filename = `thumb${index + 1}.jpg`;
      const svgContent = createSVGPlaceholder(category, index + 1);
      const svgPath = path.join(categoryDir, `thumb${index + 1}.svg`);
      
      fs.writeFileSync(svgPath, svgContent, 'utf8');
      console.log(`Created placeholder: ${category}/${filename}`);
      
      // Note: We're creating SVG placeholders instead of JPG because we don't have image processing libraries
      // The user can convert these to JPG or we can update the code to use SVG files directly
    });
  });
  
  console.log('\nAll placeholder images created successfully!');
  console.log('\nNote: Created SVG placeholders. You can either:');
  console.log('1. Convert these SVGs to JPG using an online tool or image converter');
  console.log('2. Update the code to reference .svg files instead of .jpg');
}

// Run the script
createPlaceholderImages();

