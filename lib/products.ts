// lib/products.ts - Product management for admin

export interface Product {
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

export class ProductManager {
  private static PRODUCTS_KEY = 'fusioncraft_products'

  static getProducts(): any {
    if (typeof window === 'undefined') return { products: {} }
    const productsData = localStorage.getItem(this.PRODUCTS_KEY)
    if (productsData) {
      return JSON.parse(productsData)
    }
    // Initialize with default products from JSON file
    return { products: {} }
  }

  static saveProducts(products: any): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products))
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }

  static addProduct(product: Product): boolean {
    try {
      const productsData = this.getProducts()
      
      if (!productsData.products[product.category]) {
        productsData.products[product.category] = {
          title: product.category.charAt(0).toUpperCase() + product.category.slice(1),
          description: '',
          subcategories: {}
        }
      }
      
      if (!productsData.products[product.category].subcategories[product.section]) {
        productsData.products[product.category].subcategories[product.section] = []
      }
      
      productsData.products[product.category].subcategories[product.section].push(product)
      this.saveProducts(productsData)
      return true
    } catch (error) {
      console.error('Error adding product:', error)
      return false
    }
  }

  static deleteProduct(productId: string, category: string, section: string): boolean {
    try {
      const productsData = this.getProducts()
      
      if (productsData.products[category]?.subcategories[section]) {
        productsData.products[category].subcategories[section] = 
          productsData.products[category].subcategories[section].filter(
            (p: Product) => p.id !== productId
          )
        this.saveProducts(productsData)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting product:', error)
      return false
    }
  }

  static getAllProductsArray(): Product[] {
    const productsData = this.getProducts()
    const allProducts: Product[] = []
    
    Object.keys(productsData.products || {}).forEach(category => {
      Object.keys(productsData.products[category].subcategories || {}).forEach(section => {
        productsData.products[category].subcategories[section].forEach((product: Product) => {
          allProducts.push(product)
        })
      })
    })
    
    return allProducts
  }
}

