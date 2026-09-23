'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getAdminStationDashboardData, adminEditTransaction, adminAcceptSupply } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, Edit2, X, Check, HelpCircle, Fuel, TrendingUp, DollarSign, Wallet, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateTimeToDDMMYYYY, formatDateToDDMMYYYY } from '@/utils/dateFormatter';
import toast from 'react-hot-toast';
import { catchNetworkError } from '@/utils/network';
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
    date: string;
    created_at: string;
  }[];
  expenses: {
    id: string;
    expense_type: string;
    amount: number;
    description: string;
    is_edited?: boolean;
    edited_by?: string;
    original_value?: number;
    status?: 'pending' | 'approved' | 'rejected';
    date: string;
    created_at: string;
  }[];
  financialOverview: {
    revenue: number;
    cogs: number;
    approvedExpenses: number;
    netProfit: number;
  };
  yesterdaysSummary?: {
    revenue: number;
    expenses: { id: string; type: string; amount: number }[];
    totalExpenses: number;
    expectedRemittance: number;
  };
  recentLogs?: {
    id: string;
    type: 'sale' | 'expense';
    stationName: string;
    detail: string;
    amount: string;
    subtitle?: string;
    timestamp: string;
    capturedDate?: string;
  }[];
};

export default function AdminStationDashboardClient({
  initialData,
  stationId
}: {
  initialData: ManagerData;
  stationId: string;
}) {
  const [data, setData] = useState<ManagerData | { error: string } | null>(initialData);
  const [timeframe, setTimeframe] = useState<string>('30D');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  // Correction Modal State
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'sale'|'expense', name: string, amount: number } | null>(null);

  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialMount = useRef(true);

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


  const loadData = async () => {
    setIsLoading(true);
    const res = await catchNetworkError(getAdminStationDashboardData(stationId, timeframe));
    if (!res) {
      setData({ error: 'Failed to load manager data.' });
    } else if (res && 'error' in res) {
      setData({ error: res.error as string });
    } else {
      setData(res as ManagerData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (groupedLedger.length > 0 && Object.keys(expandedDates).length === 0) {
      setExpandedDates({ [groupedLedger[0].sortKey]: true });
    }
  }, [groupedLedger]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    loadData();
  }, [stationId, timeframe]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !data || 'error' in data) return;
    
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    const res = await catchNetworkError(adminEditTransaction(editingItem.type, editingItem.id, newVal, editingItem.amount, data.stationName));
    setIsSubmitting(false);

    if (res && 'error' in res) {
      toast.error(res.error as string);
    } else {
      toast.success('Transaction updated successfully');
      setEditingItem(null);
      loadData();
    }
  };

  const handleAcceptSupply = async (transactionId: string, quantity: number, productName: string) => {
    if (!data || 'error' in data) return;
    if (!confirm(`Are you sure you want to accept ${quantity}L of ${productName}?`)) return;
    
    const res = await catchNetworkError(adminAcceptSupply(transactionId, quantity, productName, data.stationName, stationId));
    if (res && res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Supply of ${quantity}L ${productName} accepted`);
      loadData();
    }
  };



  if (!data) return null;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{data.error}</div>;

  const timeframes = [
    { label: '24H', value: '24H' },
    { label: '7D', value: '7D' },
    { label: '30D', value: '30D' },
    { label: '60D', value: '60D' },
    { label: '90D', value: '90D' },
    { label: '1Y', value: '1Y' },
    { label: '3Y', value: '3Y' },
    { label: '5Y', value: '5Y' }
  ];

  const currentTfLabel = timeframes.find(t => t.value === timeframe)?.label || '30D';

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
                <button 
                  onClick={() => handleAcceptSupply(alert.id, alert.quantity, alert.productName)}
                  className="bg-white text-alert-red px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 flex items-center gap-1"
                >
                  <Check size={14} /> Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 py-4 space-y-6 flex-1">
        
        {/* Recent Ledger */}
<section className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
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
                              <span className="text-xs text-gray-500 block">Captured: {sale.date ? formatDateToDDMMYYYY(sale.date) : 'N/A'} | Posted: {sale.created_at ? formatDateTimeToDDMMYYYY(sale.created_at) : 'N/A'}</span>
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
                              <span className="font-bold text-sm text-green-600">{Number(sale.quantity_sold).toLocaleString()} L</span>
                              <button 
                                onClick={() => {
                                  setEditingItem({ id: sale.id, type: 'sale', name: sale.product_name, amount: sale.quantity_sold });
                                  setEditValue(sale.quantity_sold.toString());
                                }}
                                className="text-gray-400 hover:text-tycoon-red p-1 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
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
                              <span className="text-xs text-gray-500 block mt-0.5">Captured: {exp.date ? formatDateToDDMMYYYY(exp.date) : 'N/A'} | Posted: {exp.created_at ? formatDateTimeToDDMMYYYY(exp.created_at) : 'N/A'}</span>
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
                              <button 
                                onClick={() => {
                                  setEditingItem({ id: exp.id, type: 'expense', name: exp.expense_type, amount: exp.amount });
                                  setEditValue(exp.amount.toString());
                                }}
                                className="text-gray-400 hover:text-tycoon-red p-1 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
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

        {/* Yesterday's EOD Summary */}
{data.yesterdaysSummary && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
                <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
                Yesterday's EOD Summary
              </h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row justify-between gap-6">
                
                {/* Revenue & Remittance */}
                <div className="flex-1 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Total Sales Revenue (Yesterday)</h3>
                    <p className="font-bold text-2xl text-tycoon-charcoal mt-1">
                      ₦{data.yesterdaysSummary.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-2">
                      Expected Cash Remittance
                    </h3>
                    <p className="font-bold text-3xl text-emerald-700 mt-1">
                      ₦{data.yesterdaysSummary.expectedRemittance.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      (Total Sales Revenue - Total Expenses)
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* Financial Overview */}
<section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Financial Overview (Last {currentTfLabel})
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    timeframe === tf.value 
                      ? 'bg-tycoon-red text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-gray-400" size={16} />
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Revenue</h3>
              </div>
              <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${data.financialOverview.revenue.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.financialOverview.revenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Package className="text-gray-400" size={16} />
                <h3 className="text-xs font-semibold text-gray-500 uppercase">COGS</h3>
              </div>
              <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${data.financialOverview.cogs.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.financialOverview.cogs)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="text-gray-400" size={16} />
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Expenses</h3>
              </div>
              <p className="font-bold text-lg text-tycoon-charcoal truncate" title={`₦${data.financialOverview.approvedExpenses.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.financialOverview.approvedExpenses)}</p>
            </div>
            <div className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between ${data.financialOverview.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={data.financialOverview.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} size={16} />
                <h3 className={`text-xs font-bold uppercase ${data.financialOverview.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</h3>
              </div>
              <p className={`font-bold text-lg truncate ${data.financialOverview.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`} title={`₦${Math.abs(data.financialOverview.netProfit).toLocaleString()}`}>
                {data.financialOverview.netProfit >= 0 ? '' : '-'}₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(Math.abs(data.financialOverview.netProfit))}
              </p>
            </div>
          </div>
        </section>

        {/* Status Hero */}
<section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal flex items-center">
              <span className="w-1 h-5 bg-red-600 rounded mr-2 inline-block"></span>
              Current Stock - {data.stationName} (Admin Override)
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.productStatus.map(prod => (
              <div 
                key={prod.id} 
                className={`p-4 rounded-xl shadow-md border-l-4 bg-white flex justify-between items-center ${
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
        <section className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">{currentTfLabel} Sales Trend</h3>
            <SalesChart data={data.salesTrend} />
          </div>
        </section>
      </div>

      {/* Edit/Correct Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-tycoon-charcoal">Admin Override: Edit</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Editing:</p>
                <p className="font-bold text-tycoon-charcoal">{editingItem.name}</p>
                <p className="text-xs text-gray-400 mt-1">Original: {editingItem.type === 'sale' ? `${editingItem.amount.toLocaleString()} L` : `₦${editingItem.amount.toLocaleString()}`}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  New Value ({editingItem.type === 'sale' ? 'Liters' : 'Dollars'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-tycoon-red"
                  placeholder="Enter corrected amount..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Admin Override'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
