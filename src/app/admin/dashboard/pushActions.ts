'use server'

import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'

export async function savePushSubscription(subscription: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Use an upsert or delete existing and insert so we don't have duplicates per user.
  // We can just insert it, but let's delete old ones for this user first.
  await supabase.from('push_subscriptions').delete().eq('user_id', user.id)

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    subscription
  })

  if (error) {
    console.error('Error saving push subscription:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function sendTestPushNotification(subscription: webpush.PushSubscription, payload: any) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { error: 'VAPID keys not configured.' }
  }

  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    )
    return { success: true }
  } catch (err: any) {
    console.error('Error sending push notification:', err)
    return { error: err.message || 'Failed to send push notification.' }
  }
}
