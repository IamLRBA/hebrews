'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Package, DollarSign, ShoppingCart, Users, BarChart3, LogOut } from 'lucide-react'
import { AuthManager } from '@/lib/auth'
import { ProductManager, type Product } from '@/lib/products'
import { OrderManager, type Order } from '@/lib/cart'

const categories = ['shirts', 'tees', 'coats', 'pants-and-shorts', 'footwear', 'accessories']
const subcategoriesMap: Record<string, string[]> = {
  'shirts': ['gentle', 'checked', 'textured', 'denim'],
  'tees': ['plain', 'graphic', 'collared', 'sporty'],
  'coats': ['sweater', 'hoodie', 'coat', 'jacket'],
  'pants-and-shorts': ['gentle', 'denim', 'cargo', 'sporty'],
  'footwear': ['gentle', 'sneakers', 'sandals', 'boots'],
  'accessories': ['rings-necklaces', 'shades-glasses', 'bracelets-watches', 'decor']
}

const conditions = ['Like New', 'Good', 'Fair', 'Worn']

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    category: 'shirts',
    section: 'gentle',
    price_ugx: '',
    original_price: '',
    sizes: [] as string[],
    colors: [] as string[],
    images: [''],
    description: '',
    condition: 'Like New',
    sku: '',
    stock_qty: ''
  })
  const router = useRouter()

  useEffect(() => {
    if (!AuthManager.isAdmin()) {
      router.push('/admin/login')
      return
    }
    setIsAdmin(true)
    loadData()
  }, [router])

  const loadData = () => {
    setProducts(ProductManager.getAllProductsArray())
    setOrders(OrderManager.getOrders())
  }

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    
    const product: Product = {
      id: `${newProduct.category}-${newProduct.section}-${Date.now()}`,
      name: newProduct.name,
      brand: newProduct.brand,
      category: newProduct.category,
      section: newProduct.section,
      price_ugx: parseInt(newProduct.price_ugx),
      original_price: newProduct.original_price ? parseInt(newProduct.original_price) : undefined,
      sizes: newProduct.sizes,
      colors: newProduct.colors,
      images: newProduct.images.filter(img => img.trim()),
      description: newProduct.description,
      condition: newProduct.condition,
      sku: newProduct.sku || `${newProduct.category.substring(0, 3).toUpperCase()}-${newProduct.section.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`,
      stock_qty: parseInt(newProduct.stock_qty) || 1
    }

    if (ProductManager.addProduct(product)) {
      alert('Product added successfully!')
      setShowAddForm(false)
      setNewProduct({
        name: '',
        brand: '',
        category: 'shirts',
        section: 'gentle',
        price_ugx: '',
        original_price: '',
        sizes: [],
        colors: [],
        images: [''],
        description: '',
        condition: 'Like New',
        sku: '',
        stock_qty: ''
      })
      loadData()
    } else {
      alert('Error adding product')
    }
  }

  const handleDeleteProduct = (productId: string, category: string, section: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      if (ProductManager.deleteProduct(productId, category, section)) {
        alert('Product deleted successfully!')
        loadData()
      } else {
        alert('Error deleting product')
      }
    }
  }

  const handleLogout = () => {
    AuthManager.adminLogout()
    router.push('/')
  }

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    totalItemsSold: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 pt-24 pb-20">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center space-x-2 text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        <h1 className="text-4xl font-bold text-primary-800 dark:text-primary-100 mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Products</p>
                <p className="text-3xl font-bold text-primary-800">{stats.totalProducts}</p>
              </div>
              <Package className="w-12 h-12 text-primary-600" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Orders</p>
                <p className="text-3xl font-bold text-primary-800">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-primary-600" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Revenue</p>
                <p className="text-3xl font-bold text-primary-800">UGX {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-primary-600" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Items Sold</p>
                <p className="text-3xl font-bold text-primary-800">{stats.totalItemsSold}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-primary-600" />
            </div>
          </motion.div>
        </div>

        {/* Add Product Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{showAddForm ? 'Cancel' : 'Add New Product'}</span>
          </button>
        </div>

        {/* Add Product Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-800 rounded-xl p-8 shadow-lg mb-8"
          >
            <h2 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-6">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Brand *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    required
                    value={newProduct.category}
                    onChange={(e) => {
                      setNewProduct({ ...newProduct, category: e.target.value, section: subcategoriesMap[e.target.value]?.[0] || '' })
                    }}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subcategory *</label>
                  <select
                    required
                    value={newProduct.section}
                    onChange={(e) => setNewProduct({ ...newProduct, section: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  >
                    {subcategoriesMap[newProduct.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub.charAt(0).toUpperCase() + sub.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (UGX) *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price_ugx}
                    onChange={(e) => setNewProduct({ ...newProduct, price_ugx: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Original Price (UGX)</label>
                  <input
                    type="number"
                    value={newProduct.original_price}
                    onChange={(e) => setNewProduct({ ...newProduct, original_price: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sizes (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    placeholder="S, M, L, XL"
                    value={newProduct.sizes.join(', ')}
                    onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Colors (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Red, Blue, Black"
                    value={newProduct.colors.join(', ')}
                    onChange={(e) => setNewProduct({ ...newProduct, colors: e.target.value.split(',').map(c => c.trim()).filter(c => c) })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Condition *</label>
                  <select
                    required
                    value={newProduct.condition}
                    onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  >
                    {conditions.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_qty}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_qty: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SKU</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Images (URLs, one per line) *</label>
                <textarea
                  required
                  rows={3}
                  value={newProduct.images.join('\n')}
                  onChange={(e) => setNewProduct({ ...newProduct, images: e.target.value.split('\n').filter(img => img.trim()) })}
                  placeholder="/assets/images/products/shirts/gentle/1.jpg"
                  className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg dark:bg-neutral-700 dark:text-white"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Add Product
              </button>
            </form>
          </motion.div>
        )}

        {/* Products List */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-6">All Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">No products yet. Add your first product!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4">Price</th>
                    <th className="text-left p-4">Stock</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="p-4">{product.name}</td>
                      <td className="p-4">{product.category} / {product.section}</td>
                      <td className="p-4">UGX {product.price_ugx.toLocaleString()}</td>
                      <td className="p-4">{product.stock_qty}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.category, product.section)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

