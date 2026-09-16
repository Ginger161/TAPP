'use client'

import { useState } from 'react'
import { CheckCircle2, Bell } from 'lucide-react'
import { markAllAsRead, markNotificationAsRead } from '@/app/actions/notificationActions'
import { useRouter, usePathname } from 'next/navigation'

export type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationListClient({ 
  initialNotifications,
  page,
  totalPages
}: { 
  initialNotifications: Notification[],
  page: number,
  totalPages: number
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleMarkAsRead = async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
    setNotifications(updated)
    await markNotificationAsRead(id, pathname || '/notifications')
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)
    const updated = notifications.map(n => ({ ...n, is_read: true }))
    setNotifications(updated)
    await markAllAsRead(pathname || '/notifications')
    setIsMarkingAll(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <span className="text-sm text-gray-500">Showing {notifications.length} notifications</span>
        <button
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAll || !notifications.some(n => !n.is_read)}
          className="text-sm font-semibold text-tycoon-navy hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMarkingAll ? 'Marking...' : 'Mark All as Read'}
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Bell className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="text-lg">No notifications found</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div key={notification.id} className={`p-5 transition-colors group flex items-start gap-4 ${notification.is_read ? 'bg-white' : 'bg-slate-50'}`}>
              <div className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full ${notification.type === 'supply' ? 'bg-blue-500' : notification.type === 'expense' ? 'bg-orange-500' : 'bg-red-500'} ${notification.is_read ? 'opacity-30' : 'opacity-100'}`} />
              <div className={`flex-1 min-w-0 ${!notification.is_read ? 'cursor-pointer' : ''}`} onClick={() => { if (!notification.is_read) handleMarkAsRead(notification.id) }}>
                <p className={`text-base mb-1 ${notification.is_read ? 'text-slate-600' : 'text-gray-900 font-medium'}`}>
                  {notification.title}
                </p>
                <p className={`text-sm ${notification.is_read ? 'text-slate-500' : 'text-gray-700'}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-2 font-medium">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              {!notification.is_read && (
                <button 
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="text-gray-400 hover:text-emerald-500 transition-all p-2 rounded-full hover:bg-emerald-50"
                  title="Mark as read"
                >
                  <CheckCircle2 size={20} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-center gap-2">
          <button
            onClick={() => router.push(`/notifications?page=${page - 1}`)}
            disabled={page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="flex items-center px-4 text-sm font-medium text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => router.push(`/notifications?page=${page + 1}`)}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
