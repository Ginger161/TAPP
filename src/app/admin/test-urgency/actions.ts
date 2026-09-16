'use server';

import { getUrgencyStatus, determineUrgency } from '@/utils/urgency';
import { createClient } from '@/utils/supabase/server';

export async function testUrgencyWithNumbers(
  stock: number, 
  averageDailySales: number,
  overrideConfig?: { green_threshold: number, yellow_threshold: number, red_threshold: number }
) {
  let config = overrideConfig;
  
  if (!config) {
    const supabase = await createClient();
    const { data: configData } = await supabase.from('urgency_config').select('*').limit(1).single();
    
    config = {
      green_threshold: configData ? Number(configData.green_threshold) : 7,
      yellow_threshold: configData ? Number(configData.yellow_threshold) : 3,
      red_threshold: configData ? Number(configData.red_threshold) : 1,
    };
  }

  const daysRemaining = averageDailySales > 0 ? stock / averageDailySales : Infinity;
  const status = determineUrgency(daysRemaining, config);
  
  return { status, daysRemaining, config };
}

export async function fetchStationUrgency(stationId: string, productId: string) {
  return await getUrgencyStatus(stationId, productId);
}
