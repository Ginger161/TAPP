import { createClient } from '@/utils/supabase/server'
import { createUser } from './actions'
import { redirect } from 'next/navigation'
import { Users, Shield, MapPin, Plus, Store } from 'lucide-react'
import StationAssignmentsDndClient from './StationAssignmentsDndClient'
import { createAdminClient } from '@/utils/supabase/admin'
import UserRowClient from './UserRowClient'
import CreateUserForm from './CreateUserForm'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('users')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/dashboard')
  const isSuperAdmin = !!roleData?.is_super_admin

  // Fetch stations for the assignment dropdown
  const { data: stations } = await supabase.from('stations').select('id, name')
  // Fetch existing users
  const { data: usersData } = await supabase.from('users').select(`
    id,
    role,
    can_supply,
    station_assignments ( stations ( id, name ) )
  `)

  // Fetch auth users using Admin API to get emails
  const adminClient = createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
  const authUsers = authData?.users || []

  // Create an email lookup map
  const emailMap: Record<string, string> = {}
  authUsers.forEach(au => {
    emailMap[au.id] = au.email || au.id
  })

  // Aggregate stations and their current assigned managers
  const assignedManagerMap: Record<string, string[]> = {}
  
  usersData?.forEach(u => {
    if (u.role === 'manager' && u.station_assignments && u.station_assignments.length > 0) {
      // @ts-expect-error - Join type
      const stationId = u.station_assignments[0].stations?.id
      if (stationId) {
        if (!assignedManagerMap[stationId]) {
          assignedManagerMap[stationId] = []
        }
        assignedManagerMap[stationId].push(u.id)
      }
    }
  })

  const stationAssignments = stations?.map(s => ({
    id: s.id,
    name: s.name,
    assignedManagerIds: assignedManagerMap[s.id] || []
  })) || []

  const managerUsers = usersData?.filter(u => u.role === 'manager').map(u => ({
    id: u.id,
    email: emailMap[u.id] || u.id
  })) || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            User Management
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2 font-medium">Create accounts and assign station managers.</p>
        </div>

        <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-3' : ''} gap-8`}>
          {/* Create User Form */}
          {isSuperAdmin && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-tycoon-red" />
              New User
            </h2>
            <CreateUserForm stations={stations} />
          </div>
          )}

          {/* User List */}
          <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 ${isSuperAdmin ? 'lg:col-span-2' : 'w-full'}`}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-tycoon-navy" />
              Active Accounts
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Email</th>
                    <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Role</th>
                    <th className="pb-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">Station / Perms</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {usersData?.map(u => (
                    <tr key={u.id}>
                      <td className="py-4 text-slate-800 font-medium dark:text-gray-100">{emailMap[u.id] || u.id}</td>
                      <td className="py-4">
                        <UserRowClient 
                          userId={u.id} 
                          currentRole={u.role} 
                          canSupply={u.can_supply} 
                          isSuperAdmin={isSuperAdmin} 
                        />
                      </td>
                      <td className="py-4">
                        {u.role === 'manager' && u.station_assignments?.[0] ? (
                          <span className="flex items-center gap-1 text-slate-600 font-medium dark:text-gray-300">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {/* @ts-expect-error - Supabase join types are limited */}
                            {u.station_assignments[0].stations?.name}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Station Assignments Grid */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-tycoon-navy" />
              Station Assignments
            </h2>
            {!isSuperAdmin && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">Read Only</span>
            )}
          </div>
          {isSuperAdmin ? (
            <StationAssignmentsDndClient stations={stationAssignments} managers={managerUsers} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stationAssignments.map(station => (
                <div key={station.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-3">{station.name}</h3>
                  {station.assignedManagerIds.length > 0 ? (
                    <div className="space-y-2">
                      {station.assignedManagerIds.map(managerId => (
                        <div key={managerId} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          {emailMap[managerId] || managerId}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">No managers assigned</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
