import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SubmitClient from './SubmitClient'
import { FileEdit } from 'lucide-react'
import { Suspense } from 'react'

export default async function ManagerSubmitPage() {
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

  const { data: products } = await supabase.from('products').select('id, name')

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-tycoon-charcoal flex items-center gap-3">
          <FileEdit className="w-6 h-6 text-red-600" />
          Submit Daily Records
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter your daily sales and any station expenses.
        </p>
      </div>
      <Suspense fallback={<div className="text-center p-4">Loading form...</div>}>
        <SubmitClient products={products || []} />
      </Suspense>
    </div>
  )
}
