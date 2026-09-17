'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/utils/notifications';
import { evaluateStockAndAlert } from '@/utils/stockAlerts';

export async function getAdminStationDashboardData(stationId: string, timeframe: string = '30D') {
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

  if (roleData?.role !== 'admin') {
    throw new Error('Unauthorized. Admins only.');
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

  let days = 30;
  if (timeframe === '24H') days = 1;
  else if (timeframe === '7D') days = 7;
  else if (timeframe === '30D') days = 30;
  else if (timeframe === '60D') days = 60;
  else if (timeframe === '90D') days = 90;
  else if (timeframe === '1Y') days = 365;
  else if (timeframe === '3Y') days = 1095;
  else if (timeframe === '5Y') days = 1825;

  const pastDate = new Date();
  if (timeframe === '24H') {
    pastDate.setHours(pastDate.getHours() - 24);
  } else {
    pastDate.setDate(pastDate.getDate() - days + 1);
  }
  const startDateStr = pastDate.toISOString().split('T')[0];
  const startTimestampStr = pastDate.toISOString();

  let salesQuery = supabase
    .from('sales_transactions')
    .select('date, quantity_sold, id, products(name), is_edited, edited_by, original_value, created_at, selling_price')
    .eq('station_id', stationId);

  if (timeframe === '24H') salesQuery = salesQuery.gte('created_at', startTimestampStr);
  else salesQuery = salesQuery.gte('date', startDateStr);
  
  const { data: salesData } = await salesQuery;

  const salesTrendMap: Record<string, number> = {};

  if (timeframe === '24H') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date();
      d.setHours(d.getHours() - i);
      const hStr = d.toISOString().substring(0, 13) + ':00';
      salesTrendMap[hStr] = 0;
    }
    salesData?.forEach(sale => {
      const hStr = sale.created_at.substring(0, 13) + ':00';
      if (salesTrendMap[hStr] !== undefined) salesTrendMap[hStr] += Number(sale.quantity_sold);
    });
  } else if (['7D', '30D', '60D', '90D'].includes(timeframe)) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesTrendMap[d.toISOString().split('T')[0]] = 0;
    }
    salesData?.forEach(sale => {
      if (salesTrendMap[sale.date] !== undefined) salesTrendMap[sale.date] += Number(sale.quantity_sold);
    });
  } else {
    let startMonth = pastDate.getMonth();
    let startYear = pastDate.getFullYear();
    const currentDate = new Date();
    while (startYear < currentDate.getFullYear() || (startYear === currentDate.getFullYear() && startMonth <= currentDate.getMonth())) {
      const monthStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;
      salesTrendMap[monthStr] = 0;
      startMonth++;
      if (startMonth > 11) {
        startMonth = 0;
        startYear++;
      }
    }
    salesData?.forEach(sale => {
      const monthStr = sale.date.substring(0, 7);
      if (salesTrendMap[monthStr] !== undefined) salesTrendMap[monthStr] += Number(sale.quantity_sold);
    });
  }

  const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
    date,
    volume: salesTrendMap[date]
  }));

  const revenue = (salesData || []).reduce((sum, s) => sum + Number(s.selling_price || 0), 0);

  let suppliesQuery = supabase
    .from('supply_transactions')
    .select('cost_price')
    .eq('station_id', stationId)
    .eq('status', 'accepted');
  if (timeframe === '24H') suppliesQuery = suppliesQuery.gte('created_at', startTimestampStr);
  else suppliesQuery = suppliesQuery.gte('date', startDateStr);
  const { data: allStationSupplies } = await suppliesQuery;
  const cogs = (allStationSupplies || []).reduce((sum, s) => sum + Number(s.cost_price || 0), 0);

  let expensesQuery = supabase
    .from('expenses')
    .select('amount, status')
    .eq('station_id', stationId)
    .eq('status', 'approved');
  if (timeframe === '24H') expensesQuery = expensesQuery.gte('created_at', startTimestampStr);
  else expensesQuery = expensesQuery.gte('date', startDateStr);
  const { data: allStationExpenses } = await expensesQuery;
  const approvedExpenses = (allStationExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const netProfit = revenue - cogs - approvedExpenses;

  // Ledger items
  const { data: ledgerSales } = await supabase
    .from('sales_transactions')
    .select('date, quantity_sold, id, products(name), is_edited, edited_by, original_value, created_at')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
    .limit(50);
    
  const formattedSales = (ledgerSales || []).map(sale => ({
    id: sale.id,
    quantity_sold: sale.quantity_sold,
    product_name: (sale.products as any)?.name,
    is_edited: sale.is_edited,
    edited_by: sale.edited_by,
    original_value: sale.original_value
  }));

  const { data: pendingExpenses } = await supabase
    .from('expenses')
    .select('id, expense_type, amount, description, is_edited, edited_by, original_value, status, created_at')
    .eq('station_id', stationId)
    .eq('status', 'pending');

  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('id, expense_type, amount, description, is_edited, edited_by, original_value, status, created_at')
    .eq('station_id', stationId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const expenses = [...(pendingExpenses || []), ...(recentExpenses || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // --- YESTERDAY'S SUMMARY ---
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const { data: yesterdaySales } = await supabase
    .from('sales_transactions')
    .select('selling_price')
    .eq('station_id', stationId)
    .eq('date', yesterdayStr);

  const { data: yesterdayExpensesData } = await supabase
    .from('expenses')
    .select('id, expense_type, amount')
    .eq('station_id', stationId)
    .eq('date', yesterdayStr)
    .eq('status', 'approved');

  const yRevenue = (yesterdaySales || []).reduce((sum, s) => sum + Number(s.selling_price || 0), 0);
  const yExpensesList = (yesterdayExpensesData || []).map(e => ({
    id: e.id,
    type: e.expense_type,
    amount: Number(e.amount)
  }));
  const yTotalExpenses = yExpensesList.reduce((sum, e) => sum + e.amount, 0);

  const yesterdaysSummary = {
    revenue: yRevenue,
    expenses: yExpensesList,
    totalExpenses: yTotalExpenses,
    expectedRemittance: yRevenue - yTotalExpenses
  };

  return {
    stationName: station?.name || 'Unknown Station',
    productStatus,
    pendingAlerts: (pendingSupplies || []).map(ps => ({
      id: ps.id,
      quantity: ps.quantity,
      productName: (ps.products as any)?.name || 'Unknown'
    })),
    salesTrend,
    sales: formattedSales,
    expenses: expenses || [],
    financialOverview: { revenue, cogs, approvedExpenses, netProfit },
    yesterdaysSummary
  };
}

export async function adminEditTransaction(
  type: 'sale' | 'expense', 
  id: string, 
  newValue: number, 
  oldValue: number,
  stationName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'admin') throw new Error("Unauthorized");

  // 1. Log the correction
  const tableName = type === 'sale' ? 'sales_transactions' : 'expenses';
  const { error: logError } = await supabase.from('corrections').insert({
    table_name: tableName,
    record_id: id,
    original_value: { value: oldValue },
    new_value: { value: newValue },
    corrected_by_id: user.id
  });

  if (logError) throw new Error("Failed to log correction");

  // 2. Update the original record
  if (type === 'sale') {
    const { data: updatedSale, error } = await supabase.from('sales_transactions').update({ 
      quantity_sold: newValue,
      is_edited: true,
      edited_by: user.email,
      original_value: oldValue
    }).eq('id', id).select('station_id, product_id').single();
    if (error) throw new Error("Failed to update sales");
    
    // Evaluate stock alerts
    if (updatedSale?.station_id && updatedSale?.product_id) {
      evaluateStockAndAlert(updatedSale.station_id, updatedSale.product_id).catch(console.error);
    }
  } else {
    const { error } = await supabase.from('expenses').update({ 
      amount: newValue,
      is_edited: true,
      edited_by: user.email,
      original_value: oldValue
    }).eq('id', id);
    if (error) throw new Error("Failed to update expense");
  }

  // 3. Log Audit
  const actionDescription = `Edited ${type} from ${oldValue} to ${newValue} for ${stationName} was made by ${user.email} (admin).`;
  
  await supabase.from('audit_log').insert({
    table_name: tableName,
    record_id: id,
    action: actionDescription,
    user_id: user.id,
    details: { newValue, oldValue }
  });

  revalidatePath(`/admin/stations/[stationId]`, 'page');
  revalidatePath('/admin/dashboard');
  
  return { success: true };
}

export async function adminAcceptSupply(
  transactionId: string,
  quantity: number,
  productName: string,
  stationName: string,
  stationId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'admin') throw new Error("Unauthorized");

  const { data: updatedSupply, error } = await supabase
    .from('supply_transactions')
    .update({
      status: 'accepted',
      accepted_by_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .select('product_id')
    .single();

  if (error) {
    console.error('Error accepting supply:', error);
    return { error: error.message };
  }

  if (updatedSupply?.product_id) {
    evaluateStockAndAlert(stationId, updatedSupply.product_id).catch(console.error);
  }

  // Log Audit
  const actionDescription = `Accepted ${quantity}L ${productName} supply for ${stationName} station was made by ${user.email} (admin).`;
  
  await supabase.from('audit_log').insert({
    table_name: 'supply_transactions',
    record_id: transactionId,
    action: actionDescription,
    user_id: user.id,
    details: { quantity, productName }
  });

  revalidatePath(`/admin/stations/[stationId]`, 'page');
  revalidatePath('/admin/dashboard');

  return { success: true };
}

export async function verifyExpense(
  expenseId: string,
  status: 'approved' | 'rejected',
  amount: number,
  reason: string,
  stationName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase
    .from('expenses')
    .update({ status })
    .eq('id', expenseId);

  if (error) {
    console.error('Error verifying expense:', error);
    return { error: error.message };
  }

  // Capitalize first letter of status for the log
  const statusFormatted = status.charAt(0).toUpperCase() + status.slice(1);
  const actionDescription = `${statusFormatted} expense of ${amount} for ${reason} at ${stationName} was made by ${user.email} (admin).`;
  
  await supabase.from('audit_log').insert({
    table_name: 'expenses',
    record_id: expenseId,
    action: actionDescription,
    user_id: user.id,
    details: { status, amount, reason }
  });

  // Get the station_id for this expense to find the manager
  const { data: expenseData } = await supabase
    .from('expenses')
    .select('station_id')
    .eq('id', expenseId)
    .single();

  if (expenseData?.station_id) {
    const { data: assignmentData } = await supabase
      .from('station_assignments')
      .select('user_id, users!inner(role)')
      .eq('station_id', expenseData.station_id)
      .eq('users.role', 'manager')
      .limit(1)
      .maybeSingle();

    if (assignmentData?.user_id) {
      const statusFormattedForNotif = statusFormatted; // "Approved" or "Rejected"
      await createNotification({
        title: `Expense ${statusFormattedForNotif}`,
        message: `Your expense of ₦${amount.toLocaleString()} for ${reason} was ${statusFormattedForNotif} by the Admin.`,
        type: 'expense',
        recipient_id: assignmentData.user_id,
        station_id: expenseData.station_id
      });
    }
  }

  revalidatePath(`/admin/stations/[stationId]`, 'page');
  revalidatePath('/manager/dashboard');

  return { success: true };
}
