'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiMenu, HiX, HiSearch } from 'react-icons/hi'
import { Home, UserCircle, ShoppingCart, Globe, ShoppingBag } from 'lucide-react'
import SettingsDropdown from '@/components/ui/SettingsDropdown'
import { CartManager } from '@/lib/cart'
import { ProductManager, type Product } from '@/lib/products'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'About Us', href: '/about-us', icon: UserCircle },
]

const portalItems = [
  { name: 'Fashion', href: '/sections/fashion', icon: ShoppingBag },
]

// Helper function to get all products from JSON and ProductManager
const getAllProducts = (): Product[] => {
  const allProducts: Product[] = []
  
  try {
    // Get products from JSON file
    const getProductsData = () => {
      return require('@/data/products.json')
    }
    const productsData = getProductsData()
    
    // Extract products from JSON
    Object.keys(productsData.products || {}).forEach(category => {
      Object.keys(productsData.products[category].subcategories || {}).forEach(section => {
        productsData.products[category].subcategories[section].forEach((product: Product) => {
          allProducts.push(product)
        })
      })
    })
  } catch (error) {
    console.error('Error loading products from JSON:', error)
  }
  
  // Get products from ProductManager (saved products)
  const savedProducts = ProductManager.getAllProductsArray()
  const existingIds = new Set(allProducts.map(p => p.id))
  
  // Add saved products that don't already exist
  savedProducts.forEach(product => {
    if (!existingIds.has(product.id)) {
      allProducts.push(product)
    }
  })
  
  return allProducts
}

