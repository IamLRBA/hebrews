'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { posFetch } from '@/lib/pos-client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { CATEGORIES, CATEGORY_SECTIONS } from '@/lib/product-categories'

type Product = {
  productId?: string
  id?: string
  name: string
  category: string
  section: string
  priceUgx: number
  stockQty?: number
  isActive?: boolean
  images?: string[]
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product?: Product | null
}

export function ProductModal({ isOpen, onClose, onSuccess, product }: ProductModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Food')
  const [section, setSection] = useState('')
  const [priceUgx, setPriceUgx] = useState(0)
  const [stockQty, setStockQty] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const sectionsForCategory = CATEGORY_SECTIONS[category] || []

  useEffect(() => {
    if (product) {
      setName(product.name)
      setCategory(product.category || 'Food')
      setSection(product.section || '')
      setPriceUgx(Number(product.priceUgx) || 0)
      setStockQty(Number(product.stockQty) ?? 0)
      setIsActive(product.isActive !== false)
      setImageUrl(product.images?.[0] ?? '')
    } else {
      setName('')
      setCategory('Food')
      setSection('')
      setPriceUgx(0)
      setStockQty(0)
      setIsActive(true)
      setImageUrl('')
    }
    setError(null)
  }, [product, isOpen])

  useEffect(() => {
    if (!sectionsForCategory.includes(section)) setSection(sectionsForCategory[0] ?? '')
  }, [category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const id = product?.productId ?? product?.id
      const images = imageUrl.trim() ? [imageUrl.trim()] : []
      const payload = { name: name.trim(), category: category.trim(), section: section.trim(), priceUgx, stockQty, isActive, images }
      if (id) {
        const res = await posFetch(`/api/admin/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Failed to update product') }
      } else {
        const res = await posFetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Failed to create product') }
      }
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 bg-transparent hover:bg-neutral-100 dark:hover:bg-transparent" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
          <label className="block"><span className="pos-label">Name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="pos-input mt-1 w-full" required /></label>

          <label className="block">
            <span className="pos-label">Category</span>
            <div className="relative mt-1">
              <select value={category} onFocus={() => setCategoryDropdownOpen(true)} onBlur={() => setCategoryDropdownOpen(false)} onChange={(e) => { setCategory(e.target.value); setCategoryDropdownOpen(false) }} className="pos-input w-full pr-10 appearance-none" required>
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">{categoryDropdownOpen ? '⇑' : '⇓'}</span>
            </div>
          </label>
          <label className="block">
            <span className="pos-label">Section</span>
            <div className="relative mt-1">
              <select value={section} onFocus={() => setSectionDropdownOpen(true)} onBlur={() => setSectionDropdownOpen(false)} onChange={(e) => { setSection(e.target.value); setSectionDropdownOpen(false) }} className="pos-input w-full pr-10 appearance-none" required>
                {sectionsForCategory.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">{sectionDropdownOpen ? '⇑' : '⇓'}</span>
            </div>
          </label>

          <label className="block"><span className="pos-label">Price (UGX)</span><div className="mt-1"><QuantityStepper value={priceUgx} min={0} onChange={setPriceUgx} ariaLabel="Price" /></div></label>
          <label className="block"><span className="pos-label">Stock</span><div className="mt-1"><QuantityStepper value={stockQty} min={0} onChange={setStockQty} ariaLabel="Stock" /></div></label>

          <div className="block">
            <span className="pos-label">Image</span>
            <div className="mt-1 space-y-2">
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl.startsWith('data:') ? imageUrl : imageUrl.startsWith('http') || imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`} alt="Product" className="w-24 h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700" />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setImageUrl('')} className="btn btn-outline text-sm py-1.5">Delete image</button>
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline text-sm py-1.5">Change image</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-24 h-24 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 text-sm">No image</div>
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline text-sm mt-2 py-1.5">Add image</button>
                </div>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setImageUrl(String(r.result)); r.readAsDataURL(f) }; e.target.value = '' }} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-2 accent-primary-600 dark:border-neutral-600 bg-white dark:bg-neutral-800" /><span className="pos-label">Active</span></label>
          <div className="flex gap-3 pt-4">
            {product && (product.productId || product.id) && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-outline text-red-600 dark:text-red-400 flex-1" disabled={loading}>Delete</button>
            )}
            <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>{loading ? 'Saving...' : product ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete product"
        message="Are you sure you want to delete this product?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowDeleteConfirm(false)
          const id = product?.productId ?? product?.id
          if (!id) return
          const res = await posFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
          if (res.ok) { onSuccess(); onClose() }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
