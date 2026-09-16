import { createClient } from '@/utils/supabase/server';

export async function getStation7DayAverage(stationId: string, productId: string): Promise<number> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateString = sevenDaysAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sales_transactions')
    .select('quantity_sold')
    .eq('station_id', stationId)
    .eq('product_id', productId)
    .gte('date', dateString);

  if (error) {
    console.error('Error fetching sales for 7 day average:', error);
    return 0;
  }

  const totalSales = data.reduce((sum, txn) => sum + Number(txn.quantity_sold), 0);
  return totalSales / 7;
}

export function determineUrgency(daysRemaining: number, config: { green_threshold: number, yellow_threshold: number, red_threshold: number }) {
  if (daysRemaining <= config.red_threshold) {
    return 'Red';
  } else if (daysRemaining > config.green_threshold) {
    return 'Green';
  } else {
    return 'Yellow';
  }
}

export async function getUrgencyStatus(stationId: string, productId: string) {
  const supabase = await createClient();

  // 1. Get 7-day average
  const averageDailySales = await getStation7DayAverage(stationId, productId);

  // 2. Get current stock
  const { data: stockData, error: stockError } = await supabase
    .from('stock_ledger')
    .select('quantity')
    .eq('station_id', stationId)
    .eq('product_id', productId)
    .single();

  if (stockError && stockError.code !== 'PGRST116') {
    console.error('Error fetching stock:', stockError);
  }

  const stock = Number(stockData?.quantity || 0);

  // 3. Calculate days remaining
  const daysRemaining = averageDailySales > 0 ? stock / averageDailySales : Infinity;

  // 4. Get thresholds
  const { data: configData, error: configError } = await supabase
    .from('urgency_config')
    .select('*')
    .limit(1)
    .single();

  if (configError && configError.code !== 'PGRST116') {
    console.error('Error fetching urgency config:', configError);
  }

  const config = {
    green_threshold: configData ? Number(configData.green_threshold) : 7,
    yellow_threshold: configData ? Number(configData.yellow_threshold) : 3,
    red_threshold: configData ? Number(configData.red_threshold) : 1,
  };

  const status = determineUrgency(daysRemaining, config);

  return { status, daysRemaining, averageDailySales, stock, config };
}