interface SearchResult {
  product: Product
  category: string
  section: string
  href: string
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPortalsOpen, setIsPortalsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchResult[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const pathname = usePathname()
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Load all products on mount and when products are updated
  useEffect(() => {
    const loadProducts = () => {
      setAllProducts(getAllProducts())
    }
    
    loadProducts()
    
    // Listen for product updates
    window.addEventListener('productsUpdated', loadProducts)
    return () => {
      window.removeEventListener('productsUpdated', loadProducts)
    }
  }, [])

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(CartManager.getCartCount())
    }
    updateCartCount()
    window.addEventListener('storage', updateCartCount)
    window.addEventListener('cartUpdated', updateCartCount)
    const interval = setInterval(updateCartCount, 1000)
    return () => {
      window.removeEventListener('storage', updateCartCount)
      window.removeEventListener('cartUpdated', updateCartCount)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Search through products
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSuggestions([])
      setIsSearching(false)
      setShowSuggestions(false)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const results: SearchResult[] = []
      
      // Search through all products
      allProducts.forEach(product => {
        const searchableText = [
          product.name,
          product.brand,
          product.category,
          product.section,
          product.description,
          product.sku
        ].join(' ').toLowerCase()
        
        if (searchableText.includes(query)) {
          // Format category name for display
          const categoryName = product.category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          
          // Format section name for display
          const sectionName = product.section
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          
          results.push({
            product,
            category: categoryName,
            section: sectionName,
            href: `/products/${product.category}#${product.section}`
          })
        }
      })
      
      // Limit results to 10 for better UX
      setFilteredSuggestions(results.slice(0, 10))
      setIsSearching(true)
      setShowSuggestions(true)
    }
  }, [searchQuery, allProducts])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    // The useEffect hook will handle filtering automatically
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearchOpen(false)
    setIsSearching(false)
    setShowSuggestions(false)
  }

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
    if (!isSearchOpen) setShowSuggestions(false)
  }

  const handleSuggestionClick = (href: string) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    window.location.href = href
  }

  const closeMenu = () => {
    setIsOpen(false)
    setIsSearchOpen(false)
    setIsPortalsOpen(false)
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-lg border-b border-neutral-200 dark:border-neutral-700' : 'bg-transparent'}`}>
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 relative">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-primary-800 dark:text-primary-100 group-hover:text-primary-900 dark:group-hover:text-primary-200 transition-colors duration-300">MysteryPieces</span>
              </Link>
              <div className="hidden lg:flex items-center space-x-8">
                {navigation.filter(item => item.name === 'Home').map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.name} href={item.href} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 group relative ${active ? 'text-primary-700' : 'text-neutral-600 hover:text-primary-700'}`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.name}</span>
                      {active ? (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" initial={false} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                      ) : (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                      )}
                    </Link>
                  )
                })}
                <div className="relative">
                  <button onClick={() => setIsPortalsOpen(!isPortalsOpen)} onMouseEnter={() => setIsPortalsOpen(true)} onMouseLeave={() => setIsPortalsOpen(false)} className={`flex items-center space-x-2 px-3 py-2 transition-all duration-300 group relative ${portalItems.some(item => isActive(item.href)) ? 'text-primary-700' : 'text-neutral-600 hover:text-primary-700'}`}>
                    <Globe className="w-4 h-4" />
                    <span className="font-medium">Portals</span>
                    <span className="text-sm">⇓</span>
                    {portalItems.some(item => isActive(item.href)) ? (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" initial={false} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    ) : (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isPortalsOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onMouseEnter={() => setIsPortalsOpen(true)} onMouseLeave={() => setIsPortalsOpen(false)} className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50">
                        <div className="py-2">
                          {portalItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                              <Link key={item.name} href={item.href} className={`flex items-center space-x-3 px-4 py-3 hover:bg-primary-50 transition-all duration-200 ${active ? 'text-primary-700 bg-primary-50' : 'text-neutral-600'}`}>
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{item.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {navigation.filter(item => item.name === 'About Us').map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.name} href={item.href} className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 group relative ${active ? 'text-primary-700' : 'text-neutral-600 hover:text-primary-700'}`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.name}</span>
                      {active ? (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" initial={false} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                      ) : (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="hidden lg:flex items-center space-x-8">
              <div className="relative" ref={searchRef}>
                <button onClick={isSearchOpen ? handleSearchSubmit : toggleSearch} className="p-2 text-neutral-600 hover:text-primary-700 transition-all duration-200" type={isSearchOpen ? 'submit' : 'button'}>
                  <HiSearch className="w-5 h-5" />
                </button>
                {isSearchOpen && (
                  <form onSubmit={handleSearchSubmit} className="navbar-search-form inline-flex items-center">
                    <div className="search-input-wrapper">
                      {isSearchOpen && (
                        <button type="button" onClick={clearSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 p-1 text-neutral-500 hover:text-neutral-700 transition-colors duration-200">
                          <HiX className="w-4 h-4" />
                        </button>
                      )}
                      <input type="text" placeholder="Search fashion items" value={searchQuery} onChange={handleSearchChange} className={`navbar-search-input ${isSearchOpen ? 'pl-10' : 'pl-4'}`} autoFocus />
                      {showSuggestions && (
                        <div className="search-suggestions absolute top-full left-0 mt-2">
                          {filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map((item) => (
                              <div key={`${item.product.id}-${item.product.name}`} className="suggestion-item" onClick={() => handleSuggestionClick(item.href)}>
                                <span className="suggestion-category">{item.category} • {item.section}</span>
                                <span className="suggestion-title">{item.product.name} - {item.product.brand}</span>
                              </div>
                            ))
                          ) : (
                            <div className="suggestion-item no-results">No Results for "{searchQuery}"</div>
                          )}
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>
              <Link href="/cart" className="relative p-2 text-neutral-600 hover:text-primary-700 transition-all duration-200">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </Link>
              <SettingsDropdown />
            </div>

            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden absolute right-0 p-2 text-neutral-600 hover:text-primary-700 transition-colors duration-200 relative w-10 h-10 flex items-center justify-center">
              <div className="relative w-6 h-5 flex flex-col justify-between">
                <motion.span
                  animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute top-0 left-0 w-full h-0.5 bg-current rounded-full origin-center"
                />
                <motion.span
                  animate={isOpen ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute top-1/2 left-0 w-full h-0.5 bg-current rounded-full origin-center -translate-y-1/2"
                />
                <motion.span
                  animate={isOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-full origin-center"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" 
              onClick={closeMenu} 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
              className="fixed top-0 right-0 h-[70vh] w-80 bg-white dark:bg-neutral-800 shadow-2xl z-50 lg:hidden rounded-l-2xl overflow-y-auto"
            >
              {/* Close Button */}
              <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 px-6 py-4 flex justify-end">
                <button 
                  onClick={closeMenu} 
                  className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-all duration-200"
                >
                  <motion.div className="relative w-5 h-5 flex flex-col justify-between">
                    <motion.span
                      animate={{ rotate: 45, y: 6 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="absolute top-0 left-0 w-full h-0.5 bg-current rounded-full origin-center"
                    />
                    <motion.span
                      animate={{ rotate: -45, y: -6 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-full origin-center"
                    />
                  </motion.div>
                </button>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Navigation Links */}
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={closeMenu}
                        className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                          active
                            ? 'bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/50 dark:to-primary-800/30 text-primary-700 dark:text-primary-300 shadow-sm'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-50 dark:hover:from-neutral-700 dark:hover:to-neutral-700/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg transition-all duration-200 ${
                          active 
                            ? 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300' 
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/50 group-hover:text-primary-600 dark:group-hover:text-primary-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`font-medium flex-1 ${active ? 'text-primary-800 dark:text-primary-200' : ''}`}>{item.name}</span>
                        {active && (
                          <motion.div 
                            layoutId="mobileActiveIndicator"
                            className="absolute right-4 w-2 h-2 bg-primary-600 rounded-full"
                            initial={false}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-600 to-transparent my-4"></div>

                {/* Portals Section */}
                <div className="space-y-1">
                  <button
                    onClick={() => setIsPortalsOpen(!isPortalsOpen)}
                    className="group flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 text-neutral-700 dark:text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-50 dark:hover:from-neutral-700 dark:hover:to-neutral-700/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/50 transition-colors duration-200">
                        <Globe className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-300" />
                      </div>
                      <span className="font-medium">Portals</span>
                    </div>
                    <motion.span 
                      animate={{ rotate: isPortalsOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="text-primary-600 dark:text-primary-400"
                    >
                      ⇓
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isPortalsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pt-2 space-y-1">
                          {portalItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={closeMenu}
                                className={`group flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                                  active
                                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                                }`}
                              >
                                <Icon className={`w-4 h-4 ${active ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                                <span className={`font-medium text-sm ${active ? 'text-primary-800 dark:text-primary-200' : ''}`}>{item.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-600 to-transparent my-4"></div>

                {/* Mobile Search */}
                <div className="relative" ref={searchRef}>
                  <button onClick={isSearchOpen ? handleSearchSubmit : toggleSearch} className="group flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-neutral-700 dark:text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-50 dark:hover:from-neutral-700 dark:hover:to-neutral-700/50" type={isSearchOpen ? 'submit' : 'button'}>
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/50 transition-colors duration-200">
                      <HiSearch className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-300" />
                    </div>
                    <span className="font-medium flex-1 text-left">Search</span>
                  </button>
                  {isSearchOpen && (
                    <form onSubmit={handleSearchSubmit} className="navbar-search-form mt-2 inline-flex items-center w-full">
                      <div className="search-input-wrapper w-full">
                        {isSearchOpen && (
                          <button type="button" onClick={clearSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors duration-200">
                            <HiX className="w-4 h-4" />
                          </button>
                        )}
                        <input type="text" placeholder="Search fashion items" value={searchQuery} onChange={handleSearchChange} className={`navbar-search-input w-full ${isSearchOpen ? 'pl-10' : 'pl-4'}`} autoFocus />
                        {showSuggestions && (
                          <div className="search-suggestions absolute top-full left-0 mt-2 w-full">
                            {filteredSuggestions.length > 0 ? (
                              filteredSuggestions.map((item) => (
                                <div key={`${item.product.id}-${item.product.name}`} className="suggestion-item" onClick={() => handleSuggestionClick(item.href)}>
                                  <span className="suggestion-category">{item.category} • {item.section}</span>
                                  <span className="suggestion-title">{item.product.name} - {item.product.brand}</span>
                                </div>
                              ))
                            ) : (
                              <div className="suggestion-item no-results">No Results for "{searchQuery}"</div>
                            )}
                          </div>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-600 to-transparent my-4"></div>

                {/* Mobile Cart */}
                <div className="space-y-1">
                  <Link
                    href="/cart"
                    onClick={closeMenu}
                    className="group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-neutral-700 dark:text-neutral-300 hover:bg-gradient-to-r hover:from-neutral-100 hover:to-neutral-50 dark:hover:from-neutral-700 dark:hover:to-neutral-700/50 relative overflow-hidden"
                  >
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/50 transition-colors duration-200">
                      <ShoppingCart className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-300" />
                    </div>
                    <span className="font-medium flex-1">Cart</span>
                    {cartCount > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-gradient-to-br from-primary-600 to-primary-700 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
                      >
                        {cartCount > 99 ? '99+' : cartCount}
                      </motion.span>
                    )}
                  </Link>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-600 to-transparent my-4"></div>

                {/* Mobile Settings */}
                <div className="space-y-1">
                  <div className="px-4 py-3">
                    <SettingsDropdown />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


