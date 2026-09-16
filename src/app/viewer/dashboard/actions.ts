'use server';

import { createClient } from '@/utils/supabase/server';
import { determineUrgency } from '@/utils/urgency';
import { createNotification } from '@/utils/notifications';
import { revalidatePath } from 'next/cache';
export type MapStation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  urgency: 'Green' | 'Yellow' | 'Red' | 'Unknown';
  products?: {
    id: string;
    name: string;
    stock: number;
    daysRemaining: number;
    status: 'Green' | 'Yellow' | 'Red' | 'Unknown';
  }[];
};

export type Anomaly = {
  id: string;
  stationName: string;
  productName: string;
  theoreticalVolume: number;
  actualDipVolume: number;
  variance: number;
  date: string;
};

export async function getViewerDashboardData() {
  const supabase = await createClient();

  // 1. Prepare Dates
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  // 2. Fetch Data Concurrently
  const [
    { data: { user } },
    { data: salesToday },
    { data: pendingSupplies },
    { data: stations },
    { data: stockLedger },
    { data: products },
    { data: sales7Days },
    { data: configData },
    { data: unresolvedAnomalies }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('sales_transactions').select('quantity_sold, selling_price').eq('date', today),
    supabase.from('supply_transactions').select('id, quantity, cost_price, date, stations(name), products(name)').eq('status', 'pending'),
    supabase.from('stations').select('*'),
    supabase.from('stock_ledger').select('*'),
    supabase.from('products').select('*'),
    supabase.from('sales_transactions').select('station_id, product_id, quantity_sold').gte('date', dateString),
    supabase.from('urgency_config').select('*').limit(1).single(),
    supabase.from('inventory_reconciliations').select('id, theoretical_volume, actual_dip_volume, variance, created_at, stations(name), products(name)').eq('is_flagged', true).eq('admin_resolved', false)
  ]);

  let isViewer = false;
  let canSupply = false;
  if (user) {
    const { data: userRecord } = await supabase.from('users').select('role, can_supply').eq('id', user.id).single();
    isViewer = userRecord?.role === 'viewer';
    canSupply = userRecord?.can_supply || false;
  }

  // 3. Process KPIs
  let totalVolumeSoldToday = 0;
  let totalRevenueToday = 0;
  if (salesToday) {
    salesToday.forEach(sale => {
      totalVolumeSoldToday += Number(sale.quantity_sold);
      totalRevenueToday += Number(sale.selling_price);
    });
  }

  let totalPendingVolume = 0;
  let pendingSuppliesList: any[] = [];
  if (pendingSupplies) {
    pendingSuppliesList = pendingSupplies.map(supply => {
      totalPendingVolume += Number(supply.quantity);
      return {
        id: supply.id,
        // @ts-expect-error join mapping
        stationName: supply.stations?.name || 'Unknown',
        // @ts-expect-error join mapping
        productName: supply.products?.name || 'Unknown',
        quantity: supply.quantity,
        costPrice: supply.cost_price,
        date: supply.date
      };
    });
  }

  const config = {
    green_threshold: configData ? Number(configData.green_threshold) : 7,
    yellow_threshold: configData ? Number(configData.yellow_threshold) : 3,
    red_threshold: configData ? Number(configData.red_threshold) : 1,
  };

  const mapStations: MapStation[] = [];

  stations?.forEach(station => {
    let highestUrgency: 'Unknown' | 'Green' | 'Yellow' | 'Red' = 'Green';
    const stationProducts: any[] = [];

    products?.forEach(product => {
      const stock = Number(stockLedger?.find(s => s.station_id === station.id && s.product_id === product.id)?.quantity || 0);
      const productSales = sales7Days?.filter(s => s.station_id === station.id && s.product_id === product.id) || [];
      const totalSales = productSales.reduce((sum, s) => sum + Number(s.quantity_sold), 0);
      const avgDailySales = totalSales / 7;

      const daysRemaining = stock === 0 ? 0 : (avgDailySales > 0 ? stock / avgDailySales : Infinity);
      
      let status: 'Green' | 'Yellow' | 'Red' = 'Green';
      if (stock <= 5000) status = 'Red';
      else if (stock <= 15000) status = 'Yellow';
      else status = 'Green';

      stationProducts.push({
        id: product.id,
        name: product.name,
        stock,
        daysRemaining,
        status
      });

      if (status === 'Red') highestUrgency = 'Red';
      else if (status === 'Yellow' && highestUrgency !== 'Red') highestUrgency = 'Yellow';
    });

    mapStations.push({
      id: station.id,
      name: station.name,
      latitude: station.latitude || 0,
      longitude: station.longitude || 0,
      urgency: highestUrgency,
      products: stationProducts
    });
  });

  // Sort stations by urgency: Red > Yellow > Green
  mapStations.sort((a, b) => {
    const val = { 'Red': 3, 'Yellow': 2, 'Green': 1, 'Unknown': 0 };
    return val[b.urgency] - val[a.urgency];
  });

  const anomalies: Anomaly[] = (unresolvedAnomalies || []).map((a: any) => ({
    id: a.id,
    stationName: a.stations?.name || 'Unknown Station',
    productName: a.products?.name || 'Unknown Product',
    theoreticalVolume: Number(a.theoretical_volume),
    actualDipVolume: Number(a.actual_dip_volume),
    variance: Number(a.variance),
    date: a.created_at.split('T')[0]
  }));

  return {
    kpi: {
      volume: totalVolumeSoldToday,
      revenue: totalRevenueToday,
      pendingVolume: totalPendingVolume
    },
    mapStations,
    isViewer,
    canSupply,
    anomalies,
    pendingSuppliesList
  };
}

