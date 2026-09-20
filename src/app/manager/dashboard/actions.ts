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
    supabase.from('sales_transactions').select('total_amount').eq('station_id', stationId).gte('date', firstDayOfMonthStr),
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
  const revenue = (monthSales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
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
    netProfit,
    revenue,
    cogs,
    approvedExpenses
  };
}

export async function getPreviousClosingMeters(stationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch the latest log for each pump at the given station
  const { data, error } = await supabase
    .from('pump_logs')
    .select('pump_id, closing_meter, date, product_id, products(name)')
    .eq('station_id', stationId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching previous closing meters:', error);
    throw new Error('Failed to fetch previous closing meters');
  }

  // Group by pump_id to get only the most recent closing_meter per pump
  const latestMeters: Record<string, { closing_meter: number, date: string, product_id: string, product_name: string }> = {};

  for (const log of data || []) {
    if (!latestMeters[log.pump_id]) {
      latestMeters[log.pump_id] = {
        closing_meter: log.closing_meter,
        date: log.date,
        product_id: log.product_id,
        product_name: (log.products as any)?.name || 'Unknown'
      };
    }
  }

  return latestMeters;
}

export async function getAssignedStationId() {
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

  return assignments[0].station_id;
}

export type EODSubmissionPayload = {
  date: string;
  pumps: {
    pump_id: string;
    product_id: string;
    opening_meter: number;
    closing_meter: number;
    rtt: number;
    override_reason: string;
    net_volume: number;
  }[];
  sales: {
    product_id: string;
    total_volume: number;
    price_tiers: { volume: number; price: number }[];
    average_price: number;
  }[];
  expenses: {
    description: string;
    amount: number;
  }[];
  dippings: {
    tank_id: string;
    product_id: string;
    dipped_volume: number;
  }[];
  remittance: {
    gross_revenue: number;
    total_expenses: number;
    pos_to_account: number;
    cash_to_bank: number;
    balance_due: number;
  };
};

export async function submitDailyEOD(payload: EODSubmissionPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: assignments } = await supabase
    .from('station_assignments')
    .select('station_id')
    .eq('user_id', user.id)
    .single();

  if (!assignments) {
    throw new Error('No station assigned to this manager.');
  }

  const stationId = assignments.station_id;

  // Insert Phase 2 data: pump_logs
  if (payload.pumps.length > 0) {
    const { error: pumpError } = await supabase.from('pump_logs').insert(
      payload.pumps.map(pump => ({
        station_id: stationId,
        pump_id: pump.pump_id,
        product_id: pump.product_id,
        date: payload.date,
        opening_meter: pump.opening_meter,
        closing_meter: pump.closing_meter,
        rtt: pump.rtt,
        override_reason: pump.override_reason || null,
        net_volume: pump.net_volume,
      }))
    );
    if (pumpError) throw new Error(`Pump logs error: ${pumpError.message}`);
  }

  // Insert Phase 3 data: sales_transactions
  if (payload.sales.length > 0) {
    const { error: salesError } = await supabase.from('sales_transactions').insert(
      payload.sales.map(sale => ({
        station_id: stationId,
        product_id: sale.product_id,
        date: payload.date,
        quantity_sold: sale.total_volume,
        selling_price: sale.average_price, // Store the weighted average price here
        total_amount: sale.total_volume * sale.average_price,
        submitted_by_id: user.id,
        price_tiers: sale.price_tiers, // JSONB column from Phase 1
      }))
    );
    if (salesError) throw new Error(`Sales error: ${salesError.message}`);
  }

  // Insert Phase 3 data: expenses
  if (payload.expenses.length > 0) {
    const { error: expensesError } = await supabase.from('expenses').insert(
      payload.expenses.map(exp => ({
        station_id: stationId,
        expense_type: exp.description || 'General',
        amount: exp.amount,
        date: payload.date,
        description: exp.description,
        submitted_by_id: user.id,
        // The default schema has status but the sql schema we checked doesn't seem to have a status column. Wait, we checked schema.sql and it didn't have status for expenses.
        // Wait, schema.sql has: station_id, expense_type, amount, date, description, photo_url, submitted_by_id, created_at. No status.
      }))
    );
    if (expensesError) throw new Error(`Expenses error: ${expensesError.message}`);
  }

  // Insert Phase 4 data: tank_dippings
  if (payload.dippings.length > 0) {
    const { error: dippingError } = await supabase.from('tank_dippings').insert(
      payload.dippings.map(dip => ({
        station_id: stationId,
        tank_id: dip.tank_id,
        product_id: dip.product_id,
        date: payload.date,
        dipped_volume: dip.dipped_volume,
      }))
    );
    if (dippingError) throw new Error(`Tank dipping error: ${dippingError.message}`);
  }

  // Insert Phase 4 data: daily_remittance
  const { error: remittanceError } = await supabase.from('daily_remittance').insert({
    station_id: stationId,
    date: payload.date,
    manager_id: user.id,
    gross_revenue: payload.remittance.gross_revenue,
    total_expenses: payload.remittance.total_expenses,
    pos_to_account: payload.remittance.pos_to_account,
    cash_to_bank: payload.remittance.cash_to_bank,
    balance_due: payload.remittance.balance_due,
  });
  
  if (remittanceError) throw new Error(`Remittance error: ${remittanceError.message}`);

  revalidatePath('/manager/dashboard');
  revalidatePath('/manager/dashboard/eod');
}
