'use server';

import { createClient } from '@/utils/supabase/server';

export type MultiYearSalesData = {
  name: string; // Jan, Feb, Mar...
  [year: string]: number | string; // e.g., '2026': 45000, '2025': 42000
};

export async function getMultiYearSalesData(stationId?: string, targetYears?: string[]): Promise<{ data: MultiYearSalesData[], years: string[], stationName?: string }> {
  const supabase = await createClient();

  const currentYear = new Date().getFullYear();
  let years = targetYears;
  if (!years || years.length === 0) {
    years = [currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()];
  }
  
  const minYear = Math.min(...years.map(Number));
  const minDate = `${minYear}-01-01`;

  let query = supabase
    .from('sales_transactions')
    .select('date, quantity_sold')
    .gte('date', minDate);

  let stationName = 'All Stations (Global)';

  if (stationId) {
    query = query.eq('station_id', stationId);
    const { data: stationRecord } = await supabase.from('stations').select('name').eq('id', stationId).single();
    if (stationRecord) {
      stationName = stationRecord.name;
    }
  }

  const { data: salesData, error } = await query;
  if (error) {
    console.error("Error fetching historical sales:", error);
    return { data: [], years, stationName };
  }

  // Initialize data structure with all months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // We need an array of 12 objects
  const result: MultiYearSalesData[] = months.map(m => {
    const obj: MultiYearSalesData = { name: m };
    years.forEach(y => { obj[y] = 0; });
    return obj;
  });

  // Aggregate
  salesData?.forEach(sale => {
    // date format: YYYY-MM-DD
    const yyyy = sale.date.substring(0, 4);
    const mm = parseInt(sale.date.substring(5, 7), 10); // 1-12
    if (years.includes(yyyy) && mm >= 1 && mm <= 12) {
      const monthIndex = mm - 1;
      result[monthIndex][yyyy] = (result[monthIndex][yyyy] as number) + Number(sale.quantity_sold);
    }
  });

  // Remove zero data for future months in current year to prevent lines dropping to 0
  const currentMonth = new Date().getMonth();
  result.forEach((monthData, index) => {
    if (index > currentMonth && years.includes(currentYear.toString())) {
      monthData[currentYear.toString()] = undefined as any; // Recharts ignores undefined for lines
    }
  });

  return { data: result, years, stationName };
}

export async function getAvailableYears(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('sales_transactions').select('date');
  if (!data) return [new Date().getFullYear().toString()];
  
  const years = new Set<string>();
  data.forEach((row: any) => {
    if (row.date) years.add(row.date.substring(0, 4));
  });
  
  const sorted = Array.from(years).sort().reverse();
  return sorted.length > 0 ? sorted : [new Date().getFullYear().toString()];
}

export type FinancialMetrics = {
  grossRevenue: number;
  totalExpenses: number;
  cogs: number;
  netProfit: number;
  productBreakdown: {
    productId: string;
    productName: string;
    revenue: number;
    cogs: number;
  }[];
};

export type DateRange = '24h' | '7d' | '30d' | 'YTD' | 'All Time';

function getMinDateForRange(range: DateRange): string {
  if (range === 'All Time') return '2000-01-01';
  const now = new Date();
  if (range === '24h') {
    now.setHours(now.getHours() - 24);
    return now.toISOString(); // For exact 24h filtering if timestamp is stored, but since date is stored, it might need to just be 24h worth of days. We will use ISO for safety.
  }
  if (range === '7d') {
    now.setDate(now.getDate() - 7);
    return now.toISOString().split('T')[0];
  }
  if (range === '30d') {
    now.setDate(now.getDate() - 30);
    return now.toISOString().split('T')[0];
  }
  if (range === 'YTD') {
    return `${now.getFullYear()}-01-01`;
  }
  return '2000-01-01';
}

