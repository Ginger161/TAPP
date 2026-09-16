import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

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
  if (payload.recipient_id) {
    const { error } = await supabase.from('notifications').insert({
      title: payload.title,
      message: payload.message,
      type: payload.type,
      recipient_id: payload.recipient_id,
      station_id: payload.station_id || null,
      product_id: payload.product_id || null
    })
    if (error) console.error('Error inserting notification:', error)

    const adminSupabase = createAdminClient()
    const { data: userData } = await adminSupabase.auth.admin.getUserById(payload.recipient_id)
  } else {
    // If it's a broadcast (recipient_id is null), we should find all admins
    const adminSupabase = createAdminClient()
    
    // Find all admins
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    const adminIds = admins?.map(a => a.id) || []
    
    // Find the station manager if station_id is provided
    let managerId: string | null = null
    if (payload.station_id) {
      const { data: managerAssignment } = await supabase
        .from('station_assignments')
        .select('user_id')
        .eq('station_id', payload.station_id)
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
        const { error } = await supabase.from('notifications').insert({
          title: payload.title,
          message: payload.message,
          type: payload.type,
          recipient_id: userId,
          station_id: payload.station_id || null,
          product_id: payload.product_id || null
        })
        if (error) console.error('Error inserting broadcast notification:', error)
      }
    }
  }
}
