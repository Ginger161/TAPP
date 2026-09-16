'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, BarChart3, LayoutDashboard, Users } from 'lucide-react';
import { logout } from '@/app/login/actions';
import Image from 'next/image';
import NotificationBell from './NotificationBell';

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <div className="bg-tycoon-navy text-white p-4 shadow-md sticky top-0 z-[60] flex justify-between items-center shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="Tycoon Logo" width={240} height={64} className="h-16 w-auto object-contain" priority />
        </Link>
        
        <nav className="hidden md:flex items-center gap-4 ml-6 border-l border-gray-600 pl-6">
          <Link 
            href="/admin/dashboard" 
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              pathname === '/admin/dashboard' ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/admin/analytics" 
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              pathname?.startsWith('/admin/analytics') ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </Link>
          <Link 
            href="/admin/users" 
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              pathname?.startsWith('/admin/users') ? 'bg-white/10 text-white font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users size={18} />
            <span>Users & Assignments</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <form action={logout}>
          <button type="submit" className="text-gray-300 hover:text-tycoon-red transition-colors p-2 flex items-center gap-2 rounded-md hover:bg-white/5">
            <LogOut size={18} />
            <span className="hidden sm:inline text-sm font-medium">Log Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
