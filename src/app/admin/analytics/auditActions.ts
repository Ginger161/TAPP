'use server';

import { createClient } from '@/utils/supabase/server';

export type AuditLogEntry = {
  id: string;
  type: 'sale' | 'expense' | 'supply' | 'correction';
  actor: string;
  action_description: string;
  station_name: string;
  product_name?: string;
  amount?: string;
  timestamp: string;
  is_corrected: boolean;
};

export async function getAuditLogFeed(stationId?: string): Promise<AuditLogEntry[]> {
  const supabase = await createClient();

  // We need to fetch recent sales, expenses, supplies, and corrections.
  // To avoid extremely complex queries or multiple joins, we'll fetch them separately
  // and sort them in JS since we only need the recent ones (e.g., last 100).
  
  const limit = 50;
  
  let salesQuery = supabase.from('sales_transactions').select('*, stations(name), products(name), users!sales_transactions_submitted_by_id_fkey(role)').order('created_at', { ascending: false }).limit(limit);
  let expensesQuery = supabase.from('expenses').select('*, stations(name), users!expenses_submitted_by_id_fkey(role)').order('created_at', { ascending: false }).limit(limit);
  let suppliesQuery = supabase.from('supply_transactions').select('*, stations(name), products(name), users!supply_transactions_initiator_id_fkey(role)').order('created_at', { ascending: false }).limit(limit);
  let correctionsQuery = supabase.from('corrections').select('*, users!corrections_corrected_by_id_fkey(role)').order('created_at', { ascending: false }).limit(limit);

  if (stationId) {
    salesQuery = salesQuery.eq('station_id', stationId);
    expensesQuery = expensesQuery.eq('station_id', stationId);
    suppliesQuery = suppliesQuery.eq('station_id', stationId);
  }

  const [salesRes, expensesRes, suppliesRes, correctionsRes] = await Promise.all([
    salesQuery, expensesQuery, suppliesQuery, correctionsQuery
  ]);

  const feed: AuditLogEntry[] = [];
  const correctedRecordIds = new Set(correctionsRes.data?.map(c => c.record_id) || []);

  salesRes.data?.forEach(sale => {
    feed.push({
      id: sale.id,
      type: 'sale',
      actor: `Manager`, // Normally we'd fetch the user's name, but users table only has role here. Assuming manager logged it.
      action_description: `logged sales`,
      station_name: sale.stations?.name || 'Unknown Station',
      product_name: sale.products?.name,
      amount: `${Number(sale.quantity_sold).toLocaleString()} L`,
      timestamp: sale.created_at,
      is_corrected: correctedRecordIds.has(sale.id)
    });
  });

  expensesRes.data?.forEach(exp => {
    feed.push({
      id: exp.id,
      type: 'expense',
      actor: `Manager`,
      action_description: `logged an expense (${exp.expense_type})`,
      station_name: exp.stations?.name || 'Unknown Station',
      amount: `₦${Number(exp.amount).toLocaleString()}`,
      timestamp: exp.created_at,
      is_corrected: correctedRecordIds.has(exp.id)
    });
  });

  suppliesRes.data?.forEach(sup => {
    feed.push({
      id: sup.id,
      type: 'supply',
      actor: sup.users?.role === 'admin' ? 'Admin' : 'Manager',
      action_description: `initiated supply`,
      station_name: sup.stations?.name || 'Unknown Station',
      product_name: sup.products?.name,
      amount: `${Number(sup.quantity).toLocaleString()} L`,
      timestamp: sup.created_at,
      is_corrected: false
    });
  });

  // We can also add explicit "Correction made" entries if we want, but the UI 
  // requires us to flag the original rows as "CORRECTED ENTRY", which we just did via is_corrected.

  // Sort combined feed chronologically descending
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return feed.slice(0, 100);
}
