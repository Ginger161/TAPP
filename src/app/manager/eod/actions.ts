'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/utils/notifications'
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

export type EODPayload = {
  date: string;
  products: {
    productId: string;
    dipVolume?: number;
    batches: {
      startMeter?: number;
      closeMeter?: number;
      volume: number;
      pricePerLiter: number;
    }[];
  }[];
  expenses: {
    type: string;
    amount: number;
    description: string;
  }[];
};

export async function submitEODLog(payload: EODPayload) {
  const supabase = await createClient()
  const { userId, stationId } = await getManagerContext(supabase)

  const date = payload.date || getLocalWATDateString()
  let hasError = false;

  // 1. Process Sales & Dips
  for (const product of payload.products) {
    if (!product.productId) continue;

    // Insert Batches
    let totalVolume = 0;
    const validBatches = product.batches.filter(b => b.volume > 0 && b.pricePerLiter > 0);
    
    for (const batch of validBatches) {
      const { error } = await supabase.from('sales_transactions').insert({
        station_id: stationId,
        product_id: product.productId,
        date,
        start_meter: batch.startMeter ?? null,
        close_meter: batch.closeMeter ?? null,
        quantity_sold: batch.volume,
        selling_price: batch.volume * batch.pricePerLiter, // Total Revenue
        submitted_by_id: userId
      });

      if (error) {
        console.error('Error inserting sale batch:', error);
        hasError = true;
      } else {
        totalVolume += batch.volume;
      }
    }

    // Evaluate Stock alerts if sales happened
    if (totalVolume > 0) {
      evaluateStockAndAlert(stationId, product.productId).catch(console.error)
    }

    // Insert Dip
    if (product.dipVolume !== undefined && product.dipVolume >= 0) {
      const { error } = await supabase.from('daily_dips').insert({
        station_id: stationId,
        product_id: product.productId,
        date,
        dip_volume: product.dipVolume,
        submitted_by_id: userId
      });
      if (error) {
        console.error('Error inserting tank dip:', error);
        hasError = true;
      }
    }
  }

  // 2. Process Expenses
  let totalExpenses = 0;
  for (const expense of payload.expenses) {
    if (expense.amount > 0) {
      const { error } = await supabase.from('expenses').insert({
        station_id: stationId,
        expense_type: expense.type,
        amount: expense.amount,
        date,
        description: expense.description || null,
        submitted_by_id: userId,
        status: 'approved' // Automatically approved!
      });

      if (error) {
        console.error('Error inserting expense:', error);
        hasError = true;
      } else {
        totalExpenses += expense.amount;
      }
    }
  }

  if (hasError) {
    return { error: 'Some records failed to insert. Please review your dashboard and try again.' }
  }

  // 3. Trigger Notification to Admins
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single()
  await createNotification({
    title: 'EOD Log Submitted',
    message: `${stationData?.name || 'A station'} has submitted their End of Day log for ${date}. Expenses total: ₦${totalExpenses.toLocaleString()}.`,
    type: 'info',
    recipient_id: undefined, // Broadcasts to all admins
    station_id: stationId
  })

  revalidatePath('/manager/dashboard', 'page')
  revalidatePath('/admin/dashboard', 'page')
  return { success: true }
}
