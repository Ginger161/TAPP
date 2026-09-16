'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/utils/notifications'
import { getUrgencyStatus } from '@/utils/urgency'
import { evaluateStockAndAlert } from '@/utils/stockAlerts'

function getLocalWATDateString() {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const wat = new Date(utc + (3600000 * 1))
  return wat.toISOString().split('T')[0]
}

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

export type SalesPayload = {
  date: string;
  products: {
    productId: string;
    batches: {
      volume: number;
      pricePerLiter: number;
    }[];
  }[];
};

export async function submitSales(payload: SalesPayload) {
  const supabase = await createClient()
  const { userId, stationId } = await getManagerContext(supabase)

  const date = payload.date || getLocalWATDateString()

  let hasError = false;

  for (const product of payload.products) {
    if (!product.productId || product.batches.length === 0) continue;

    // Filter out empty rows
    const validBatches = product.batches.filter(b => b.volume > 0 && b.pricePerLiter > 0);
    if (validBatches.length === 0) continue;

    let totalVolume = 0;

    // Insert batches
    for (const batch of validBatches) {
      const { error } = await supabase.from('sales_transactions').insert({
        station_id: stationId,
        product_id: product.productId,
        date,
        quantity_sold: batch.volume,
        selling_price: batch.volume * batch.pricePerLiter, // Old schema wants Total Revenue
        submitted_by_id: userId
      });

      if (error) {
        console.error('Error inserting batch:', error);
        hasError = true;
      } else {
        totalVolume += batch.volume;
      }
    }

    if (totalVolume > 0) {
      // Evaluate and trigger stock alerts (background)
      // We don't await this so it doesn't block the UI response
      evaluateStockAndAlert(stationId, product.productId).catch(console.error)
    }
  }

  if (hasError) {
    return { error: 'Some sales records failed to insert. Please review your entries.' }
  }

  revalidatePath('/manager/dashboard', 'page')
  revalidatePath('/admin/dashboard', 'page')
  return { success: true }
}

export async function submitExpense(formData: FormData) {
  const supabase = await createClient()
  const { userId, stationId } = await getManagerContext(supabase)

  const expenseType = formData.get('expenseType') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string || getLocalWATDateString()
  const photo = formData.get('photo') as File

  if (!expenseType || isNaN(amount)) {
    return { error: 'Invalid input data' }
  }

  let photoUrl = null

  if (photo && photo.size > 0) {
    const fileExt = photo.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${stationId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('expenses')
      .upload(filePath, photo)

    if (uploadError) {
      console.error('Error uploading photo:', uploadError)
      return { error: 'Failed to upload photo' }
    }

    const { data: publicUrlData } = supabase.storage
      .from('expenses')
      .getPublicUrl(filePath)
      
    photoUrl = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('expenses').insert({
    station_id: stationId,
    expense_type: expenseType,
    amount,
    date,
    description: description || null,
    photo_url: photoUrl,
    submitted_by_id: userId
  })

  if (error) {
    console.error('Error submitting expense:', error)
    return { error: error.message }
  }

  // Trigger Notification to Admins
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single()
  await createNotification({
    title: 'Pending Expense',
    message: `Pending Expense: ${stationData?.name || 'A station'} logged ₦${amount.toLocaleString()} for ${description || expenseType}.`,
    type: 'expense',
    recipient_id: undefined, // Broadcasts to all admins and the station manager
    station_id: stationId
  })

  revalidatePath('/manager/dashboard', 'page')
  revalidatePath('/admin/dashboard', 'page')
  return { success: true }
}
