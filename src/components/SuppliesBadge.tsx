'use client';
import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SuppliesBadge({ initialCount, stationId }: { initialCount: number, stationId: string }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!stationId) return;

    const supabase = createClient();
    const channel = supabase.channel('supplies_badge_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'supply_transactions',
        filter: `station_id=eq.${stationId}`
      }, async () => {
        const { count: newCount } = await supabase
          .from('supply_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('station_id', stationId)
          .eq('status', 'pending');
        
        if (newCount !== null) setCount(newCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stationId]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <Truck size={24} />
      {count > 0 && (
        <span className="absolute -top-1 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white leading-none shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
