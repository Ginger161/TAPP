'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, toggleViewerSupplyPermission } from './actions'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'
import CustomDropdown from '@/components/CustomDropdown'

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
            currentRole === 'manager' ? 'bg-gray-100 text-tycoon-red' :
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
      <CustomDropdown
        value={currentRole}
        disabled={isPending}
        onChange={(newRole) => {
          startTransition(async () => {
            const result = await catchNetworkError(updateUserRole(userId, newRole))
            if (result && result.error) toast.error(result.error)
            else toast.success('Role updated successfully')
          })
        }}
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'manager', label: 'Manager' },
          { value: 'viewer', label: 'Viewer' }
        ]}
      />

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
            className="rounded text-tycoon-red"
          />
          Can Supply
        </label>
      )}
    </div>
  )
}
