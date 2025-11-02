'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart } from 'lucide-react'
import { CartManager, type CartItem } from '@/lib/cart'
// Import products data - We'll need to create a proper data structure
// For now, using mock data inline
const getProductsData = () => {
  // This should be replaced with actual data fetching
  return require('@/data/products.json')
}

interface Product {
  id: string
  name: string
  brand: string
  category: string
  section: string
  price_ugx: number
  original_price: number
  sizes: string[]
  colors: string[]
  images: string[]
  description: string
  condition: string
  sku: string
  stock_qty: number
}

export default function ProductCategoryPage() {
  const params = useParams()
  const category = params.category as string
  
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<Product[]>([])
  
  const productsData = getProductsData()
  const categoryData = productsData.products[category as keyof typeof productsData.products]
  
  useEffect(() => {
    // Extract section from hash if present
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1)
      if (hash && categoryData?.subcategories[hash as keyof typeof categoryData.subcategories]) {
        setSelectedSection(hash)
      }
    }
  }, [categoryData])

  if (!categoryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold">Category Not Found</h1>
      </div>
    )
  }

  const sections = Object.keys(categoryData.subcategories)
  const productsBySection = Object.entries(categoryData.subcategories)

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
  }

  const closeProductModal = () => {
    setSelectedProduct(null)
  }

  const scrollToSection = (section: string) => {
    setSelectedSection(section)
    const element = document.getElementById(section)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900/20 via-primary-900 to-accent-900/20 relative overflow-hidden pt-24">
      {/* Navigation Back */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-20 left-8 z-50"
      >
        <Link href="/sections/fashion" className="group">
          <div className="flex items-center space-x-2 text-primary-300 hover:text-primary-100 transition-colors duration-300">
            <motion.div whileHover={{ x: -5 }} transition={{ duration: 0.2 }}>
              <ArrowLeft className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-medium">Back to Fashion</span>
          </div>
        </Link>
      </motion.div>

      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">{categoryData.title}</span>
          </h1>
          <p className="text-xl text-primary-200 max-w-3xl mx-auto mb-12">
            {categoryData.description}
          </p>
        </motion.div>

        {/* Section Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto"
        >
          {sections.map((section) => {
            const displayName = section.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
            
            return (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className={`px-6 py-3 rounded-full transition-all duration-300 ${
                  selectedSection === section
                    ? 'bg-primary-500 text-white'
                    : 'bg-primary-800/30 text-primary-200 hover:bg-primary-800/50'
                }`}
              >
                {displayName}
              </button>
            )
          })}
        </motion.div>
      </section>

      {/* Products Grid by Section */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        {productsBySection.map(([section, products]) => (
          <motion.section
            key={section}
            id={section}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-32"
          >
            <h2 className="text-4xl font-bold text-center mb-12 capitalize">
              {section.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product: Product, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-primary-800/30 rounded-xl overflow-hidden border border-primary-500/30 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  onClick={() => openProductModal(product)}
                >
                  {/* Product Image */}
                  <div className="relative h-64 bg-primary-900/20 overflow-hidden">
                    <img
                      src={product.images[0] || '/assets/images/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/assets/images/placeholder.jpg'
                      }}
                    />
                    {/* Condition Badge */}
                    <div className="absolute top-2 left-2 px-3 py-1 bg-primary-500/90 text-white text-xs font-semibold rounded-full">
                      {product.condition}
                    </div>
                    {/* Stock Badge */}
                    {product.stock_qty > 0 ? (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-green-500/90 text-white text-xs font-semibold rounded-full">
                        In Stock
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-red-500/90 text-white text-xs font-semibold rounded-full">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <p className="text-primary-300 text-sm mb-1">{product.brand}</p>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl font-bold text-primary-400">
                        UGX {product.price_ugx.toLocaleString()}
                      </span>
                      {product.original_price && (
                        <span className="text-sm text-primary-400/50 line-through">
                          UGX {product.original_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                      <button className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors duration-200 flex items-center justify-center space-x-2">
                        <ShoppingCart className="w-4 h-4" />
                        <span>Quick View</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={closeProductModal} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Product Modal Component
function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const addToCart = () => {
    if (!selectedSize) {
      alert('Please select a size')
      return
    }
    setIsAddingToCart(true)
    
    const cartItem: CartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price_ugx,
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
      image: product.images[0],
      sku: product.sku
    }
    
    CartManager.addToCart(cartItem)
    
    setTimeout(() => {
      setIsAddingToCart(false)
      alert('Product added to cart!')
      onClose()
    }, 300)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-primary-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="grid md:grid-cols-2 gap-8 p-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative h-96 bg-primary-900/20 rounded-lg overflow-hidden">
              <img
                src={product.images[currentImageIndex] || '/assets/images/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-20 rounded overflow-hidden border-2 ${
                      currentImageIndex === index ? 'border-primary-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <p className="text-primary-300 text-sm mb-1">{product.brand} • {product.sku}</p>
              <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-3xl font-bold text-primary-400">
                  UGX {product.price_ugx.toLocaleString()}
                </span>
                {product.original_price && (
                  <span className="text-lg text-primary-400/50 line-through">
                    UGX {product.original_price.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-primary-500/30 text-primary-200 text-sm rounded-full">
                  {product.condition}
                </span>
                <span className="px-3 py-1 bg-green-500/30 text-green-200 text-sm rounded-full">
                  {product.stock_qty} in stock
                </span>
              </div>
            </div>

            <p className="text-primary-200 leading-relaxed">{product.description}</p>

            {/* Size Selection */}
            <div>
              <label className="block text-primary-200 font-medium mb-2">Size *</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      selectedSize === size
                        ? 'bg-primary-500 text-white'
                        : 'bg-primary-700/30 text-primary-200 hover:bg-primary-700/50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            {product.colors.length > 0 && (
              <div>
                <label className="block text-primary-200 font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 border-2 ${
                        selectedColor === color
                          ? 'border-primary-500 bg-primary-500/30 text-white'
                          : 'border-primary-600/30 bg-primary-700/30 text-primary-200 hover:border-primary-500/50'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={addToCart}
              disabled={isAddingToCart || product.stock_qty === 0}
              className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-2 transition-all duration-200 ${
                product.stock_qty === 0
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>
                {isAddingToCart ? 'Adding...' : product.stock_qty === 0 ? 'Out of Stock' : 'Add to Cart'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

