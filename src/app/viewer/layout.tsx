import React from 'react';
import ViewerHeader from '@/components/ViewerHeader';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ViewerLayout({
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
      <ViewerHeader />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
