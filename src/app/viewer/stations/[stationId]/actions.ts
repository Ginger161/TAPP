'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/utils/notifications';

export async function getViewerStationDashboardData(stationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify Admin role
  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'viewer' && roleData?.role !== 'admin') {
    throw new Error('Unauthorized. Viewers and Admins only.');
  }

  const { data: station } = await supabase
    .from('stations')
    .select('name')
    .eq('id', stationId)
    .single();

  const { data: urgencyConfig } = await supabase
    .from('urgency_config')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const thresholds = urgencyConfig || {
    green_threshold: 7,
    yellow_threshold: 3,
    red_threshold: 1
  };

  const { data: pendingSupplies } = await supabase
    .from('supply_transactions')
    .select('id, quantity, products(name)')
    .eq('station_id', stationId)
    .eq('status', 'pending');

  const { data: products } = await supabase.from('products').select('*');

  const productStatus = [];

  for (const product of products || []) {
    const { data: ledger } = await supabase
      .from('stock_ledger')
      .select('quantity')
      .eq('station_id', stationId)
      .eq('product_id', product.id)
      .single();

    const stock = ledger?.quantity || 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: pastSales } = await supabase
      .from('sales_transactions')
      .select('quantity_sold')
      .eq('station_id', stationId)
      .eq('product_id', product.id)
      .gte('date', dateString);

    let averageDailySales = 0;
    if (pastSales && pastSales.length > 0) {
      const totalVolume = pastSales.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
      averageDailySales = totalVolume / 30;
    }

    let daysRemaining = Infinity;
    if (averageDailySales > 0) {
      daysRemaining = stock / averageDailySales;
    }

    const MAX_CAPACITY = 45000;
    const capacityPercent = (stock / MAX_CAPACITY) * 100;

    let status: 'Red' | 'Normal' | 'Green' = 'Green';
    if (capacityPercent < 10) status = 'Red';
    else if (capacityPercent <= 50) status = 'Normal';
    else status = 'Green';

    productStatus.push({
      id: product.id,
      name: product.name,
      stock,
      daysRemaining,
      status
    });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const minDateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: salesData } = await supabase
    .from('sales_transactions')
    .select('date, quantity_sold, id, products(name), is_edited, edited_by, original_value')
    .eq('station_id', stationId)
    .gte('date', minDateStr);

  const salesTrendMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesTrendMap[d.toISOString().split('T')[0]] = 0;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales: any[] = [];

  salesData?.forEach(sale => {
    if (salesTrendMap[sale.date] !== undefined) {
      salesTrendMap[sale.date] += Number(sale.quantity_sold);
    }
    if (sale.date === todayStr) {
      todaySales.push({
        id: sale.id,
        quantity_sold: sale.quantity_sold,
        product_name: (sale.products as any)?.name,
        is_edited: sale.is_edited,
        edited_by: sale.edited_by,
        original_value: sale.original_value
      });
    }
  });

  const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
    date,
    volume: salesTrendMap[date]
  }));

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, expense_type, amount, description, is_edited, edited_by, original_value')
    .eq('station_id', stationId)
    .eq('date', todayStr);

  return {
    stationName: station?.name || 'Unknown Station',
    productStatus,
    pendingAlerts: (pendingSupplies || []).map(ps => ({
      id: ps.id,
      quantity: ps.quantity,
      productName: (ps.products as any)?.name || 'Unknown'
    })),
    salesTrend,
    sales: todaySales,
    expenses: expenses || []
  };
}


