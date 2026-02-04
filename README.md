
# Cafe Havilah & Pizzeria — Luxury Destination Cafe

A modern, interactive e-commerce platform for Cafe Havilah & Pizzeria. Browse our menu, order online, and experience premium dining, coffee, and hospitality.

---

## ☰ Features

### ⋆✴︎⌖⋆ E-Commerce Features

- **Product Catalog**: Browse our menu across Barista, Bar, Kitchen, and Bakery
- **Shopping Cart**: Add items to cart with size and color selection
- **Checkout System**: Secure checkout with delivery options
- **Order Management**: Order confirmation with receipt generation
- **Product Search**: Search functionality to find specific items
- **Responsive Design**: Fully responsive across all devices

### 𓂃✍︎ Design System

- **Dark Theme**: Earthy-toned minimalist design with black/white accents
- **Custom Animations**: Tailwind CSS custom keyframes and animations
- **Glass Effects**: Modern backdrop blur and transparency effects
- **Typography**: Inter and JetBrains Mono font families

### ⚛︎ Technology Stack

- **Next.js 15**: App Router with TypeScript
- **Tailwind CSS**: Custom design system with extended utilities
- **Framer Motion**: Smooth animations and transitions
- **Email Integration**: Automated email notifications (SendGrid/SMTP)
- **WhatsApp Integration**: Order notifications via WhatsApp (Green API)
- **Local Storage**: Cart and user preferences management

---

## 🗀 Project Structure

