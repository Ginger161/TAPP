'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNotification } from '@/utils/notifications'

export async function createSupply(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Verify the user is either admin or viewer with can_supply
  const { data: roleData } = await supabase
    .from('users')
    .select('role, can_supply')
    .eq('id', user.id)
    .single()

  if (roleData?.role !== 'admin' && !(roleData?.role === 'viewer' && roleData?.can_supply)) {
    return { success: false, error: 'Unauthorized to create supply' }
  }

  const stationId = formData.get('stationId') as string
  const productId = formData.get('productId') as string
  const quantity = parseFloat(formData.get('quantity') as string)
  const costPrice = parseFloat(formData.get('costPrice') as string)
  const supplier = formData.get('supplier') as string
  const date = formData.get('date') as string || new Date().toISOString().split('T')[0]

  if (!stationId || !productId || isNaN(quantity) || isNaN(costPrice) || !supplier) {
    return { success: false, error: 'Invalid input data' }
  }

  const { error } = await supabase.from('supply_transactions').insert({
    station_id: stationId,
    product_id: productId,
    quantity,
    cost_price: costPrice,
    supplier,
    date,
    status: 'pending',
    initiator_id: user.id,
  })

  if (error) {
    console.error('Error creating supply:', error)
    return { success: false, error: error.message }
  }

  // Phase 7: Trigger notification to Manager
  const { data: assignment } = await supabase
    .from('station_assignments')
    .select('user_id')
    .eq('station_id', stationId)
    .single()

  const { data: productData } = await supabase.from('products').select('name').eq('id', productId).single()
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single()

  if (assignment) {
    await createNotification({
      title: 'New Supply Pending',
      message: `A supply of ${quantity}L ${productData?.name || 'Product'} has been dispatched to ${stationData?.name || 'your station'}. Please review and accept.`,
      type: 'supply',
      recipient_id: assignment.user_id,
      station_id: stationId,
      product_id: productId
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/admin/supplies/new')
  return { success: true }
}
