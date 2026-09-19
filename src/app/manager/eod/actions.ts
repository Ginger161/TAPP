'use server';

import { createClient } from '@/utils/supabase/server';
import { getAssignedStationId } from '../dashboard/actions';

export async function getEODHistory() {
  const supabase = await createClient();
  const stationId = await getAssignedStationId();

  const { data, error } = await supabase
    .from('daily_remittance')
    .select('id, date, gross_revenue, total_expenses, balance_due')
    .eq('station_id', stationId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching EOD history:', error);
    throw new Error('Failed to fetch EOD history');
  }

  return data.map(record => ({
    ...record,
    status: 'Submitted'
  }));
}

export async function getEODDetails(date: string) {
  const supabase = await createClient();
  const stationId = await getAssignedStationId();

  const [
    { data: remittance },
    { data: pumps },
    { data: sales },
    { data: expenses },
    { data: dippings }
  ] = await Promise.all([
    supabase.from('daily_remittance').select('*').eq('station_id', stationId).eq('date', date).single(),
    supabase.from('pump_logs').select('*, products(name)').eq('station_id', stationId).eq('date', date),
    supabase.from('sales_transactions').select('*, products(name)').eq('station_id', stationId).eq('date', date),
    supabase.from('expenses').select('*').eq('station_id', stationId).eq('date', date),
    supabase.from('tank_dippings').select('*, products(name)').eq('station_id', stationId).eq('date', date)
  ]);

  return {
    remittance,
    pumps: pumps || [],
    sales: sales || [],
    expenses: expenses || [],
    dippings: dippings || []
  };
}