export async function dispatchSupply(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const stationId = formData.get('stationId') as string;
  const productId = formData.get('productId') as string;
  const quantity = Number(formData.get('quantity'));
  const costPrice = Number(formData.get('costPrice'));
  const supplier = formData.get('supplier') as string;

  if (!user || !stationId || !productId || !quantity || !costPrice || !supplier) {
    return { error: 'Missing required fields' };
  }

  const { data: userRecord } = await supabase.from('users').select('can_supply').eq('id', user.id).single();
  if (!userRecord?.can_supply) {
    return { error: 'Unauthorized: You do not have permission to dispatch supplies.' };
  }

  const { error } = await supabase.from('supply_transactions').insert({
    station_id: stationId,
    product_id: productId,
    quantity,
    cost_price: costPrice,
    supplier,
    initiator_id: user.id,
    status: 'pending'
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/viewer/dashboard');
  return { success: true };
}

export async function getStationDeepDive(stationId: string) {
  const supabase = await createClient();

  // 1. Fetch 7-day sales trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  const [
    { data: sales7Days },
    { data: stockData },
    { data: products }
  ] = await Promise.all([
    supabase
      .from('sales_transactions')
      .select('date, quantity_sold')
      .eq('station_id', stationId)
      .gte('date', dateString)
      .order('date', { ascending: true }),
    supabase
      .from('stock_ledger')
      .select('product_id, quantity')
      .eq('station_id', stationId),
    supabase.from('products').select('id, name')
  ]);

  const salesTrendMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    salesTrendMap[d.toISOString().split('T')[0]] = 0;
  }

  sales7Days?.forEach(sale => {
    if (salesTrendMap[sale.date] !== undefined) {
      salesTrendMap[sale.date] += Number(sale.quantity_sold);
    }
  });

  const salesTrend = Object.keys(salesTrendMap).map(date => ({
    date,
    volume: salesTrendMap[date]
  }));

  const stockList = products?.map(p => ({
    id: p.id,
    name: p.name,
    quantity: stockData?.find(s => s.product_id === p.id)?.quantity || 0
  })) || [];

  return { salesTrend, stockList };
}

export type Timeframe = '7D' | '30D' | '6M' | '1Y';

