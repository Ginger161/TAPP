import { getPaginatedNotifications } from '@/app/actions/notificationActions';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import NotificationListClient from './NotificationListClient';

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const limit = 20;

  const { data: notifications, count } = await getPaginatedNotifications(page, limit);
  
  const totalPages = Math.ceil(count / limit);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-tycoon-charcoal text-white px-6 py-4 flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Bell size={24} className="text-gray-400" />
            <h1 className="text-xl font-bold tracking-wide">Notification Center</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Notifications</h2>
        </div>

        <NotificationListClient initialNotifications={notifications} page={page} totalPages={totalPages} />
      </main>
    </div>
  );
}
