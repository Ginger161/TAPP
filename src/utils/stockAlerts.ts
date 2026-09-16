import { createAdminClient } from './supabase/admin'
import { createNotification } from './notifications'

export async function evaluateStockAndAlert(stationId: string, productId: string) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch config, station, and product details
    const [configRes, stationRes, productRes, ledgerRes] = await Promise.all([
      supabase.from('urgency_config').select('*').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('stations').select('name').eq('id', stationId).single(),
      supabase.from('products').select('name').eq('id', productId).single(),
      supabase.from('stock_ledger').select('quantity').eq('station_id', stationId).eq('product_id', productId).single()
    ]);

    const thresholds = configRes.data || { green_threshold: 7, yellow_threshold: 3, red_threshold: 1 };
    const stationName = stationRes.data?.name || 'Unknown Station';
    const productName = productRes.data?.name || 'Unknown Product';
    const stock = ledgerRes.data?.quantity || 0;

    // 2. Calculate average daily sales (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: pastSales } = await supabase
      .from('sales_transactions')
      .select('quantity_sold')
      .eq('station_id', stationId)
      .eq('product_id', productId)
      .gte('date', dateString);

    let averageDailySales = 0;
    if (pastSales && pastSales.length > 0) {
      const totalVolume = pastSales.reduce((acc, sale) => acc + Number(sale.quantity_sold), 0);
      averageDailySales = totalVolume / 30;
    }

    // 3. Calculate days remaining
    const daysRemaining = stock <= 0 ? 0 : (averageDailySales > 0 ? stock / averageDailySales : Infinity);

    // 4. Determine Status
    let currentStatus: 'Green' | 'Yellow' | 'Red' = 'Green';
    if (daysRemaining <= thresholds.red_threshold) currentStatus = 'Red';
    else if (daysRemaining <= thresholds.yellow_threshold) currentStatus = 'Yellow';

    // 5. Check alert_state
    const { data: alertState } = await supabase
      .from('alert_state')
      .select('*')
      .eq('station_id', stationId)
      .eq('product_id', productId)
      .single();

    // 6. Reset state if back to Green
    if (currentStatus === 'Green') {
      if (alertState) {
        await supabase.from('alert_state').delete().eq('id', alertState.id);
      }
      return; // No alert needed
    }

    // 7. Check if we should fire an alert
    let shouldAlert = false;
    
    if (!alertState) {
      // First time dropping into Yellow or Red
      shouldAlert = true;
    } else {
      const lastAlertTime = new Date(alertState.last_alert_time).getTime();
      const now = new Date().getTime();
      const hoursSinceLastAlert = (now - lastAlertTime) / (1000 * 60 * 60);

      if (alertState.last_alert_level === 'Yellow' && currentStatus === 'Red') {
        // Escalation Override
        shouldAlert = true;
      } else if (hoursSinceLastAlert >= 12) {
        // Cooldown expired
        shouldAlert = true;
      }
    }

    if (!shouldAlert) return;

    // 8. Dispatch In-App Notification
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    let messageText = '';
    let alertTitle = '';

    if (currentStatus === 'Yellow') {
      const daysFmt = daysRemaining === Infinity ? '∞' : daysRemaining.toFixed(1);
      alertTitle = 'Low Stock Alert';
      messageText = `🟡 Heads up — ${stationName} is running low on ${productName}. Stock is down to ${stock.toLocaleString()} Liters and we're projected to run completely dry in about ${daysFmt} days (around ${timeStr}). Might want to queue up a supply run soon so we don't stall out.`;
    } else {
      alertTitle = 'Critical Stock Alert';
      messageText = `🚨 URGENT: ${stationName} just hit critical on ${productName}! We are officially out or tracking negative at ${stock.toLocaleString()} Liters. Pumps are dry as of ${timeStr}. We need an emergency dispatch right now to avoid losing revenue.`;
    }

    try {
      await createNotification({
        title: alertTitle,
        message: messageText,
        type: currentStatus === 'Yellow' ? 'urgent' : 'critical',
        station_id: stationId,
        product_id: productId
      });
    } catch (err) {
      console.error("Failed to create in-app notification", err);
    }

    // 9. Update alert_state table
    if (alertState) {
      await supabase.from('alert_state').update({
        last_alert_level: currentStatus,
        last_alert_time: new Date().toISOString()
      }).eq('id', alertState.id);
    } else {
      await supabase.from('alert_state').insert({
        station_id: stationId,
        product_id: productId,
        last_alert_level: currentStatus
      });
    }

  } catch (error) {
    console.error("Error evaluating stock and alert:", error);
  }
}
