# Product Images

## Folder Structure

Place your actual product images in the following folder structure:

```
public/assets/images/products/
├── shirts/
│   ├── gentle/
│   │   ├── 1.jpg
│   │   ├── 1-2.jpg      (optional additional images)
│   │   └── 2.jpg
│   ├── checked/
│   │   └── 1.jpg
│   ├── textured/
│   │   └── 1.jpg
│   └── denim/
│       └── 1.jpg
├── tees/
│   ├── plain/1.jpg
│   ├── graphic/1.jpg
│   ├── collared/1.jpg
│   └── sporty/1.jpg
├── coats/
│   ├── sweater/1.jpg
│   ├── hoodie/1.jpg
│   ├── coat/1.jpg
│   └── jacket/1.jpg
├── pants/
│   ├── gentle/1.jpg
│   ├── denim/1.jpg
│   ├── cargo/1.jpg
│   └── sporty/1.jpg
├── footwear/
│   ├── gentle/1.jpg
│   ├── sneakers/1.jpg
│   ├── sandals/1.jpg
│   └── boots/1.jpg
└── accessories/
    ├── rings-necklaces/1.jpg
    ├── shades-glasses/1.jpg
    ├── bracelets-watches/1.jpg
    └── decor/1.jpg
```

## Image Specifications

- **Format**: JPG, PNG, or WebP recommended
- **Resolution**: Minimum 1200x1200px for main product images
- **File Size**: Under 1MB per image for optimal performance
- **Aspect Ratio**: Square (1:1) or portrait for clothing
- **Quality**: High quality, well-lit product photographs

### Image Guidelines

1. **Consistent Background**: White or neutral background for all products
2. **Good Lighting**: Even, natural lighting without harsh shadows
3. **Multiple Angles**: Include front, back, and detail shots where applicable
4. **Color Accuracy**: Images should represent true colors of products
5. **Thrift Condition**: Show condition clearly for thrifted items

## Image Naming Convention

Follow the pattern: `[number].jpg` where number corresponds to the product ID in `data/products.json`

For example:
- Product `shirt-gentle-1` uses: `shirts/gentle/1.jpg`
- Product `tee-plain-1` uses: `tees/plain/1.jpg`

Additional images for same product: `1-2.jpg`, `1-3.jpg`, etc.

---

**Note**: Create the folder structure if it doesn't exist, then place your images in the designated folders.

