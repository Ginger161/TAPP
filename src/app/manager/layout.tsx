import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Home, PenSquare, FileText, Truck } from 'lucide-react';
import ManagerHeader from '@/components/ManagerHeader';

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let stationName = 'Unknown Station';
  if (user) {
    const { data: assignments } = await supabase
      .from('station_assignments')
      .select('stations(name)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    
    // @ts-expect-error - Station relation type is complex
    if (assignments?.stations?.name) {
      // @ts-expect-error - Station relation type is complex
      stationName = assignments.stations.name;
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-tycoon-charcoal">
      {/* Dynamic Header */}
      <ManagerHeader stationName={stationName} />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-around p-3 pb-safe z-50">
        <Link href="/manager/dashboard" className="flex flex-col items-center text-gray-500 hover:text-red-600 focus:text-red-600 active:text-red-600">
          <Home size={24} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>
        <Link href="/manager/submit?tab=sales" className="flex flex-col items-center text-gray-500 hover:text-red-600 focus:text-red-600 active:text-red-600">
          <PenSquare size={24} />
          <span className="text-[10px] mt-1 font-medium">Log Sales</span>
        </Link>
        <Link href="/manager/submit?tab=expenses" className="flex flex-col items-center text-gray-500 hover:text-red-600 focus:text-red-600 active:text-red-600">
          <FileText size={24} />
          <span className="text-[10px] mt-1 font-medium">Expenses</span>
        </Link>
        <Link href="/manager/supplies" className="flex flex-col items-center text-gray-500 hover:text-red-600 focus:text-red-600 active:text-red-600">
          <Truck size={24} />
          <span className="text-[10px] mt-1 font-medium">Supplies</span>
        </Link>
      </div>
    </div>
  );
}
