'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { posFetch } from '@/lib/pos-client'
import { QuantityStepper } from '@/components/ui/QuantityStepper'

type Table = {
  id?: string
  tableId?: string
  code: string
  tableCode?: string
  capacity?: number | null
  images?: string[]
}

interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  table?: Table | null
}

export function TableModal({ isOpen, onClose, onSuccess, table }: TableModalProps) {
  const [code, setCode] = useState('')
  const [capacity, setCapacity] = useState(0)
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (table) {
      setCode(table.code ?? table.tableCode ?? '')
      setCapacity(table.capacity != null ? Number(table.capacity) : 0)
      setImageUrl(table.images?.[0] ?? '')
    } else {
      setCode('')
      setCapacity(0)
      setImageUrl('')
    }
    setError(null)
  }, [table, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const id = table?.id ?? table?.tableId
      const images = imageUrl.trim() ? [imageUrl.trim()] : []
      const payload = { code: code.trim(), capacity: capacity > 0 ? capacity : null, images }
      if (id) {
        const res = await posFetch(`/api/admin/tables/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update table')
        }
      } else {
        const res = await posFetch('/api/admin/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create table')
        }
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
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 text-center flex-1">
            {table ? 'Edit Table' : 'Add Table'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 bg-transparent hover:bg-neutral-100 dark:hover:bg-transparent shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 text-center flex flex-col items-center">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 w-full text-left">
              {error}
            </div>
          )}
          <label className="block w-full text-left">
            <span className="pos-label">Table code</span>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="pos-input mt-1 w-full" placeholder="e.g. T1, Booth I" required maxLength={16} />
          </label>
          <label className="block w-full text-left">
            <span className="pos-label">Capacity</span>
            <div className="mt-1 flex justify-center">
              <QuantityStepper value={capacity} min={0} onChange={setCapacity} ariaLabel="Capacity" />
            </div>
          </label>
          <div className="block w-full text-left">
            <span className="pos-label">Image</span>
            <div className="mt-1 space-y-2 flex flex-col items-center">
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl.startsWith('data:') ? imageUrl : imageUrl.startsWith('http') || imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`} alt="Table" className="w-24 h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700" />
                  <div className="flex gap-2 mt-2 justify-center">
                    <button type="button" onClick={() => setImageUrl('')} className="btn btn-outline text-sm py-1.5" disabled={uploadingImage}>Delete image</button>
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline text-sm py-1.5" disabled={uploadingImage}>{uploadingImage ? 'Uploading...' : 'Change image'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 text-sm">No image</div>
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline text-sm mt-2 py-1.5" disabled={uploadingImage}>{uploadingImage ? 'Uploading...' : 'Add image'}</button>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  e.target.value = ''
                  setUploadingImage(true)
                  setError(null)
                  try {
                    const formData = new FormData()
                    formData.append('file', f)
                    const res = await posFetch('/api/admin/upload/table-image', {
                      method: 'POST',
                      body: formData,
                    })
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}))
                      throw new Error(data.error || 'Upload failed')
                    }
                    const data = await res.json()
                    if (data.path) setImageUrl(data.path)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Upload failed')
                  } finally {
                    setUploadingImage(false)
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 w-full justify-center">
            <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>{loading ? 'Saving...' : table ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
