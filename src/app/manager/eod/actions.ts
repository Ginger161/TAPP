'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/utils/notifications';
import { evaluateStockAndAlert } from '@/utils/stockAlerts';

function getLocalWATDateString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wat = new Date(utc + (3600000 * 1));
  return wat.toISOString().split('T')[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getManagerContext(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: assignment } = await supabase
    .from('station_assignments')
    .select('station_id')
    .eq('user_id', user.id)
    .single();

  if (!assignment) throw new Error('No station assigned to this user');

  return { userId: user.id, stationId: assignment.station_id };
}

export type LegacyEODPayload = {
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
  pos: number;
  cash: number;
};

export async function submitLegacyEOD(payload: LegacyEODPayload) {
  const supabase = await createClient();
  const { userId, stationId } = await getManagerContext(supabase);

  const date = payload.date || getLocalWATDateString();
  let hasError = false;
  let totalGrossRevenue = 0;

  // 1. Process Sales & Dips
  for (const product of payload.products) {
    if (!product.productId) continue;

    // Insert Batches
    let totalVolume = 0;
    const validBatches = product.batches.filter(b => b.volume > 0 && b.pricePerLiter > 0);
    
    for (const batch of validBatches) {
      const revenue = batch.volume * batch.pricePerLiter;
      totalGrossRevenue += revenue;

      const { error } = await supabase.from('sales_transactions').insert({
        station_id: stationId,
        product_id: product.productId,
        date,
        start_meter: batch.startMeter ?? null,
        close_meter: batch.closeMeter ?? null,
        quantity_sold: batch.volume,
        selling_price: batch.pricePerLiter, // Strictly Unit Price
        total_amount: revenue, // Total Revenue
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
      evaluateStockAndAlert(stationId, product.productId).catch(console.error);
    }

    // Insert Dip
    if (product.dipVolume !== undefined && product.dipVolume >= 0) {
      const { error } = await supabase.from('tank_dippings').insert({
        station_id: stationId,
        tank_id: `${product.productId}-tank`, // Mock tank ID or resolve if real tank exists
        product_id: product.productId,
        date,
        dipped_volume: product.dipVolume
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
    if (expense.amount >= 0) {
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

  // 3. Insert Daily Remittance
  const balanceDue = totalGrossRevenue - totalExpenses - payload.pos - payload.cash;
  
  const { error: remittanceError } = await supabase.from('daily_remittance').insert({
    station_id: stationId,
    date,
    manager_id: userId,
    gross_revenue: totalGrossRevenue,
    total_expenses: totalExpenses,
    pos_to_account: payload.pos,
    cash_to_bank: payload.cash,
    balance_due: balanceDue
  });

  if (remittanceError) {
    console.error('Error inserting daily remittance:', remittanceError);
    hasError = true;
  }

  if (hasError) {
    return { error: 'Some records failed to insert. Please review your dashboard and try again.' };
  }

  // 4. Trigger Notification to Admins
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', stationId).single();
  await createNotification({
    title: 'EOD Log Submitted',
    message: `${stationData?.name || 'A station'} has submitted their legacy End of Day log for ${date}. Revenue: ₦${totalGrossRevenue.toLocaleString()}. Expenses: ₦${totalExpenses.toLocaleString()}.`,
    type: 'info',
    recipient_id: undefined, // Broadcasts to all admins
    station_id: stationId
  });

  revalidatePath('/manager/dashboard', 'page');
  revalidatePath('/admin/dashboard', 'page');
  return { success: true };
}
