'use server'

import webpush from 'web-push'

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
