'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, toggleViewerSupplyPermission } from './actions'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'

export default function UserRowClient({
  userId,
  currentRole,
  canSupply,
  isSuperAdmin
}: {
  userId: string
  currentRole: string
  canSupply: boolean
  isSuperAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${currentRole === 'admin' ? 'bg-purple-100 text-purple-700' :
            currentRole === 'manager' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
          }`}>
          {currentRole.toUpperCase()}
        </span>
        {currentRole === 'viewer' && (
          <span className={`text-xs ${canSupply ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
            {canSupply ? 'Can Supply' : 'Cannot Supply'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={currentRole}
        disabled={isPending}
        onChange={(e) => {
          const newRole = e.target.value
          startTransition(async () => {
            const result = await catchNetworkError(updateUserRole(userId, newRole))
            if (result && result.error) toast.error(result.error)
            else toast.success('Role updated successfully')
          })
        }}
        className="px-2 py-1 text-sm border rounded bg-white shadow-sm disabled:opacity-50 outline-none"
      >
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="viewer">Viewer</option>
      </select>

      {currentRole === 'viewer' && (
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={canSupply}
            disabled={isPending}
            onChange={(e) => {
              const checked = e.target.checked
              startTransition(async () => {
                const result = await catchNetworkError(toggleViewerSupplyPermission(userId, checked))
                if (result && result.error) toast.error(result.error)
                else toast.success('Supply permissions updated')
              })
            }}
            className="rounded text-blue-500"
          />
          Can Supply
        </label>
      )}
    </div>
  )
}
