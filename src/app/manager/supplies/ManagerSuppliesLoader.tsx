import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SupplyListClient from './SupplyListClient'
import { PackageSearch, History } from 'lucide-react'

export default async function ManagerSuppliesLoader() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleData?.role !== 'manager' && roleData?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get assigned station
  const { data: assignment } = await supabase
    .from('station_assignments')
    .select('station_id')
    .eq('user_id', user.id)
    .single()

  if (!assignment && roleData.role === 'manager') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No Station Assigned</h2>
          <p className="text-gray-500 mt-2">Please contact an administrator to assign you to a station.</p>
        </div>
      </div>
    )
  }

  const stationId = assignment?.station_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pendingTransactions: any[] = []
  let acceptedTransactions: any[] = []
  
  if (stationId) {
    const { data } = await supabase
      .from('supply_transactions')
      .select(`
        id,
        quantity,
        cost_price,
        supplier,
        date,
        status,
        products ( name )
      `)
      .eq('station_id', stationId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })

    if (data) {
      pendingTransactions = data.filter(tx => tx.status === 'pending')
      acceptedTransactions = data.filter(tx => tx.status === 'accepted')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-tycoon-charcoal flex items-center gap-3">
            <PackageSearch className="w-6 h-6 text-tycoon-navy" />
            Supply Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review incoming deliveries and view your station's received supplies history.
          </p>
        </div>

        <SupplyListClient 
          pendingTransactions={pendingTransactions} 
          acceptedTransactions={acceptedTransactions} 
        />
      </div>
    </div>
  )
}
