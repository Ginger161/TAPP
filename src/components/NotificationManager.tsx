'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellRing, Send } from 'lucide-react'
import { sendTestPushNotification, savePushSubscription } from '@/app/admin/dashboard/pushActions'
import toast from 'react-hot-toast'

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function NotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscription(sub)
            setIsSubscribed(true)
          }
        })
      })
    }
  }, [])

  const handleSubscribe = async () => {
    if (!registration) {
      toast.error('Service Worker not registered.')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notification permission denied.')
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        toast.error('VAPID public key is missing.')
        return
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      setSubscription(sub)
      setIsSubscribed(true)
      
      const subJson = JSON.parse(JSON.stringify(sub))
      const saveRes = await savePushSubscription(subJson)
      if (saveRes.error) {
        toast.error('Enabled locally, but failed to save to server.')
      } else {
        toast.success('Successfully enabled notifications!')
      }
    } catch (err: any) {
      console.error('Failed to subscribe:', err)
      toast.error('Failed to subscribe: ' + err.message)
    }
  }

  const handleSendTest = async () => {
    if (!subscription) {
      toast.error('You must enable notifications first.')
      return
    }

    setIsSending(true)
    try {
      // Need to stringify/parse to handle the object structure correctly across the server boundary
      const subJson = JSON.parse(JSON.stringify(subscription))
      const result = await sendTestPushNotification(subJson, {
        title: 'TAPP Test Alert',
        body: 'This is a test web push notification from the Tycoon Admin portal!',
        icon: '/icon.png'
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Test notification sent!')
      }
    } catch (err) {
      toast.error('An error occurred sending test notification.')
    }
    setIsSending(false)
  }

  if (isSubscribed) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-tycoon-charcoal dark:text-gray-100">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
          {isSubscribed ? <BellRing size={24} /> : <Bell size={24} />}
        </div>
        <div>
          <h3 className="font-bold">Push Notifications</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSubscribed 
              ? 'You are subscribed to receive important alerts on this device.'
              : 'Enable notifications to get critical inventory alerts instantly.'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {!isSubscribed ? (
          <button
            onClick={handleSubscribe}
            className="flex-1 sm:flex-none px-4 py-2 bg-tycoon-red text-white rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Enable Notifications
          </button>
        ) : (
          <button
            onClick={handleSendTest}
            disabled={isSending}
            className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={18} />
            {isSending ? 'Sending...' : 'Send Test Notification'}
          </button>
        )}
      </div>
    </div>
  )
}
