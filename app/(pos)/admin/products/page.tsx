'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Package, Plus, Edit, Search, X } from 'lucide-react'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await posFetch('/api/pos/products')
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (e) {
        console.error('Failed to fetch products:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const searchSuggestions = searchQuery.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : []
  const showSearchSuggestions = searchFocused && searchQuery.trim().length > 0

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="pos-page min-h-screen">
        <div className="pos-page-container">
          <AdminNavHeader />
          <main>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Product Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Manage products and inventory
              </p>
              <button className="btn btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-5 h-5" />
                Add Product
              </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-800 mb-6">
              <div className="relative" ref={searchWrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" aria-hidden />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="pos-input pl-10 pr-10 w-full"
                  aria-label="Search products"
                  aria-expanded={showSearchSuggestions}
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchFocused(false)
                      searchInputRef.current?.focus()
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showSearchSuggestions && (
                  <ul
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    role="listbox"
                  >
                    {searchSuggestions.length === 0 ? (
                      <li className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</li>
                    ) : (
                      searchSuggestions.map((product) => (
                        <li key={product.productId} role="option">
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none flex items-center gap-2"
                            onClick={() => {
                              setSearchQuery(product.name)
                              setSearchFocused(false)
                            }}
                          >
                            <div className="relative w-8 h-8 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                              <Image
                                src={product.images?.[0] || PLACEHOLDER_IMAGE}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            </div>
                            <span className="text-primary-700 dark:text-primary-300">{product.name}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Image
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Name
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Category
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Price
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Stock
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, idx) => (
                        <>
                          {idx > 0 && (
                            <tr key={`divider-${product.productId}`} className="border-t border-neutral-200 dark:border-neutral-800">
                              <td colSpan={7} className="py-0 px-6">
                                <div className="h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent"></div>
                              </td>
                            </tr>
                          )}
                          <tr
                            key={product.productId}
                            className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          >
                            <td className="py-4 px-6">
                              <div className="relative w-16 h-16 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                                <Image
                                  src={product.images?.[0] || PLACEHOLDER_IMAGE}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {product.name}
                            </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {product.category}
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-900 dark:text-neutral-100">
                            {product.priceUgx.toLocaleString()} UGX
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {product.stockQty || 0}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                product.isActive
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                              <button className="btn btn-outline p-2">
                                <Edit className="w-4 h-4" />
                              </button>
                          </td>
                        </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
