'use client';

import React from 'react';
import Link from 'next/link';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, Fuel, TrendingUp, DollarSign, Wallet, Package } from 'lucide-react';
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
    status: 'Red' | 'Normal' | 'Green';
  }[];
  pendingAlerts: {
    id: string;
    quantity: number;
    productName: string;
  }[];
  salesTrend: SalesData[];
  netProfit: number;
  revenue: number;
  cogs: number;
  approvedExpenses: number;
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
      <div className="px-4 sm:px-6 py-4 space-y-6 flex-1">
        

        {/* Status Hero */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Current Stock
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {initialData.productStatus.map(prod => (
              <div 
                key={prod.id} 
                className={`p-6 rounded-xl shadow-md border-l-4 bg-white flex justify-between items-center ${
                  prod.status === 'Red' ? 'border-red-500' : 
                  prod.status === 'Green' ? 'border-green-500' : 'border-transparent'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-full mr-4 ${
                    prod.status === 'Red' ? 'bg-red-50 text-red-500' : 
                    prod.status === 'Green' ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'
                  }`}>
                    <Fuel size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{prod.name}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-2xl ${prod.stock < 0 ? 'text-red-600' : 'text-tycoon-charcoal'}`}>
                    {prod.stock < 0 ? `-${Math.abs(prod.stock).toLocaleString()}` : `${prod.stock.toLocaleString()}`}
                    <span className="text-sm text-gray-500 ml-1">L</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard Analytics */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Activity &amp; Performance
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">7-Day Sales Trend</h3>
              <SalesChart data={initialData.salesTrend} />
            </div>
            
            <div className="lg:col-span-1 grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-gray-400" size={16} />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Revenue</h3>
                </div>
                <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${initialData.revenue.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(initialData.revenue)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-gray-400" size={16} />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">COGS</h3>
                </div>
                <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${initialData.cogs.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(initialData.cogs)}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="text-gray-400" size={16} />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Expenses</h3>
                </div>
                <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${initialData.approvedExpenses.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(initialData.approvedExpenses)}</p>
              </div>
              <div className={`p-6 rounded-xl shadow-sm border flex flex-col justify-between ${initialData.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={initialData.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} size={16} />
                  <h3 className={`text-xs font-bold uppercase ${initialData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</h3>
                </div>
                <p className={`font-bold text-lg truncate ${initialData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`} title={`₦${Math.abs(initialData.netProfit).toLocaleString()}`}>
                  {initialData.netProfit >= 0 ? '' : '-'}₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(Math.abs(initialData.netProfit))}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
