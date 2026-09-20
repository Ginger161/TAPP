'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { getRecentNotifications, markMultipleNotificationsAsRead } from '@/app/actions/notificationActions'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { formatDateTimeToDDMMYYYY } from '@/utils/dateFormatter'
import { useInView } from 'react-intersection-observer'

export type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const NotificationItem = ({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: Notification, 
  onMarkAsRead: (id: string) => void 
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  })

  useEffect(() => {
    if (inView && !notification.is_read) {
      onMarkAsRead(notification.id)
    }
  }, [inView, notification.is_read, onMarkAsRead, notification.id])

  return (
    <li ref={ref} className={`p-4 transition-colors group ${notification.is_read ? 'bg-white hover:bg-gray-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
      <div className="flex gap-3 items-start">
        <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${notification.type === 'supply' ? 'bg-blue-500' : 'bg-red-500'} ${notification.is_read ? 'opacity-30' : 'opacity-100'}`} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!notification.is_read) onMarkAsRead(notification.id) }}>
          <p className={`text-sm mb-1 ${notification.is_read ? 'text-slate-600' : 'font-medium text-gray-900'}`}>{notification.title}</p>
          <p className={`text-sm line-clamp-2 ${notification.is_read ? 'text-slate-500' : 'text-gray-700'}`}>{notification.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDateTimeToDDMMYYYY(notification.created_at)}
          </p>
        </div>
        {!notification.is_read && (
          <button 
            onClick={() => onMarkAsRead(notification.id)}
            className="text-gray-400 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all p-1"
            title="Mark as read"
          >
            <CheckCircle2 size={18} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
  const pendingReads = useRef<Set<string>>(new Set())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchNotifications = () => {
      getRecentNotifications().then(res => {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      })
    }
    
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    pendingReads.current.add(id)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      const idsToMark = Array.from(pendingReads.current)
      pendingReads.current.clear()

      if (idsToMark.length > 0) {
        await markMultipleNotificationsAsRead(idsToMark, pathname || '/dashboard')
      }
    }, 1000)
  }, [pathname])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-white/10"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full border border-tycoon-navy">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[1050]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="mx-auto h-8 w-8 opacity-20 mb-2" />
                <p>No new notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(notification => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={handleMarkAsRead} 
                  />
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm font-semibold text-tycoon-navy hover:text-blue-700 transition-colors"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
