'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminStationDashboardData, adminEditTransaction, adminAcceptSupply, verifyExpense } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, Edit2, X, Check, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { catchNetworkError } from '@/utils/network';

type ManagerData = {
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
    status?: 'pending' | 'approved' | 'rejected';
  }[];
  financialOverview: {
    revenue: number;
    cogs: number;
    approvedExpenses: number;
    netProfit: number;
  };
};

export default function AdminStationDashboard() {
  const params = useParams();
  const stationId = params.stationId as string;
  const [data, setData] = useState<ManagerData | { error: string } | null>(null);
  const [timeframe, setTimeframe] = useState<string>('30D');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Correction Modal State
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'sale'|'expense', name: string, amount: number } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

    if (res && res.error) {
      toast.error(res.error);
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

  const handleVerifyExpense = async (id: string, status: 'approved' | 'rejected', amount: number, reason: string) => {
    if (!data || 'error' in data) return;
    setVerifyingId(id);
    const res = await catchNetworkError(verifyExpense(id, status, amount, reason, data.stationName));
    setVerifyingId(null);

    if (res && res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Expense ${status}`);
      loadData();
    }
  };

  if (!data && isLoading) return <div className="p-8 text-tycoon-charcoal">Loading Operations...</div>;
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
      <div className="p-4 space-y-6 flex-1">
        
        {/* Status Hero */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-tycoon-charcoal">Current Stock - {data.stationName} (Admin Override)</h2>
          </div>
          <div className="grid gap-4">
            {data.productStatus.map(prod => (
              <div 
                key={prod.id} 
                className={`p-4 rounded-lg shadow-sm border-l-4 bg-white flex justify-between items-center ${
                  prod.status === 'Red' ? 'border-alert-red' : 
                  prod.status === 'Yellow' ? 'border-yellow-400' : 'border-green-500'
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
                  <div className="mt-1"><UrgencyBadge status={prod.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Financial Overview */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-lg font-bold text-tycoon-charcoal">Financial Overview (Last {currentTfLabel})</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    timeframe === tf.value 
                      ? 'bg-tycoon-navy text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Revenue</h3>
              <p className="font-bold text-xl text-tycoon-navy mt-1">₦{data.financialOverview.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">COGS</h3>
              <p className="font-bold text-xl text-tycoon-navy mt-1">₦{data.financialOverview.cogs.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Approved Expenses</h3>
              <p className="font-bold text-xl text-tycoon-navy mt-1">₦{data.financialOverview.approvedExpenses.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-lg shadow-sm border ${data.financialOverview.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-xs font-bold uppercase ${data.financialOverview.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</h3>
              <p className={`font-bold text-xl mt-1 ${data.financialOverview.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {data.financialOverview.netProfit >= 0 ? '' : '-'}₦{Math.abs(data.financialOverview.netProfit).toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Ledger */}
        <section className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <h2 className="text-lg font-bold mb-3 text-tycoon-charcoal">Activity Ledger</h2>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">{currentTfLabel} Sales Trend</h3>
            <SalesChart data={data.salesTrend} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sales Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Sales Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto min-w-[400px]">
                  {data.sales.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No recent sales logged.</div>
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
                        <button 
                          onClick={() => {
                            setEditingItem({ id: sale.id, type: 'sale', name: sale.product_name, amount: sale.quantity_sold });
                            setEditValue(sale.quantity_sold.toString());
                          }}
                          className="text-gray-400 hover:text-tycoon-navy p-1 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>

            {/* Today's Expenses Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending &amp; Recent Expenses</h3>
              </div>
              <div className="overflow-x-auto">
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto min-w-[500px]">
                  {data.expenses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No recent expenses logged.</div>
                ) : (
                  data.expenses.map(exp => (
                    <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">{exp.expense_type}</span>
                          {exp.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Pending</span>}
                          {exp.status === 'approved' && <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Approved</span>}
                          {exp.status === 'rejected' && <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Rejected</span>}
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
                        <span className="font-bold text-sm text-tycoon-charcoal">₦{Number(exp.amount).toLocaleString()}</span>
                        
                        {exp.status === 'pending' && (
                          <div className="flex items-center gap-1 mr-2">
                            <button
                              onClick={() => handleVerifyExpense(exp.id, 'approved', exp.amount, exp.expense_type)}
                              disabled={verifyingId === exp.id}
                              className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleVerifyExpense(exp.id, 'rejected', exp.amount, exp.expense_type)}
                              disabled={verifyingId === exp.id}
                              className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        <button 
                          onClick={() => {
                            setEditingItem({ id: exp.id, type: 'expense', name: exp.expense_type, amount: exp.amount });
                            setEditValue(exp.amount.toString());
                          }}
                          className="text-gray-400 hover:text-tycoon-navy p-1 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Edit/Correct Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-tycoon-navy">Admin Override: Edit</h3>
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
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
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
