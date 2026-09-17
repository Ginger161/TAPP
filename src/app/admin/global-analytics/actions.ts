'use server';

import { createClient } from '@/utils/supabase/server';

export type GlobalFinancialLog = {
  id: string;
  type: 'sale' | 'expense';
  stationName: string;
  detail: string;
  amount: number;
  original_value?: number;
  is_edited: boolean;
  edited_by?: string;
  timestamp: string;
};

export async function getGlobalFinancialLogs(limit = 200): Promise<GlobalFinancialLog[]> {
  const supabase = await createClient();

  const [salesRes, expensesRes] = await Promise.all([
    supabase
      .from('sales_transactions')
      .select('id, quantity_sold, selling_price, created_at, is_edited, edited_by, original_value, products(name), stations(name)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('expenses')
      .select('id, expense_type, amount, created_at, is_edited, edited_by, original_value, stations(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
  ]);

  const logs: GlobalFinancialLog[] = [];

  salesRes.data?.forEach((sale: any) => {
    logs.push({
      id: sale.id,
      type: 'sale',
      stationName: sale.stations?.name || 'Unknown',
      detail: sale.products?.name || 'Fuel',
      amount: Number(sale.selling_price || 0),
      is_edited: sale.is_edited,
      edited_by: sale.edited_by,
      original_value: sale.original_value,
      timestamp: sale.created_at
    });
  });

  expensesRes.data?.forEach((exp: any) => {
    logs.push({
      id: exp.id,
      type: 'expense',
      stationName: exp.stations?.name || 'Unknown',
      detail: exp.expense_type,
      amount: Number(exp.amount || 0),
      is_edited: exp.is_edited,
      edited_by: exp.edited_by,
      original_value: exp.original_value,
      timestamp: exp.created_at
    });
  });

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return logs.slice(0, limit);
}
