'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/utils/notifications'
import { evaluateStockAndAlert } from '@/utils/stockAlerts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getManagerContext(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: assignment } = await supabase
    .from('station_assignments')
    .select('station_id')
    .eq('user_id', user.id)
    .single()

  if (!assignment) throw new Error('No station assigned to this user')

  return { userId: user.id, stationId: assignment.station_id }
}

export async function acceptSupply(transactionId: string) {
  const supabase = await createClient()
  const { userId, stationId } = await getManagerContext(supabase)

  // Verify the transaction belongs to the manager's station
  const { data: transaction } = await supabase
    .from('supply_transactions')
    .select('id, station_id, product_id, initiator_id, quantity, products(name)')
    .eq('id', transactionId)
    .single()

  if (!transaction || transaction.station_id !== stationId) {
    return { error: 'Invalid transaction or unauthorized' }
  }

  const { error } = await supabase
    .from('supply_transactions')
    .update({
      status: 'accepted',
      accepted_by_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', transactionId)

  if (error) {
    console.error('Error accepting supply:', error)
    return { error: error.message }
  }

  // Phase 7: Trigger Notification to Admin
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single()
  // @ts-expect-error - Supabase join type inference is complex
  const productName = transaction.products?.name || 'Product'

  await createNotification({
    title: 'Supply Accepted',
    message: `${stationData?.name || 'A station'} has accepted the dispatch of ${transaction.quantity}L of ${productName}.`,
    type: 'supply',
    recipient_id: transaction.initiator_id, // The admin who created it
    station_id: stationId
  })

  // Evaluate stock for WhatsApp alerts (background)
  if (transaction.product_id) {
    evaluateStockAndAlert(stationId, transaction.product_id).catch(console.error)
  }

  revalidatePath('/manager', 'layout')
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function rejectSupply(transactionId: string) {
  const supabase = await createClient()
  const { stationId } = await getManagerContext(supabase)

  // Verify the transaction belongs to the manager's station
  const { data: transaction } = await supabase
    .from('supply_transactions')
    .select('id, station_id, initiator_id, quantity, products(name)')
    .eq('id', transactionId)
    .single()

  if (!transaction || transaction.station_id !== stationId) {
    return { error: 'Invalid transaction or unauthorized' }
  }

  const { error } = await supabase
    .from('supply_transactions')
    .update({
      status: 'rejected',
    })
    .eq('id', transactionId)

  if (error) {
    console.error('Error rejecting supply:', error)
    return { error: error.message }
  }

  // Phase 7: Trigger Notification to Admin
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single()
  // @ts-expect-error - Supabase join type inference is complex
  const productName = transaction.products?.name || 'Product'

  await createNotification({
    title: 'Supply Rejected',
    message: `${stationData?.name || 'A station'} has REJECTED the supply of ${transaction.quantity}L ${productName}.`,
    type: 'supply',
    recipient_id: transaction.initiator_id, // The admin who created it
    station_id: stationId
  })

  revalidatePath('/manager', 'layout')
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function submitStockTransfer(
  productId: string,
  volume: number,
  destination: string,
  managerInCharge: string,
  comment: string
) {
  const supabase = await createClient()
  const { stationId } = await getManagerContext(supabase)

  const { error } = await supabase.from('stock_transfers').insert({
    source_station_id: stationId,
    product_id: productId,
    volume,
    destination,
    manager_in_charge: managerInCharge,
    comment
  })

  if (error) {
    console.error('Error logging stock transfer:', error)
    return { error: error.message }
  }

  // Revalidate to update stock values
  revalidatePath('/manager', 'layout')
  revalidatePath('/admin', 'layout')

  return { success: true }
}
