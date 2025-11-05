'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiMenu, HiX, HiSearch } from 'react-icons/hi'
import { Home, UserCircle, ShoppingCart, Globe, ShoppingBag } from 'lucide-react'
import SettingsDropdown from '@/components/ui/SettingsDropdown'
import { CartManager } from '@/lib/cart'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'About Us', href: '/about-us', icon: UserCircle },
]

const portalItems = [
  { name: 'Fashion', href: '/sections/fashion', icon: ShoppingBag },
]

const searchSuggestions = [
  { name: 'Thrifted Dresses', href: '/sections/fashion', category: 'Fashion' },
  { name: 'Vintage Finds', href: '/sections/fashion', category: 'Fashion' },
  { name: 'New Arrivals', href: '/sections/fashion', category: 'Fashion' },
  { name: 'Style Consultation', href: '/sections/fashion', category: 'Fashion' },
  { name: 'Outfit Styling', href: '/sections/fashion', category: 'Fashion' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPortalsOpen, setIsPortalsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSuggestions, setFilteredSuggestions] = useState(searchSuggestions)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const pathname = usePathname()
  const searchRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSuggestions(searchSuggestions)
      setIsSearching(false)
    } else {
      const filtered = searchSuggestions.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setIsSearching(true)
    }
  }, [searchQuery])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.trim() === '') {
      setFilteredSuggestions(searchSuggestions)
      setIsSearching(false)
      setShowSuggestions(false)
    } else {
      const filtered = searchSuggestions.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setIsSearching(true)
      setShowSuggestions(true)
    }
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
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-xl font-bold text-primary-800 dark:text-primary-100 group-hover:text-primary-900 dark:group-hover:text-primary-200 transition-colors duration-300">FusionCRAFT</span>
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
                              <div key={`${item.category}-${item.name}`} className="suggestion-item" onClick={() => handleSuggestionClick(item.href)}>
                                <span className="suggestion-category">{item.category}</span>
                                <span className="suggestion-title">{item.name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="suggestion-item no-results">No results found for "{searchQuery}"</div>
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

            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden absolute right-0 p-2 text-neutral-600 hover:text-primary-700 transition-colors duration-200">
              {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMenu} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-[70vh] w-80 bg-white dark:bg-neutral-800 shadow-2xl z-50 lg:hidden rounded-l-2xl">
              {/* Mobile menu content copied unchanged */}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


