'use client'

import { useEffect, useState } from 'react'
import { RoleGuard } from '@/components/pos/RoleGuard'
import { AdminNavHeader } from '@/components/admin/AdminNavHeader'
import { posFetch } from '@/lib/pos-client'
import { Plus, Edit, UserCheck, UserX } from 'lucide-react'
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
                        <th className="text-left py-3 px-6 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
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
