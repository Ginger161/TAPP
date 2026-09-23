'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/utils/notifications';
import { evaluateStockAndAlert } from '@/utils/stockAlerts';
import { translateDbError } from '@/utils/errors';

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
    dipVolume?: number | string;
    batches: {
      startMeter?: number | string;
      closeMeter?: number | string;
      volume: number;
      pricePerLiter: number;
    }[];
  }[];
  expenses: {
    type: string;
    amount: number | string;
    description: string;
  }[];
  pos: number | string;
  cash: number | string;
};

export async function submitLegacyEOD(payload: LegacyEODPayload) {
  const supabase = await createClient();
  const { userId, stationId } = await getManagerContext(supabase);

  const date = payload.date || getLocalWATDateString();
  let hasError = false;
  let lastErrorMessage = '';
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

      const startMeter = (batch.startMeter === "" || batch.startMeter == null) ? null : Number(batch.startMeter);
      const closeMeter = (batch.closeMeter === "" || batch.closeMeter == null) ? null : Number(batch.closeMeter);

      const { error } = await supabase.from('sales_transactions').insert({
        station_id: stationId,
        product_id: product.productId,
        date,
        start_meter: startMeter,
        close_meter: closeMeter,
        quantity_sold: batch.volume,
        selling_price: batch.pricePerLiter, // Strictly Unit Price
        total_amount: revenue, // Total Revenue
        submitted_by_id: userId
      });

      if (error) {
        console.error('Error inserting sale batch:', error.message || error);
        hasError = true;
        lastErrorMessage = translateDbError(error);
      } else {
        totalVolume += batch.volume;
      }
    }

    // Evaluate Stock alerts if sales happened
    if (totalVolume > 0) {
      evaluateStockAndAlert(stationId, product.productId).catch(console.error);
    }

    // Insert Dip
    const dipVolume = (product.dipVolume === "" || product.dipVolume == null) ? null : Number(product.dipVolume);
    if (dipVolume !== null && dipVolume >= 0) {
      const { error } = await supabase.from('tank_dippings').insert({
        station_id: stationId,
        tank_id: `${product.productId}-tank`, // Mock tank ID or resolve if real tank exists
        product_id: product.productId,
        date,
        dipped_volume: dipVolume
      });
      if (error) {
        console.error('Error inserting tank dip:', error.message || error);
        hasError = true;
        lastErrorMessage = translateDbError(error);
      }
    }
  }

  // 2. Process Expenses
  let totalExpenses = 0;
  for (const expense of payload.expenses || []) {
    const amount = Number(expense.amount) || 0;
    const description = (expense.description === "" || expense.description == null) ? null : expense.description;

    if (amount > 0) {
      const { error } = await supabase.from('expenses').insert({
        station_id: stationId,
        expense_type: expense.type,
        amount: amount,
        date,
        description: description,
        submitted_by_id: userId,
        status: 'approved' // Automatically approved!
      });

      if (error) {
        console.error('Error inserting expense:', error.message || error);
        hasError = true;
        lastErrorMessage = translateDbError(error);
      } else {
        totalExpenses += amount;
      }
    }
  }

  // 3. Insert Daily Remittance
  const sanitizedPos = Number(payload.pos) || 0;
  const sanitizedCash = Number(payload.cash) || 0;
  const balanceDue = totalGrossRevenue - totalExpenses - sanitizedPos - sanitizedCash;
  
  const { error: remittanceError } = await supabase.from('daily_remittance').insert({
    station_id: stationId,
    date,
    manager_id: userId,
    gross_revenue: totalGrossRevenue,
    total_expenses: totalExpenses,
    pos_to_account: sanitizedPos,
    cash_to_bank: sanitizedCash,
    balance_due: balanceDue
  });

  if (remittanceError) {
    console.error('Error inserting daily remittance:', remittanceError.message || remittanceError);
    hasError = true;
    lastErrorMessage = translateDbError(remittanceError);
  }

  if (hasError) {
    return { error: lastErrorMessage || 'We encountered a system error. Please wait a moment and try again, or contact the Admin if the issue persists.' };
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
