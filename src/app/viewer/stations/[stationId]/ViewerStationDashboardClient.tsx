'use client';

import React, { useEffect, useState } from 'react';
import { getViewerStationDashboardData } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, HelpCircle, Fuel } from 'lucide-react';

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
  sales: {
    id: string;
    quantity_sold: number;
    product_name: string;
    is_edited?: boolean;
    edited_by?: string;
    original_value?: number;
  }[];
  expenses: {
    id: string;
    expense_type: string;
    amount: number;
    description: string;
    is_edited?: boolean;
    edited_by?: string;
    original_value?: number;
  }[];
};

export default function ViewerStationDashboardClient({
  initialData,
  stationId
}: {
  initialData: ManagerData;
  stationId: string;
}) {
  const [data, setData] = useState<ManagerData | { error: string } | null>(initialData);

  useEffect(() => {
    // Optionally fetch fresh data occasionally or handle real-time here
  }, [stationId]);

  if (!data) return null;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{data.error}</div>;

  return (
    <div className="w-full relative">

      {/* Actionable Alerts (Pending Supplies) */}
      {data.pendingAlerts.length > 0 && (
        <div className="p-4 bg-alert-red text-white flex flex-col gap-2 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Truck size={20} />
              <span className="font-medium text-sm">
                {data.pendingAlerts.length} Supply Delivery Pending
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {data.pendingAlerts.map(alert => (
              <div key={alert.id} className="bg-white/10 p-3 rounded flex justify-between items-center">
                <span className="text-sm font-medium">{alert.quantity}L {alert.productName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 space-y-6 flex-1">
        
        {/* Status Hero */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Current Stock - {data.stationName}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.productStatus.map(prod => (
              <div 
                key={prod.id} 
                className={`p-4 rounded-xl shadow-md border-l-4 bg-white flex justify-between items-center ${
                  prod.status === 'Red' ? 'border-red-500' : 
                  prod.status === 'Yellow' ? 'border-yellow-500' : 'border-green-500'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-full mr-4 ${
                    prod.status === 'Red' ? 'bg-red-50 text-red-500' : 
                    prod.status === 'Yellow' ? 'bg-yellow-50 text-yellow-500' : 'bg-green-50 text-green-500'
                  }`}>
                    <Fuel size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{prod.name}</h3>
                    <p className="text-sm mt-1 text-gray-500 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${
                        prod.status === 'Red' ? 'bg-red-500' : 
                        prod.status === 'Yellow' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                      {prod.stock < 0 ? 'Stock Deficit' : prod.stock === 0 ? 'Depleted' : `Est. ${prod.daysRemaining === Infinity ? '∞' : prod.daysRemaining.toFixed(1)} Days Left`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-2xl ${prod.stock < 0 ? 'text-red-600' : 'text-tycoon-navy'}`}>
                    {prod.stock < 0 ? `-${Math.abs(prod.stock).toLocaleString()}` : `${prod.stock.toLocaleString()}`}
                    <span className="text-sm text-gray-500 ml-1">L</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Today's Ledger */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Activity Ledger
            </h2>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">7-Day Sales Trend</h3>
            <SalesChart data={data.salesTrend} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Sales Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today&apos;s Sales Entries</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data.sales.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No sales logged today.</div>
                ) : (
                  data.sales.map(sale => (
                    <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <span className="font-medium text-sm text-gray-800 block">{sale.product_name}</span>
                        <span className="text-xs text-gray-500 block">Logged Entry</span>
                        {sale.is_edited && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-slate-500">Edited by {sale.edited_by} (admin)</span>
                            <span title={`Changed from ${sale.original_value?.toLocaleString()} to ${sale.quantity_sold.toLocaleString()}`}>
                              <HelpCircle size={12} className="text-slate-400 cursor-help" />
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-tycoon-charcoal">{Number(sale.quantity_sold).toLocaleString()} L</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Today's Expenses Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today&apos;s Expenses</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data.expenses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No expenses logged today.</div>
                ) : (
                  data.expenses.map(exp => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <span className="font-medium text-sm text-gray-800 block">{exp.expense_type}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-[200px] block">{exp.description || 'No description'}</span>
                        {exp.is_edited && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-slate-500">Edited by {exp.edited_by} (admin)</span>
                            <span title={`Changed from ₦${exp.original_value?.toLocaleString()} to ₦${exp.amount.toLocaleString()}`}>
                              <HelpCircle size={12} className="text-slate-400 cursor-help" />
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-sm text-tycoon-charcoal">₦{Number(exp.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
