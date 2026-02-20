'use client'

import { useEffect, useState, useRef } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Plus, Edit, UserCheck, UserX, Search, X } from 'lucide-react'
import { StaffModal } from '@/components/admin/StaffModal'

type Staff = {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [])

  async function fetchStaff() {
    try {
      const res = await posFetch('/api/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      }
    } catch (e) {
      console.error('Failed to fetch staff:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(staffId: string, currentStatus: boolean) {
    try {
      const res = await posFetch(`/api/staff/${staffId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        fetchStaff()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to update staff status')
      }
    } catch (e) {
      alert('Failed to update staff status')
    }
  }

  function handleEdit(staffMember: Staff) {
    setEditingStaff(staffMember)
    setShowModal(true)
  }

  function handleAdd() {
    setEditingStaff(null)
    setShowModal(true)
  }

  const filteredStaff = staff.filter(
    (s) =>
      (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (s.username || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  )
  const searchSuggestions = searchQuery.trim()
    ? staff.filter(
        (s) =>
          (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
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
                Staff Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Manage staff accounts and permissions
              </p>
              <button
                onClick={handleAdd}
                className="btn btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Add Staff
              </button>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="relative w-full max-w-md" ref={searchWrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by staff name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="pos-input pl-10 pr-10 w-full"
                  aria-label="Search staff by name"
                />
                {searchQuery.length > 0 && (
                  <button type="button" onClick={() => { setSearchQuery(''); setSearchFocused(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600" aria-label="Clear search">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showSearchSuggestions && (
                  <ul className="absolute z-50 w-full mt-1 top-full left-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchSuggestions.length === 0 ? <li className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</li> : searchSuggestions.map((s) => (
                      <li key={s.id}><button type="button" className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30" onClick={() => { setSearchQuery(s.fullName || s.username); setSearchFocused(false) }}>{s.fullName} ({s.username})</button></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : (
                <div className="pos-data-table-wrap border-2 border-neutral-200 dark:border-neutral-800">
                  <table className="w-full">
                    <thead className="bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tl-lg">
                          Username
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Full Name
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Role
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Status
                        </th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-tr-lg">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((member) => (
                        <tr
                          key={member.id}
                          className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        >
                          <td className="py-4 px-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {member.username}
                          </td>
                          <td className="py-4 px-6 text-sm text-neutral-600 dark:text-neutral-400">
                            {member.fullName}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                              {member.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.isActive
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(member.id, member.isActive)}
                                className="btn btn-outline p-2"
                                title={member.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {member.isActive ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEdit(member)}
                                className="btn btn-outline p-2"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <StaffModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingStaff(null)
        }}
        onSuccess={fetchStaff}
        staff={editingStaff}
      />
    </RoleGuard>
  )
}
