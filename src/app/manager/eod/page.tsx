import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import EODHistoryClient from './EODHistoryClient';
import { FileText } from 'lucide-react';
import { Suspense } from 'react';
import { getEODHistory } from './actions';
import Link from 'next/link';

export default async function ManagerEODHistoryPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleData?.role !== 'manager' && roleData?.role !== 'admin') {
    redirect('/dashboard');
  }

  const initialHistory = await getEODHistory();

  return (
    <div className="px-4 sm:px-6 py-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tycoon-charcoal flex items-center gap-3">
            <FileText className="w-6 h-6 text-tycoon-navy" />
            EOD Historical Ledger
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review your past End of Day submissions. 
          </p>
        </div>
        <Link 
          href="/manager/dashboard/eod" 
          className="bg-tycoon-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          Submit New EOD
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<div className="text-center p-8 text-gray-500">Loading history...</div>}>
          <EODHistoryClient initialHistory={initialHistory} />
        </Suspense>
      </div>
    </div>
  );
}
