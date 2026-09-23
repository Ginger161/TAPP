'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAdminStationDashboardData, adminEditTransaction, adminAcceptSupply } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import { Truck, Edit2, X, Check, HelpCircle } from 'lucide-react';

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
  }[];
};

export default function AdminStationDashboard() {
  const params = useParams();
  const stationId = params.stationId as string;
  const [data, setData] = useState<ManagerData | { error: string } | null>(null);
  
  // Correction Modal State
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'sale'|'expense', name: string, amount: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = () => {
    getAdminStationDashboardData(stationId)
      .then(res => {
        if (!res) setData({ error: 'Failed to load manager data.' });
        else setData(res as ManagerData);
      })
      .catch(err => setData({ error: err.message || 'An error occurred' }));
  };

  useEffect(() => {
    loadData();
  }, [stationId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !data || 'error' in data) return;
    
    const newVal = parseFloat(editValue);
    if (isNaN(newVal) || newVal <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await adminEditTransaction(editingItem.type, editingItem.id, newVal, editingItem.amount, data.stationName);
      setEditingItem(null);
      loadData(); // Reload to show new data
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptSupply = async (transactionId: string, quantity: number, productName: string) => {
    if (!data || 'error' in data) return;
    if (!confirm(`Are you sure you want to accept ${quantity}L of ${productName}?`)) return;
    
    try {
      const res = await adminAcceptSupply(transactionId, quantity, productName, data.stationName, stationId);
      if (res.error) throw new Error(res.error);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept supply');
    }
  };

  if (!data) return <div className="p-8 text-tycoon-charcoal">Loading Operations...</div>;
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
                  <p className="text-sm text-gray-500 mt-1">
                    Est. {prod.daysRemaining === Infinity ? '∞' : prod.daysRemaining.toFixed(1)} Days Left
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl">{prod.stock.toLocaleString()} L</div>
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
              <div className="divide-y divide-gray-100">
                {data.sales.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No sales transactions recorded.</div>
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
                          className="text-gray-400 hover:text-tycoon-red p-1 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
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
                  <div className="p-4 text-center text-sm text-gray-500">No expense records found.</div>
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
                  ))
                )}
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
                  type="number" inputMode="decimal" pattern="[0-9]*"
                  step="0.01"
                  required
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-tycoon-red"
                  placeholder="Enter corrected amount..."
                />
              </div>

              {errorMsg && <p className="text-sm text-alert-red font-semibold">{errorMsg}</p>}

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