export async function getStationHistoricalSales(stationId: string, timeframe: Timeframe) {
  const supabase = await createClient();

  const daysMap = { '7D': 7, '30D': 30, '6M': 180, '1Y': 365 };
  const days = daysMap[timeframe];
  
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days + 1);
  const dateString = pastDate.toISOString().split('T')[0];

  const { data: salesData } = await supabase
    .from('sales_transactions')
    .select('date, quantity_sold')
    .eq('station_id', stationId)
    .gte('date', dateString)
    .order('date', { ascending: true });

  const salesTrendMap: Record<string, number> = {};
  
  if (timeframe === '7D' || timeframe === '30D') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesTrendMap[d.toISOString().split('T')[0]] = 0;
    }
    salesData?.forEach(sale => {
      if (salesTrendMap[sale.date] !== undefined) {
        salesTrendMap[sale.date] += Number(sale.quantity_sold);
      }
    });
    return Object.keys(salesTrendMap).map(date => ({ date, volume: salesTrendMap[date] }));
  } else {
    // For 6M and 1Y, aggregate by Month (YYYY-MM)
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
      const monthStr = sale.date.substring(0, 7); // "YYYY-MM"
      if (salesTrendMap[monthStr] !== undefined) {
        salesTrendMap[monthStr] += Number(sale.quantity_sold);
      }
    });
    return Object.keys(salesTrendMap).map(date => {
       // Convert "YYYY-MM" to readable format e.g. "Jan '24"
       const [y, m] = date.split('-');
       const d = new Date(Number(y), Number(m)-1, 1);
       const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
       return { date: label, volume: salesTrendMap[date] };
    });
  }
}

export async function initiateSupply(payload: {
  stationId: string;
  productId: string;
  quantity: number;
  costPrice: number;
  supplier: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Verify the user is either admin or viewer with can_supply
  const { data: roleData } = await supabase
    .from('users')
    .select('role, can_supply')
    .eq('id', user.id)
    .single();

  if (roleData?.role === 'manager') {
    const { data: assignment } = await supabase.from('station_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('station_id', payload.stationId)
      .single();
    if (!assignment) throw new Error('Unauthorized to create supply for this station');
  } else if (roleData?.role !== 'admin' && !(roleData?.role === 'viewer' && roleData?.can_supply)) {
    throw new Error('Unauthorized to create supply');
  }


  const date = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('supply_transactions').insert({
    station_id: payload.stationId,
    product_id: payload.productId,
    quantity: payload.quantity,
    cost_price: payload.costPrice,
    supplier: payload.supplier,
    date,
    status: 'pending',
    initiator_id: user.id,
  });

  if (error) {
    console.error('Error creating supply:', error);
    return { error: error.message };
  }

  const { data: assignment } = await supabase
    .from('station_assignments')
    .select('user_id')
    .eq('station_id', payload.stationId)
    .single();

  const { data: productData } = await supabase.from('products').select('name').eq('id', payload.productId).single();
  const { data: stationData } = await supabase.from('stations').select('name').eq('id', payload.stationId).single();

  if (assignment) {
    await createNotification({
      title: 'New Supply Pending',
      message: `A supply of ${payload.quantity}L ${productData?.name || 'Product'} has been dispatched to ${stationData?.name || 'your station'}. Please review and accept.`,
      type: 'supply',
      recipient_id: assignment.user_id,
      station_id: payload.stationId,
      product_id: payload.productId
    });
  }

  revalidatePath('/manager/supplies');
  revalidatePath('/manager/dashboard');
  revalidatePath('/admin/dashboard');

  return { success: true };
}

export async function updatePendingSupply(supplyId: string, quantity: number, costPrice: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify the user is either admin or viewer with can_supply
  const { data: roleData } = await supabase
    .from('users')
    .select('role, can_supply')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'admin' && !(roleData?.role === 'viewer' && roleData?.can_supply)) {
    return { success: false, error: 'Unauthorized to edit supply' };
  }

  const { error } = await supabase
    .from('supply_transactions')
    .update({ quantity, cost_price: costPrice })
    .eq('id', supplyId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error updating pending supply:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/dashboard');
  return { success: true };
}

