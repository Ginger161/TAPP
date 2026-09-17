import React from 'react';
import AdminHeader from '@/components/AdminHeader';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Database } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <Link 
        href="/admin/global-analytics"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-4 bg-tycoon-navy text-white rounded-full shadow-lg hover:bg-tycoon-red hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
        title="Global Analytics & Audit"
      >
        <Database className="w-6 h-6" />
      </Link>
    </div>
  );
}
