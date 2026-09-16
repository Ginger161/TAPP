import React from 'react';
import AdminHeader from '@/components/AdminHeader';
import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/login/actions';
import { redirect } from 'next/navigation';

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
    </div>
  );
}
