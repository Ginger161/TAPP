import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import webpush from 'web-push'

async function sendWebPush(userId: string, title: string, body: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const adminSupabase = createAdminClient();
  const { data: subs } = await adminSupabase.from('push_subscriptions').select('subscription').eq('user_id', userId);
  
  if (subs && subs.length > 0) {
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          sub.subscription as any,
          JSON.stringify({ title, body, icon: '/icon-512x512.png', badge: '/icon-192x192.png' })
        );
      } catch (err) {
        console.error('Failed to send web push for user', userId, err);
      }
    }
  }
}

type NotificationPayload = {
  title: string
  message: string
  type: string
  recipient_id?: string
  station_id?: string
  product_id?: string
}

export async function createNotification(payload: NotificationPayload) {
  const supabase = await createClient()

  // 1. Fetch phone number and send WhatsApp if needed, and insert rows
  const adminSupabase = createAdminClient()
  if (payload.recipient_id) {
    const { error } = await adminSupabase.from('notifications').insert({
      title: payload.title,
      message: payload.message,
      type: payload.type,
      recipient_id: payload.recipient_id,
      station_id: payload.station_id || null,
      product_id: payload.product_id || null
    })
    if (error) console.error('Error inserting notification:', error)
    else await sendWebPush(payload.recipient_id, payload.title, payload.message)
    const { data: userData } = await adminSupabase.auth.admin.getUserById(payload.recipient_id)
  } else {
    // If it's a broadcast (recipient_id is null), we should find all admins
    
    // Find all admins
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    const adminIds = admins?.map(a => a.id) || []
    
    // Find the station manager if station_id is provided
    let managerId: string | null = null
    if (payload.station_id) {
      const { data: managerAssignment } = await supabase
        .from('station_assignments')
        .select('user_id, users!inner(role)')
        .eq('station_id', payload.station_id)
        .eq('users.role', 'manager')
        .limit(1)
        .maybeSingle()
      if (managerAssignment) {
        managerId = managerAssignment.user_id
      }
    }
    
    // Combine unique user IDs
    const userIdsToNotify = Array.from(new Set([...adminIds, ...(managerId ? [managerId] : [])]))
    
    if (userIdsToNotify.length > 0) {
      for (const userId of userIdsToNotify) {
        // Insert individual notification for each user
        const { error } = await adminSupabase.from('notifications').insert({
          title: payload.title,
          message: payload.message,
          type: payload.type,
          recipient_id: userId,
          station_id: payload.station_id || null,
          product_id: payload.product_id || null
        })
        if (error) console.error('Error inserting broadcast notification:', error)
        else await sendWebPush(userId, payload.title, payload.message)
      }
    }
  }
}
