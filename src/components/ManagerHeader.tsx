'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronLeft } from 'lucide-react';
import { logout } from '@/app/login/actions';
import Image from 'next/image';

import NotificationBell from './NotificationBell';

export default function ManagerHeader({ stationName }: { stationName: string }) {
  const pathname = usePathname();
  const isRoot = pathname === '/manager/dashboard';

  return (
    <div className="bg-tycoon-navy text-white p-4 shadow-md sticky top-0 z-50 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {!isRoot && (
          <Link href="/manager/dashboard" className="text-gray-300 hover:text-white p-1 -ml-1">
            <ChevronLeft size={24} />
          </Link>
        )}
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Tycoon Logo" width={240} height={64} className="h-16 w-auto object-contain" priority />
          <div>
            <h1 className="text-xl font-bold leading-tight">Shift Operations</h1>
            <p className="text-xs text-gray-300">{stationName}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <form action={logout}>
          <button type="submit" className="text-gray-300 hover:text-white p-1 appearance-none bg-transparent border-none cursor-pointer">
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
