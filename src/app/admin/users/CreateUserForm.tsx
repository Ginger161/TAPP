'use client'

import { useState } from 'react'
import { createUser } from './actions'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'
import CustomDropdown from '@/components/CustomDropdown'

export default function CreateUserForm({ stations }: { stations: { id: string, name: string }[] | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    const result = await catchNetworkError(createUser(formData))
    setIsSubmitting(false)

    if (result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Account created successfully!')
      ;(document.getElementById('create-user-form') as HTMLFormElement).reset()
    }
  }

  return (
    <form id="create-user-form" action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email</label>
        <input required id="email" name="email" type="email" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="password">Temporary Password</label>
        <input required id="password" name="password" type="password" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-tycoon-red" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="role">Role</label>
        <CustomDropdown
          id="role"
          name="role"
          defaultValue="manager"
          options={[
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Admin' },
            { value: 'viewer', label: 'Viewer' }
          ]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="stationId">Station Assignment (if Manager)</label>
        <CustomDropdown
          id="stationId"
          name="stationId"
          defaultValue=""
          options={[
            { value: '', label: 'None' },
            ...(stations?.map(s => ({ value: s.id, label: s.name })) || [])
          ]}
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="canSupply" name="canSupply" className="rounded text-tycoon-red" />
        <label className="text-sm font-medium" htmlFor="canSupply">Grant Supply Permission (Viewer Only)</label>
      </div>

      <button disabled={isSubmitting} className="w-full bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 rounded-lg shadow-sm transition-colors mt-4 disabled:opacity-50">
        {isSubmitting ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  )
}
