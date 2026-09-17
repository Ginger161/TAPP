'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getManagerDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: assignments } = await supabase
    .from('station_assignments')
    .select('station_id')
    .eq('user_id', user.id);

  if (!assignments || assignments.length === 0) {
    throw new Error('No station assigned to this manager.');
  }

  const stationId = assignments[0].station_id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const now = new Date();
  const firstDayOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [
    { data: station },
    { data: urgencyConfig },
    { data: pendingSupplies },
    { data: products },
    { data: allStock },
    { data: allSales30Days },
    { data: trendSalesData },
    { data: monthSales },
    { data: monthSupplies },
    { data: monthExpenses }
  ] = await Promise.all([
    supabase.from('stations').select('name').eq('id', stationId).single(),
    supabase.from('urgency_config').select('*').order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('supply_transactions').select('id, quantity, products(name)').eq('station_id', stationId).eq('status', 'pending'),
    supabase.from('products').select('*'),
    supabase.from('stock_ledger').select('product_id, quantity').eq('station_id', stationId),
    supabase.from('sales_transactions').select('product_id, quantity_sold').eq('station_id', stationId).gte('date', thirtyDaysStr),
    supabase.from('sales_transactions').select('date, quantity_sold').eq('station_id', stationId).gte('date', minDateStr),
    supabase.from('sales_transactions').select('selling_price').eq('station_id', stationId).gte('date', firstDayOfMonthStr),
    supabase.from('supply_transactions').select('cost_price').eq('station_id', stationId).eq('status', 'accepted').gte('date', firstDayOfMonthStr),
    supabase.from('expenses').select('amount').eq('station_id', stationId).eq('status', 'approved').gte('date', firstDayOfMonthStr)
  ]);

  const thresholds = urgencyConfig || {
    green_threshold: 7,
    yellow_threshold: 3,
    red_threshold: 1
  };

  const productStatus = [];

  for (const product of products || []) {
    const ledger = allStock?.find(s => s.product_id === product.id);
    const stock = ledger?.quantity || 0;

    const pastSales = allSales30Days?.filter(s => s.product_id === product.id);

    let averageDailySales = 0;
    if (pastSales && pastSales.length > 0) {
      const totalVolume = pastSales.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
      averageDailySales = totalVolume / 30;
    }

    let daysRemaining = Infinity;
    if (stock <= 0) {
      daysRemaining = 0;
    } else if (averageDailySales > 0) {
      daysRemaining = stock / averageDailySales;
    }

    let status: 'Red' | 'Yellow' | 'Green' = 'Green';
    if (daysRemaining <= thresholds.red_threshold) status = 'Red';
    else if (daysRemaining <= thresholds.yellow_threshold) status = 'Yellow';

    productStatus.push({
      id: product.id,
      name: product.name,
      stock,
      daysRemaining,
      status
    });
  }

  const salesTrendMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesTrendMap[d.toISOString().split('T')[0]] = 0;
  }

  trendSalesData?.forEach(sale => {
    if (salesTrendMap[sale.date] !== undefined) {
      salesTrendMap[sale.date] += Number(sale.quantity_sold);
    }
  });

  const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
    date,
    volume: salesTrendMap[date]
  }));

  // Calculate Current Month PnL
  const revenue = (monthSales || []).reduce((sum, s) => sum + Number(s.selling_price || 0), 0);
  const cogs = (monthSupplies || []).reduce((sum, s) => sum + Number(s.cost_price || 0), 0);
  const approvedExpenses = (monthExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  
  const netProfit = revenue - cogs - approvedExpenses;

  return {
    stationName: station?.name || 'Assigned Station',
    productStatus,
    pendingAlerts: (pendingSupplies || []).map(ps => ({
      id: ps.id,
      quantity: ps.quantity,
      productName: (ps.products as any)?.name || 'Unknown'
    })),
    salesTrend,
    netProfit
  };
}
