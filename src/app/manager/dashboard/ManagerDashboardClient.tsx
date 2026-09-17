'use client';

import React from 'react';
import Link from 'next/link';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';

export type ManagerData = {
  stationName: string;
  productStatus: {
    id: string;
    name: string;
    stock: number;
    daysRemaining: number;
    status: 'Red' | 'Yellow' | 'Green';
  }[];
  pendingAlerts: {
    id: string;
    quantity: number;
    productName: string;
  }[];
  salesTrend: SalesData[];
  netProfit: number;
};

export default function ManagerDashboardClient({ initialData }: { initialData: ManagerData }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('manager_supply_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'supply_transactions' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'supply_transactions' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="w-full relative">

      {/* Actionable Alerts (Pending Supplies) */}
      {initialData.pendingAlerts.length > 0 && (
        <div className="p-4 bg-alert-red text-white flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-2">
            <Truck size={20} />
            <span className="font-medium text-sm">
              {initialData.pendingAlerts.length} Supply Delivery Pending
            </span>
          </div>
          <Link href="/manager/supplies" className="bg-white text-alert-red px-3 py-1 rounded text-xs font-bold hover:bg-gray-100">
            Review
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 space-y-6 flex-1">
        
        {/* Status Hero */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal">Current Stock</h2>
          </div>
          <div className="grid gap-4">
            {initialData.productStatus.map(prod => (
              <div 
                key={prod.id} 
                className={`p-4 rounded-lg shadow-sm border-l-4 bg-white flex justify-between items-center ${
                  prod.status === 'Red' ? 'border-alert-red' : 
                  prod.status === 'Yellow' ? 'border-transparent' : 'border-green-500'
                }`}
              >
                <div>
                  <h3 className="font-bold text-gray-800">{prod.name}</h3>
                  <p className={`text-sm mt-1 ${prod.stock <= 0 ? 'text-alert-red font-semibold' : 'text-gray-500'}`}>
                    {prod.stock < 0 ? 'Stock Deficit' : prod.stock === 0 ? 'Depleted' : `Est. ${prod.daysRemaining === Infinity ? '∞' : prod.daysRemaining.toFixed(1)} Days Left`}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-xl ${prod.stock < 0 ? 'text-red-600' : ''}`}>
                    {prod.stock < 0 ? `-${Math.abs(prod.stock).toLocaleString()} L Deficit` : `${prod.stock.toLocaleString()} L`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard Analytics */}
        <section>
          <h2 className="text-lg font-bold mb-3 text-tycoon-charcoal">Activity &amp; Performance</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">7-Day Sales Trend</h3>
              <SalesChart data={initialData.salesTrend} />
            </div>
            <div className={`p-6 rounded-lg shadow-sm border flex flex-col justify-center items-center text-center ${initialData.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-sm font-bold uppercase mb-2 ${initialData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Current Month PnL</h3>
              <p className={`font-bold text-3xl ${initialData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {initialData.netProfit >= 0 ? '' : '-'}₦{Math.abs(initialData.netProfit).toLocaleString()}
              </p>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
