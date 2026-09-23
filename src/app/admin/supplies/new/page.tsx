import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, Plus } from 'lucide-react'
import NewSupplyFormClient from './NewSupplyFormClient'

export default async function NewSupplyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('users')
    .select('role, can_supply')
    .eq('id', user.id)
    .single()

  if (roleData?.role !== 'admin' && !(roleData?.role === 'viewer' && roleData?.can_supply)) {
    redirect('/dashboard')
  }

  // Fetch stations and products
  const { data: stations } = await supabase.from('stations').select('id, name')
  const { data: products } = await supabase.from('products').select('id, name')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-tycoon-red" />
            Initiate Supply
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Create a new supply transaction. It will remain pending until a manager accepts it.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-tycoon-red" />
            New Supply Record
          </h2>
          <NewSupplyFormClient stations={stations} products={products} />
        </div>
      </div>
    </div>
  )
}
