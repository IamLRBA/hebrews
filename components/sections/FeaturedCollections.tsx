'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShoppingCart, ArrowRight, Sparkles } from 'lucide-react'
import { CartManager, type CartItem } from '@/lib/cart'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  section: string
  price_ugx: number
  original_price?: number
  sizes: string[]
  colors: string[]
  images: string[]
  description: string
  condition: string
  sku: string
  stock_qty: number
}

interface FeaturedProduct {
  product: Product
  categoryName: string
  categorySlug: string
}

export default function FeaturedCollections() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadFeaturedProducts = () => {
      try {
        const getProductsData = () => {
          return require('@/data/products.json')
        }
        
        const productsData = getProductsData()
        const categories = [
          { slug: 'shirts', name: 'Shirts' },
          { slug: 'tees', name: 'Tees' },
          { slug: 'coats', name: 'Coats' },
          { slug: 'pants-and-shorts', name: 'Pants & Shorts' },
          { slug: 'footwear', name: 'Footwear' },
          { slug: 'accessories', name: 'Accessories' }
        ]

        const featured: FeaturedProduct[] = []

        categories.forEach(({ slug, name }) => {
          const categoryData = productsData.products[slug]
          if (categoryData && categoryData.subcategories) {
            const subcategories = Object.values(categoryData.subcategories)
            if (subcategories.length > 0) {
              const firstSubcategory = subcategories[0] as Product[]
              if (firstSubcategory && firstSubcategory.length > 0) {
                featured.push({
                  product: firstSubcategory[0],
                  categoryName: name,
                  categorySlug: slug
                })
              }
            }
          }
        })

        setFeaturedProducts(featured)
      } catch (error) {
        console.error('Error loading featured products:', error)
      }
    }

    loadFeaturedProducts()
    
    const checkCartStatus = () => {
      const cart = CartManager.getCart()
      const cartProductIds = new Set(cart.map(item => item.productId))
      setAddedToCart(cartProductIds)
    }

    checkCartStatus()
    window.addEventListener('cartUpdated', checkCartStatus)
    return () => {
      window.removeEventListener('cartUpdated', checkCartStatus)
    }
  }, [])

  const handleAddToCart = (product: Product) => {
    if (addedToCart.has(product.id) || CartManager.isProductInCart(product.id)) {
      alert('This product is already in your cart. Each product is a single unique piece.')
      return
    }

    setAddingToCart(product.id)

    const productSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
    const productColor = product.colors && product.colors.length > 0 ? product.colors[0] : ''

    const cartItem: CartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price_ugx,
      size: productSize,
      color: productColor,
      quantity: 1,
      image: product.images[0] || '/assets/images/placeholder.jpg',
      sku: product.sku
    }

    const success = CartManager.addToCart(cartItem)
    if (!success) {
      alert('This product is already in your cart. Each product is a single unique piece.')
      setAddingToCart(null)
      return
    }

    setTimeout(() => {
      setAddingToCart(null)
      setAddedToCart(new Set([...addedToCart, product.id]))
    }, 300)
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-primary-50 via-white to-primary-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-accent-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-accent-200/20 to-primary-200/20 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center space-x-2 text-primary-600 mb-4">
            <Sparkles className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">Featured</span>
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-primary-800 mb-4">
            Featured <span className="text-accent-600">Collections</span>
          </h2>
          <p className="text-xl text-primary-700 max-w-3xl mx-auto mb-6">
            Discover our handpicked selection from each category
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center space-x-2 text-primary-600 text-sm bg-primary-100 px-4 py-2 rounded-full"
          >
            <span>Click the portal below to explore more products</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </motion.div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {featuredProducts.map((item, index) => {
              const { product, categoryName, categorySlug } = item
              const isAdding = addingToCart === product.id
              const isInCart = addedToCart.has(product.id) || CartManager.isProductInCart(product.id)
              const hasDiscount = product.original_price && product.original_price > product.price_ugx

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-primary-100 h-full flex flex-col">
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 bg-primary-600/90 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                        {categoryName}
                      </span>
                    </div>

                    <Link href={`/products/${categorySlug}`}>
                      <div className="relative h-64 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                        <img
                          src={product.images[0] || '/assets/images/placeholder.jpg'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/assets/images/placeholder.jpg'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {product.condition && (
                          <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-primary-800 text-xs font-semibold rounded-full">
                            {product.condition}
                          </div>
                        )}
                        {hasDiscount && (
                          <div className="absolute bottom-4 right-4 px-3 py-1 bg-accent-500 text-white text-xs font-bold rounded-full">
                            {Math.round(((product.original_price! - product.price_ugx) / product.original_price!) * 100)}% OFF
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-5 flex-1 flex flex-col">
                      <Link href={`/products/${categorySlug}`}>
                        <div className="mb-3">
                          <p className="text-primary-500 text-xs font-medium mb-1">{product.brand}</p>
                          <h3 className="text-lg font-bold text-primary-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-primary-400 text-xs mb-3">{product.sku}</p>
                        </div>
                      </Link>

                      <div className="mb-4 mt-auto">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-2xl font-bold text-primary-700">
                            UGX {product.price_ugx.toLocaleString()}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-primary-400 line-through">
                              UGX {product.original_price!.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding || isInCart || product.stock_qty === 0}
                        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${
                          isInCart || product.stock_qty === 0
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-lg'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {isAdding
                            ? 'Adding...'
                            : isInCart
                            ? 'In Cart'
                            : product.stock_qty === 0
                            ? 'Out of Stock'
                            : 'Add to Cart'}
                        </span>
                      </button>

                      <Link
                        href={`/products/${categorySlug}`}
                        className="mt-3 text-center text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span>View Collection</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-primary-600">Loading featured collections...</p>
          </div>
        )}
      </div>
    </section>
  )
}


