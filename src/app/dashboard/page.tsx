import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardRouter() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userRecord?.role === 'admin') {
    redirect('/admin/dashboard');
  } else if (userRecord?.role === 'viewer') {
    redirect('/viewer/dashboard');
  } else if (userRecord?.role === 'manager') {
    redirect('/manager/dashboard');
  } else {
    return (
      <div className="p-8 text-center text-gray-500">
        Your account role is not recognized or not yet assigned. Please contact your administrator.
      </div>
    );
  }
}
