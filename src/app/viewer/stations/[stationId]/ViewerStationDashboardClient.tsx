'use client';

import React, { useEffect, useState } from 'react';
import { getViewerStationDashboardData } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, HelpCircle, Fuel, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateToDDMMYYYY } from '@/utils/dateFormatter';
import CustomDropdown from '@/components/CustomDropdown';

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
  sales: {
    id: string;
    quantity_sold: number;
    product_name: string;
    is_edited?: boolean;
    edited_by?: string;
    original_value?: number;
    date?: string;
    created_at?: string;
    selling_price?: number;
    total_amount?: number;
  }[];
  expenses: {
    id: string;
    expense_type: string;
    amount: number;
    description: string;
    is_edited?: boolean;
    edited_by?: string;
    original_value?: number;
    date?: string;
    created_at?: string;
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
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  const groupedLedger = React.useMemo(() => {
    if (!data || 'error' in data) return [];
    
    const groups: Record<string, { dateStr: string, sortKey: string, sales: typeof data.sales, expenses: typeof data.expenses }> = {};
    
    data.sales.forEach(sale => {
      const rawDate = sale.date || (sale.created_at ? sale.created_at.split('T')[0] : '1970-01-01');
      const displayDate = sale.date ? formatDateToDDMMYYYY(sale.date) : (sale.created_at ? formatDateToDDMMYYYY(sale.created_at) : 'Unknown Date');
      
      if (!groups[rawDate]) groups[rawDate] = { dateStr: displayDate, sortKey: rawDate, sales: [], expenses: [] };
      groups[rawDate].sales.push(sale);
    });
    
    data.expenses.forEach(exp => {
      const rawDate = exp.date || (exp.created_at ? exp.created_at.split('T')[0] : '1970-01-01');
      const displayDate = exp.date ? formatDateToDDMMYYYY(exp.date) : (exp.created_at ? formatDateToDDMMYYYY(exp.created_at) : 'Unknown Date');
      
      if (!groups[rawDate]) groups[rawDate] = { dateStr: displayDate, sortKey: rawDate, sales: [], expenses: [] };
      groups[rawDate].expenses.push(exp);
    });
    
    const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    
    sortedGroups.forEach(g => {
      g.sales.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      g.expenses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    });
    
    return sortedGroups;
  }, [data]);

  useEffect(() => {
    if (groupedLedger.length > 0 && Object.keys(expandedDates).length === 0) {
      setExpandedDates({ [groupedLedger[0].sortKey]: true });
    }
  }, [groupedLedger]);

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
      <div className="px-4 sm:px-6 py-4 space-y-6 flex-1">
        
        {/* Today's Ledger */}
<section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Activity Ledger
            </h2>
          </div>
          
          

          <div className="flex items-center gap-4 mb-4">
            <div className="w-48">
              <CustomDropdown
                value={selectedDateFilter || ''}
                onChange={(val) => setSelectedDateFilter(val || null)}
                placeholder="Filter by Date..."
                options={groupedLedger.map(group => ({ value: group.sortKey, label: group.dateStr }))}
              />
            </div>
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter(null)}
                className="text-sm font-semibold text-tycoon-charcoal hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="space-y-4">
            {groupedLedger.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                No activity found for the selected timeframe.
              </div>
            ) : (
              (selectedDateFilter ? groupedLedger.filter(g => g.sortKey === selectedDateFilter) : groupedLedger).map((group) => (
                <div key={group.sortKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button 
                    onClick={() => setExpandedDates(prev => ({ ...prev, [group.sortKey]: !prev[group.sortKey] }))}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    <h3 className="text-sm font-bold text-tycoon-charcoal">{group.dateStr}</h3>
                    <div className="flex items-center gap-3">
                       {group.sales.length > 0 && <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{group.sales.length} Sales</span>}
                       {group.expenses.length > 0 && <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{group.expenses.length} Expenses</span>}
                       {expandedDates[group.sortKey] || selectedDateFilter ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </button>

                  {(expandedDates[group.sortKey] || selectedDateFilter) && (
                    <div className="p-4 pt-0 border-t border-gray-50">
                      <div className="overflow-x-auto">
                        <div className="min-w-[300px] mt-2">
                      {group.sales.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sales</h4>
                          <div className="space-y-2">
                        {group.sales.map(sale => (
                          <div key={sale.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center hover:bg-gray-100 transition-colors">
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
                            <div className="flex items-center gap-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-sm text-gray-800">
                                  {sale.total_amount ? `₦${Number(sale.total_amount).toLocaleString()}` : ''}
                                </span>
                                <span className="font-bold text-sm text-green-600">
                                  {Number(sale.quantity_sold).toLocaleString()} L
                                </span>
                                {sale.selling_price ? (
                                  <span className="text-xs text-gray-500">
                                    @ ₦{Number(sale.selling_price).toLocaleString()}/L
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {group.sales.length > 0 && group.expenses.length > 0 && (
                    <div className="h-px bg-gray-100 my-4" />
                  )}

                  {group.expenses.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Expenses</h4>
                      <div className="space-y-2">
                        {group.expenses.map(exp => (
                          <div key={exp.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center hover:bg-gray-100 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-800">{exp.expense_type}</span>
                              </div>
                              <span className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-[200px] block mt-0.5">{exp.description || 'No description'}</span>
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
                              <span className="font-bold text-sm text-red-600">₦{Number(exp.amount).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

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

        {/* Sales Trend Chart */}
        <section>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">7-Day Sales Trend</h3>
            <SalesChart data={data.salesTrend} />
          </div>
        </section>
      </div>

    </div>
  );
}
