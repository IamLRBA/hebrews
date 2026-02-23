'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { posFetch } from '@/lib/pos-client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type Staff = {
  id?: string
  username: string
  fullName: string
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'bar'
  password?: string
  isActive: boolean
}

interface StaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  staff?: Staff | null
}

export function StaffModal({ isOpen, onClose, onSuccess, staff }: StaffModalProps) {
  const [formData, setFormData] = useState<Staff>({
    username: '',
    fullName: '',
    role: 'cashier',
    password: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (staff) {
      setFormData({
        id: staff.id,
        username: staff.username,
        fullName: staff.fullName,
        role: staff.role,
        password: '',
        isActive: staff.isActive,
      })
    } else {
      setFormData({
        username: '',
        fullName: '',
        role: 'cashier',
        password: '',
        isActive: true,
      })
    }
    setError(null)
  }, [staff, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (staff?.id) {
        // Update existing staff
        const updateData: any = {
          username: formData.username,
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
        }
        if (formData.password && formData.password.length > 0) {
          updateData.password = formData.password
        }

        const res = await posFetch(`/api/staff/${staff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update staff')
        }
      } else {
        // Create new staff
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        const res = await posFetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            fullName: formData.fullName,
            role: formData.role,
            password: formData.password,
            isActive: formData.isActive,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create staff')
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {staff?.id ? 'Edit Staff' : 'Add Staff'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 bg-transparent hover:bg-neutral-100 dark:hover:bg-transparent"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <label className="block">
            <span className="pos-label">Username</span>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="pos-input mt-1 w-full"
              required
            />
          </label>

          <label className="block">
            <span className="pos-label">Full Name</span>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="pos-input mt-1 w-full"
              required
            />
          </label>

          <label className="block">
            <span className="pos-label">Role</span>
            <div className="relative mt-1">
              <select
                value={formData.role}
                onFocus={() => setRoleDropdownOpen(true)}
                onBlur={() => setRoleDropdownOpen(false)}
                onChange={(e) => { setFormData({ ...formData, role: e.target.value as any }); setRoleDropdownOpen(false) }}
                className="pos-input w-full pr-10 appearance-none"
                required
              >
                <option value="cashier">Cashier</option>
                <option value="kitchen">Kitchen</option>
                <option value="bar">Bar</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                {roleDropdownOpen ? '⇑' : '⇓'}
              </span>
            </div>
          </label>

          <label className="block">
            <span className="pos-label">
              Password {staff?.id && '(leave blank to keep current)'}
            </span>
            <input
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pos-input mt-1 w-full"
              required={!staff?.id}
              minLength={6}
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500 focus:ring-2 accent-primary-600 bg-white dark:bg-neutral-800"
            />
            <span className="pos-label">Active</span>
          </label>

          <div className="flex gap-3 pt-4">
            {staff?.id && (
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-outline flex-1" disabled={loading}>Delete</button>
            )}
            <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>{loading ? 'Saving...' : staff?.id ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete staff"
        message={`Are you sure you want to delete ${formData.fullName || formData.username}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowDeleteConfirm(false)
          if (!staff?.id) return
          const res = await posFetch(`/api/staff/${staff.id}`, { method: 'DELETE' })
          if (res.ok) {
            onSuccess()
            onClose()
          } else {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Failed to delete staff')
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