export async function getFinancialMetrics(range: DateRange, stationId?: string): Promise<FinancialMetrics> {
  const supabase = await createClient();
  const minDate = getMinDateForRange(range);

  // Build queries
  let salesQuery = supabase.from('sales_transactions').select('selling_price, product_id, products(name)').gte('date', minDate);
  let expenseQuery = supabase.from('expenses').select('amount').gte('date', minDate);
  let supplyQuery = supabase.from('supply_transactions').select('cost_price, product_id, products(name)').eq('status', 'accepted').gte('date', minDate);

  if (stationId) {
    salesQuery = salesQuery.eq('station_id', stationId);
    expenseQuery = expenseQuery.eq('station_id', stationId);
    supplyQuery = supplyQuery.eq('station_id', stationId);
  }

  const [salesRes, expRes, supRes] = await Promise.all([salesQuery, expenseQuery, supplyQuery]);

  let grossRevenue = 0;
  let totalExpenses = 0;
  let cogs = 0;
  const productMap: Record<string, { name: string, revenue: number, cogs: number }> = {};

  salesRes.data?.forEach((s: any) => {
    grossRevenue += Number(s.selling_price);
    const pid = s.product_id;
    if (!productMap[pid]) productMap[pid] = { name: s.products?.name || 'Unknown', revenue: 0, cogs: 0 };
    productMap[pid].revenue += Number(s.selling_price);
  });

  expRes.data?.forEach((e: any) => {
    totalExpenses += Number(e.amount);
  });

  supRes.data?.forEach((s: any) => {
    cogs += Number(s.cost_price);
    const pid = s.product_id;
    if (!productMap[pid]) productMap[pid] = { name: s.products?.name || 'Unknown', revenue: 0, cogs: 0 };
    productMap[pid].cogs += Number(s.cost_price);
  });

  const netProfit = grossRevenue - cogs - totalExpenses;

  const productBreakdown = Object.entries(productMap).map(([id, data]) => ({
    productId: id,
    productName: data.name,
    revenue: data.revenue,
    cogs: data.cogs
  }));

  return {
    grossRevenue,
    totalExpenses,
    cogs,
    netProfit,
    productBreakdown
  };
}

export async function exportFinancialReport(range: DateRange, stationId?: string) {
  const supabase = await createClient();
  const minDate = getMinDateForRange(range);

  // Fetch ledgers
  let salesQuery = supabase.from('sales_transactions').select('date, selling_price, quantity_sold, stations(name), products(name)').gte('date', minDate);
  let expenseQuery = supabase.from('expenses').select('date, amount, expense_type, description, stations(name)').gte('date', minDate);
  let supplyQuery = supabase.from('supply_transactions').select('date, cost_price, quantity, actual_volume_received, stations(name), products(name)').eq('status', 'accepted').gte('date', minDate);

  if (stationId) {
    salesQuery = salesQuery.eq('station_id', stationId);
    expenseQuery = expenseQuery.eq('station_id', stationId);
    supplyQuery = supplyQuery.eq('station_id', stationId);
  }

  const [salesRes, expRes, supRes] = await Promise.all([salesQuery, expenseQuery, supplyQuery]);

  let csvContent = 'Date,Station,Type,Product/Category,Volume,Amount(NGN),Notes\n';

  salesRes.data?.forEach((s: any) => {
    csvContent += `"${s.date}","${s.stations?.name || ''}","Sale","${s.products?.name || ''}",${s.quantity_sold},${s.selling_price},""\n`;
  });

  supRes.data?.forEach((s: any) => {
    csvContent += `"${s.date}","${s.stations?.name || ''}","Supply (COGS)","${s.products?.name || ''}",${s.actual_volume_received || s.quantity},-${s.cost_price},""\n`;
  });

  expRes.data?.forEach((e: any) => {
    const desc = e.description ? e.description.replace(/"/g, '""') : '';
    csvContent += `"${e.date}","${e.stations?.name || ''}","Expense","${e.expense_type}","",-${e.amount},"${desc}"\n`;
  });

  return { csv: csvContent, filename: `financial_report_${range.replace(/\s+/g, '_').toLowerCase()}.csv` };
}
