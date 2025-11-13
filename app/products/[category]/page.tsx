'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShoppingCart, XCircle, Expand, Minimize, ChevronLeft, ChevronRight } from 'lucide-react'
import { CartManager, type CartItem } from '@/lib/cart'
import { ProductManager } from '@/lib/products'
import { AuthManager } from '@/lib/auth'
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
  const savedProducts = ProductManager.getProducts()
  
  // Merge saved products with JSON products
  const mergedProductsData = { ...productsData }
  if (savedProducts.products) {
    Object.keys(savedProducts.products).forEach(cat => {
      if (!mergedProductsData.products[cat]) {
        mergedProductsData.products[cat] = savedProducts.products[cat]
      } else {
        // Merge subcategories
        Object.keys(savedProducts.products[cat].subcategories || {}).forEach(sub => {
          if (!mergedProductsData.products[cat].subcategories[sub]) {
            mergedProductsData.products[cat].subcategories[sub] = savedProducts.products[cat].subcategories[sub]
          } else {
            // Merge products in subcategory
            const existingIds = new Set(mergedProductsData.products[cat].subcategories[sub].map((p: Product) => p.id))
            savedProducts.products[cat].subcategories[sub].forEach((p: Product) => {
              if (!existingIds.has(p.id)) {
                mergedProductsData.products[cat].subcategories[sub].push(p)
              }
            })
          }
        })
      }
    })
  }
  
  const categoryData = mergedProductsData.products[category as keyof typeof mergedProductsData.products]
  
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
  const productsBySection = Object.entries(categoryData.subcategories) as [string, Product[]][]

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
    // Track viewed item
    AuthManager.addViewedItem(product.id)
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
    <div className="min-h-screen bg-unified relative overflow-hidden pt-24">
      {/* Navigation Back */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-20 left-8 z-50"
      >
        <Link href="/sections/shop" className="group">
          <div className="flex items-center space-x-2 text-primary-300 hover:text-primary-100 transition-colors duration-300">
            <motion.span whileHover={{ x: -5 }} transition={{ duration: 0.2 }} className="text-lg font-medium">
              ⟸
            </motion.span>
            <span className="text-sm font-medium">Back to Shop</span>
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
                className={`btn ${selectedSection === section ? 'btn-secondary' : 'btn-primary'} text-sm sm:text-base justify-center`}
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
            
            <div className="grid gap-4 md:gap-6 lg:gap-8 justify-items-center [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {products.map((product: Product, index: number) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="w-full max-w-xs bg-primary-800/30 rounded-xl overflow-hidden border border-primary-500/30 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  onClick={() => openProductModal(product)}
                >
                  {/* Product Image */}
                  <div className="relative h-36 sm:h-44 md:h-52 lg:h-56 bg-primary-900/20 overflow-hidden">
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
                  </div>

                  {/* Product Info */}
                  <div className="p-2 sm:p-3 md:p-4">
                    <p className="text-primary-300 text-xs sm:text-sm mb-1 line-clamp-1">{product.brand}</p>
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2 flex-wrap">
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary-400">
                        UGX {product.price_ugx.toLocaleString()}
                      </span>
                      {product.original_price && (
                        <span className="text-xs sm:text-sm text-primary-400/50 line-through">
                          UGX {product.original_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2 sm:mt-3">
                      <button className="btn btn-outline btn-hover-secondary-filled flex-1 text-xs sm:text-sm font-medium gap-1 sm:gap-2 justify-center">
                        <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Quick View</span>
                        <span className="sm:hidden">View</span>
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [isInCart, setIsInCart] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const thumbnailRef = useRef<HTMLDivElement>(null)

  // Get the single size and color for this product (since each product is one piece)
  const productSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
  const productColor = product.colors && product.colors.length > 0 ? product.colors[0] : ''

  // Check if product is already in cart
  useEffect(() => {
    const checkCartStatus = () => {
      setIsInCart(CartManager.isProductInCart(product.id))
    }
    
    checkCartStatus()
    
    // Listen for cart updates
    window.addEventListener('cartUpdated', checkCartStatus)
    
    return () => {
      window.removeEventListener('cartUpdated', checkCartStatus)
    }
  }, [product.id])

  const addToCart = () => {
    // Check if already in cart
    if (isInCart || addedToCart) {
      alert('This product is already in your cart. Each product is a single unique piece.')
      return
    }

    setIsAddingToCart(true)
    
    const cartItem: CartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price_ugx,
      size: productSize,
      color: productColor,
      quantity: 1,
      image: product.images[0],
      sku: product.sku
    }
    
    const success = CartManager.addToCart(cartItem)
    
    if (!success) {
      alert('This product is already in your cart. Each product is a single unique piece.')
      setIsAddingToCart(false)
      setAddedToCart(true) // Show as already added
      return
    }
    
    setTimeout(() => {
      setIsAddingToCart(false)
      setAddedToCart(true)
    }, 300)
  }

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbnailRef.current) {
      const scrollAmount = 200
      thumbnailRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const openFullscreen = () => setIsFullscreen(true)
  const closeFullscreen = () => setIsFullscreen(false)

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        closeFullscreen()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <style jsx>{`
        .modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
        }
        .thumbnail-row::-webkit-scrollbar {
          height: 4px;
          border-radius: 9999px;
        }
        .thumbnail-row::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
          border: none;
        }
        .thumbnail-row::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
        }
      `}</style>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-3xl md:max-w-5xl bg-primary-800/95 rounded-2xl shadow-2xl overflow-y-auto max-h-[70vh] sm:max-h-[80vh] md:max-h-[85vh] modal-scroll"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ rotate: 180, scale: 0.95 }}
          onClick={onClose}
          className="sticky top-4 right-4 z-20 ml-auto mb-4 p-2 text-white/80 hover:text-white transition-colors duration-200 w-fit"
          aria-label="Close modal"
        >
          <XCircle className="w-6 h-6" />
        </motion.button>

        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 sm:gap-6 md:gap-8 p-4 sm:p-6 md:p-8">
          {/* Image Gallery */}
          <div className="flex-shrink-0 flex flex-col space-y-4">
            <div className="relative h-72 sm:h-80 md:h-[24rem] bg-primary-900/20 rounded-lg overflow-hidden group">
              <img
                src={product.images[currentImageIndex] || '/assets/images/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isFullscreen ? closeFullscreen : openFullscreen}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
                </motion.button>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="relative pt-2 sm:pt-2 overflow-visible">
                {product.images.length > 4 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => scrollThumbnails('left')}
                      className="p-1 text-white/80 hover:text-white transition-all duration-200"
                    >
                      <span className="text-lg font-medium inline-block">⟸</span>
                    </motion.button>
                  </div>
                )}
                <div
                  ref={thumbnailRef}
                  className="thumbnail-row flex items-center gap-2 md:gap-3 overflow-x-auto scroll-smooth py-3"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        currentImageIndex === index ? 'border-primary-500 scale-105' : 'border-transparent hover:border-primary-300'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {product.images.length > 4 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => scrollThumbnails('right')}
                      className="p-1 text-white/80 hover:text-white transition-all duration-200"
                    >
                      <span className="text-lg font-medium inline-block">⟹</span>
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <div className="space-y-4">
              <div>
                <p className="text-primary-300 text-sm mb-1">{product.brand} • {product.sku}</p>
                <h2 className="text-3xl font-bold text-white mb-1">{product.name}</h2>
                <div className="flex items-center flex-wrap gap-2 mb-3">
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
                </div>
              </div>

              <p className="text-primary-200 leading-relaxed">{product.description}</p>

              {/* Size Display */}
              {(productSize || productColor) && (
                <div className="flex flex-wrap items-center gap-4 text-primary-200">
                  {productSize && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Size:</span>
                      <span className="px-3 py-1 rounded-lg bg-primary-700/30">
                        {productSize}
                      </span>
                    </div>
                  )}
                  {productColor && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Color:</span>
                      <span className="px-3 py-1 rounded-lg bg-primary-700/30">
                        {productColor}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="pt-5 mt-5 border-t border-primary-600/40">
              <button
                onClick={addToCart}
                disabled={isAddingToCart || addedToCart || isInCart || product.stock_qty === 0}
                className={`btn btn-outline btn-hover-secondary-filled w-full text-lg font-semibold justify-center gap-2 ${
                  isAddingToCart || addedToCart || isInCart || product.stock_qty === 0 ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>
                  {isAddingToCart ? 'Adding...' : (addedToCart || isInCart) ? 'Already in Cart' : product.stock_qty === 0 ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4"
            onClick={closeFullscreen}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                closeFullscreen()
              }}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-all duration-200 z-10"
            >
              <Minimize className="w-6 h-6" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={product.images[currentImageIndex] || '/assets/images/placeholder.jpg'}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                  {currentImageIndex + 1} / {product.images.length}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