```
mysticalpieces/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── sections/
│   │   └── shop/                # Shop portal page
│   ├── products/
│   │   └── [category]/          # Product category pages
│   ├── cart/                     # Shopping cart page
│   ├── checkout/                 # Checkout page
│   ├── order-confirmation/       # Order confirmation page
│   ├── about-us/                 # About Us page
│   ├── ceo-profile/              # CEO profile page
│   └── api/                      # API routes
│       ├── send-email/           # Email notification API
│       └── send-whatsapp/        # WhatsApp notification API
├── components/                   # Shared UI components
│   ├── layout/                   # Layout components
│   │   ├── Navbar.tsx           # Navigation bar
│   │   └── Footer.tsx           # Footer
│   ├── sections/                 # Page sections
│   │   ├── FashionProducts.tsx  # Product showcase
│   │   ├── FeaturedCollections.tsx
│   │   ├── Testimonials.tsx
│   │   └── Companies.tsx
│   └── ui/                       # UI components
│       ├── LogoMark.tsx
│       ├── BackToTop.tsx
│       └── LoadingSkeleton.tsx
├── lib/                          # Utility libraries
│   ├── cart.ts                  # Cart management
│   ├── products.ts               # Product management
│   ├── emails/                  # Email templates
│   └── whatsapp/                # WhatsApp notifications
├── data/                         # Data files
│   └── products.json            # Product catalog
├── public/                       # Static assets
│   └── assets/
│       ├── images/              # Product and brand images
│       └── videos/              # Cafe videos
├── styles/                       # Global styles
│   └── globals.css
├── tailwind.config.js           # Tailwind configuration
├── next.config.js               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

---

## 🕸 Menu Categories

### 1. Barista

- **Hot Beverages**: Espresso, cappuccino, latte, Americano
- **Cold Beverages**: Iced coffee, cold brew, iced latte, frappe
- **Specialty Coffee**: Flat white, mocha, macchiato, affogato
- **Tea Selection**: English breakfast, green tea, chai latte, herbal tea

### 2. Bar

- **Cocktails**: Mojito, Old Fashioned, Margarita, Cosmopolitan
- **Wines**: Red, white, rosé, sparkling
- **Premium Spirits**: Whiskey, gin, vodka, rum
- **Signature Drinks**: House specials and seasonal creations

### 3. Kitchen

- **Grill**: Steaks, grilled chicken, fish, lamb chops
- **Breakfast**: Full English, rolex, avocado toast, pancakes
- **Mains**: Beef stroganoff, pasta, curry, fish and chips
- **Specials**: Chef's special, happy hour, combos, weekend brunch

### 4. Bakery

- **Pastries**: Croissant, danish, pain au chocolat, cinnamon roll
- **Breads**: Sourdough, whole wheat, baguette, multigrain
- **Desserts**: Chocolate cake, cheesecake, tiramisu, fruit tart
- **Breakfast Items**: Muffin, scone, bagel, pastry platter

---

## ⛟ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Hebrews
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run the development server**
   ```bash
   npm run dev
   ```
4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 𓅓 Customization


### Adding Products

#### Product Images

- Add product images to `/public/assets/images/products/`
- Organize by category and subcategory
- Recommended formats: JPG, PNG, WebP
- Optimize for web (compress, resize)

#### Product Data

- Update product catalog in `/data/products.json`
- Add product details: name, price, sizes, colors, images
- Include product descriptions and SKU information

#### Cafe Videos

- Add cafe videos to `/public/assets/videos/cafe/`
- Update video paths in `CafeVideoSection.tsx`
- Recommended formats: MP4, WebM
- Keep file sizes reasonable for web performance

### Modifying Colors and Themes

- Edit `tailwind.config.js` for color schemes
- Update `styles/globals.css` for custom animations
- Modify component-specific styling

### Adding New Product Categories

1. Add category data to `/data/products.json`
2. Create category images in `/public/assets/images/products-sections/cafe/`
3. Add subcategory images for each category
4. Update product routes in `/app/products/[category]/`

---

## ✇ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting (recommended)
- Component-based architecture

### Performance Optimization

- Lazy loading for heavy components
- Image optimization with Next.js Image
- Code splitting with dynamic imports
- Optimized animations and transitions

---

## 𑁍 Features in Detail

### Shopping Experience

- **Product Browsing**: Browse products by category with beautiful visual layouts
- **Product Details**: View detailed product information with multiple images
- **Shopping Cart**: Add items to cart with size and color selection
- **Checkout Process**: Secure checkout with customer information form
- **Order Confirmation**: Receive order confirmation with downloadable receipt

### Notifications

- **Email Notifications**: Automated emails sent to customers and admins
- **WhatsApp Notifications**: Order confirmations via WhatsApp
- **Receipt Generation**: Automatic receipt generation with order details

### User Interface

- **Dark/Light Mode**: Theme switching with persistent preferences
- **Responsive Design**: Mobile-first approach, fully responsive
- **Smooth Animations**: Framer Motion powered transitions
- **Search Functionality**: Search products across the catalog

---

## ⫘⫘ Animation System

### Framer Motion

- Page transitions
- Scroll-triggered animations
- Hover effects and micro-interactions

### Custom CSS Animations

- Logo animations
- Product card hover effects
- Smooth page transitions
- Loading states
- Scroll-triggered animations

### Performance Considerations

- Hardware acceleration
- Reduced motion support
- Optimized animation loops

---

## ⌯⌲ Future Enhancements

### Planned Features

- [ ] User accounts and authentication
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Payment gateway integration
- [ ] Order tracking system
- [ ] Inventory management
- [ ] Admin dashboard enhancements

### Technical Improvements

- [ ] PWA capabilities
- [ ] Advanced caching strategies
- [ ] SEO optimization
- [ ] Analytics integration
- [ ] Performance monitoring

---

## ೱ Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## ⓘ License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 𓂀 Acknowledgments

- Next.js team for the amazing framework
- Framer Motion for smooth animations
- Three.js community for 3D graphics
- Tailwind CSS for the utility-first approach

---

## ✆ Support

For questions or support:
- Create an issue in the repository
- Contact: [Your Contact Information]
- Website: [Your Website]

---

**Built with ♡ by Cafe Havilah & Pizzeria**
*Where luxury meets tradition. Experience the divine in every cup.* 

---