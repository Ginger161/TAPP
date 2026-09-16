'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getManagerDashboardData, correctTransaction } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, Edit2, X, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
};

export default function ManagerDashboard() {
  const [data, setData] = useState<ManagerData | { error: string } | null>(null);
  
  // Correction Modal State
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'sale'|'expense', name: string, amount: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');



  const loadData = () => {
    getManagerDashboardData()
      .then(res => {
        if (!res) setData({ error: 'Failed to load manager data.' });
        else setData(res as ManagerData);
      })
      .catch(err => setData({ error: err.message || 'An error occurred' }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await correctTransaction(editingItem.type, editingItem.id, newVal, editingItem.amount);
      toast.success('Transaction updated successfully');
      setEditingItem(null);
      loadData(); // Reload to show new data
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!data) return <div className="p-8 text-tycoon-charcoal">Loading Operations...</div>;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{data.error}</div>;

  return (
    <div className="w-full relative">

      {/* Actionable Alerts (Pending Supplies) */}
      {data.pendingAlerts.length > 0 && (
        <div className="p-4 bg-alert-red text-white flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-2">
            <Truck size={20} />
            <span className="font-medium text-sm">
              {data.pendingAlerts.length} Supply Delivery Pending
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

        {/* Today's Ledger */}
        <section>
          <h2 className="text-lg font-bold mb-3 text-tycoon-charcoal">Activity Ledger</h2>
          
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
              <div className="overflow-x-auto">
                <div className="divide-y divide-gray-100 min-w-[400px]">
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today&apos;s Expenses</h3>
              </div>
              <div className="overflow-x-auto">
                <div className="divide-y divide-gray-100 min-w-[500px]">
                  {data.expenses.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No expenses logged today.</div>
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
              <h3 className="font-bold text-tycoon-navy">Correct Entry</h3>
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
                {isSubmitting ? 'Submitting...' : 'Submit Correction'}
              </button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
