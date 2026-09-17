'use client';

import React, { useEffect, useState } from 'react';
import { getAdminDashboardData, getStationDeepDive, getStationHistoricalSales, initiateSupply, updatePendingSupply, MapStation, Timeframe } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import Link from 'next/link';
import toast from 'react-hot-toast';
import NotificationManager from '@/components/NotificationManager';
import { createClient } from '@/utils/supabase/client';

type DashboardData = {
  kpi: { volume: number, revenue: number, pendingVolume: number };
  mapStations: MapStation[];
  isViewer: boolean;
  pendingSuppliesList?: {
    id: string;
    stationName: string;
    productName: string;
    quantity: number;
    costPrice: number;
    date: string;
  }[];
  recentLogs?: {
    id: string;
    type: 'sale' | 'expense';
    stationName: string;
    detail: string;
    amount: string;
    timestamp: string;
  }[];
};

type DeepDiveData = {
  salesTrend: SalesData[];
  stockList: { id: string; name: string, quantity: number }[];
  recentLogs?: {
    id: string;
    type: 'sale' | 'expense';
    stationName: string;
    detail: string;
    amount: string;
    timestamp: string;
  }[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Inline Supply Modal State
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyData, setSupplyData] = useState({ productId: '', quantity: '', costPrice: '', supplier: '' });
  const [isSubmittingSupply, setIsSubmittingSupply] = useState(false);

  const [isEditSupplyModalOpen, setIsEditSupplyModalOpen] = useState(false);
  const [selectedPendingSupply, setSelectedPendingSupply] = useState<any>(null);
  const [editSupplyData, setEditSupplyData] = useState({ quantity: '', costPrice: '' });
  const [isSubmittingEditSupply, setIsSubmittingEditSupply] = useState(false);

  useEffect(() => {
    getAdminDashboardData().then(setData);

    const supabase = createClient();
    const channel = supabase.channel('admin_supply_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'supply_transactions' }, () => {
        getAdminDashboardData().then(setData);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'supply_transactions' }, () => {
        getAdminDashboardData().then(setData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedStationId) {
      // Reset timeframe when opening a new station
      setTimeframe('7D');
      setIsSupplyModalOpen(false);
      getStationDeepDive(selectedStationId).then(data => {
        if (active) setDeepDiveData(data);
      });
    }
    return () => { active = false; };
  }, [selectedStationId]);

  useEffect(() => {
    let active = true;
    if (selectedStationId && timeframe !== '7D') {
      setIsChartLoading(true);
      getStationHistoricalSales(selectedStationId, timeframe).then(trend => {
        if (active) {
          setDeepDiveData(prev => prev ? { ...prev, salesTrend: trend } : null);
          setIsChartLoading(false);
        }
      });
    } else if (selectedStationId && timeframe === '7D' && deepDiveData) {
       setIsChartLoading(true);
       getStationHistoricalSales(selectedStationId, '7D').then(trend => {
         if (active) {
           setDeepDiveData(prev => prev ? { ...prev, salesTrend: trend } : null);
           setIsChartLoading(false);
         }
       });
    }
    return () => { active = false; };
  }, [timeframe, selectedStationId]);

  const handleSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStationId || !supplyData.productId) return;
    setIsSubmittingSupply(true);
    const res = await initiateSupply({
      stationId: selectedStationId,
      productId: supplyData.productId,
      quantity: parseFloat(supplyData.quantity),
      costPrice: parseFloat(supplyData.costPrice),
      supplier: supplyData.supplier
    });
    setIsSubmittingSupply(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Supply initiated successfully!');
      // Reload dashboard data
      getAdminDashboardData().then(setData);
      setTimeout(() => {
        setIsSupplyModalOpen(false);
        setSupplyData({ productId: '', quantity: '', costPrice: '', supplier: '' });
      }, 1500);
    }
  };

  if (!data) return <div className="p-8 text-tycoon-charcoal flex items-center justify-center h-screen">Loading Command Center...</div>;

  const selectedStation = data.mapStations.find(s => s.id === selectedStationId);

  return (
    <div className="flex flex-col flex-1 bg-gray-50 text-tycoon-charcoal overflow-hidden">
      {/* Top KPI Ribbon (Financial/Stock Metrics Only) */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-8 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-wider text-xs font-semibold">Today&apos;s Volume</span>
            <span className="font-bold text-lg text-tycoon-navy truncate" title={`${data.kpi.volume.toLocaleString()} L`}>{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.kpi.volume)} L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-wider text-xs font-semibold">Today&apos;s Revenue</span>
            <span className="font-bold text-lg text-tycoon-navy truncate" title={`₦${data.kpi.revenue.toLocaleString()}`}>₦{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.kpi.revenue)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-wider text-xs font-semibold">Pending Supplies</span>
            <span className="font-bold text-lg text-tycoon-red truncate" title={`${data.kpi.pendingVolume.toLocaleString()} L`}>{Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(data.kpi.pendingVolume)} L</span>
          </div>
        </div>
      </div>

      {/* Main Content Area (Full Screen Grid) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 md:p-8">
        {/* Push Notification Manager */}
        <NotificationManager />

        {/* PENDING SUPPLIES */}
        {data.pendingSuppliesList && data.pendingSuppliesList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-tycoon-charcoal mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              Pending Supplies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.pendingSuppliesList.map(supply => (
                <div key={supply.id} className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-yellow-900">{supply.stationName}</h3>
                      <p className="text-sm text-yellow-700">{supply.productName} • {supply.date}</p>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4 text-sm">
                    <div className="flex justify-between text-yellow-800">
                      <span>Quantity:</span>
                      <span className="font-semibold">{supply.quantity.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between text-yellow-800">
                      <span>Cost Price:</span>
                      <span className="font-semibold">₦{supply.costPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPendingSupply(supply);
                      setEditSupplyData({ quantity: String(supply.quantity), costPrice: String(supply.costPrice) });
                      setIsEditSupplyModalOpen(true);
                    }}
                    className="w-full bg-white hover:bg-yellow-100 text-yellow-700 border border-yellow-300 font-bold py-2 rounded-lg transition-colors"
                  >
                    Edit Supply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-tycoon-charcoal mb-6">Station Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.mapStations.map(station => (
            <div 
              key={station.id} 
              onClick={() => {
                if (selectedStationId !== station.id) {
                  setDeepDiveData(null);
                  setSelectedStationId(station.id);
                }
              }}
              className={`p-5 rounded-xl cursor-pointer border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${selectedStationId === station.id ? 'border-tycoon-navy bg-blue-50/50 ring-2 ring-tycoon-navy/20' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-bold text-lg text-tycoon-navy block">{station.name}</span>
                  <span className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    {station.managerName || 'Unassigned'}
                  </span>
                </div>
                <UrgencyBadge status={station.urgency} />
              </div>
              
              {/* Product details */}
              {station.products && station.products.length > 0 && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                  {station.products.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full border border-gray-200 ${
                          prod.status === 'Red' ? 'bg-red-500' :
                          prod.status === 'Normal' ? 'bg-transparent' : 'bg-green-500'
                        }`} />
                        <span className="text-gray-600 font-medium">{prod.name}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-base block ${prod.stock < 0 ? 'text-red-600' : ''}`}>
                          {prod.stock < 0 ? `-${Math.abs(prod.stock).toLocaleString()} L Deficit` : `${prod.stock.toLocaleString()} L`}
                        </span>
                        <span className={`text-xs ${prod.stock <= 0 ? 'text-alert-red font-semibold' : 'text-gray-400'}`}>
                          {prod.stock < 0 ? 'Stock Deficit' : prod.stock === 0 ? 'Depleted' : `Est. ${prod.daysRemaining === Infinity ? '∞' : prod.daysRemaining.toFixed(1)} Days Left`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                <Link 
                  href={`/admin/stations/${station.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition-colors text-sm"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Station Deep Dive Overlay / Modal */}
      {selectedStationId && selectedStation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h3 className="font-bold text-xl text-tycoon-navy">{selectedStation.name}</h3>
                <div className="mt-1"><UrgencyBadge status={selectedStation.urgency} /></div>
              </div>
              <button onClick={() => {
                setDeepDiveData(null);
                setSelectedStationId(null);
              }} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {!deepDiveData ? (
                <div className="flex items-center justify-center h-48 text-gray-500">Loading details...</div>
              ) : isSupplyModalOpen ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-tycoon-charcoal">Initiate Supply</h4>
                    <button onClick={() => setIsSupplyModalOpen(false)} className="text-xs text-gray-500 hover:text-gray-800">Back</button>
                  </div>

                  <form onSubmit={handleSupplySubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Product</label>
                      <select required className="w-full min-w-0 max-w-[calc(100vw-3rem)] text-ellipsis overflow-hidden p-2 border border-gray-200 rounded-lg outline-none" value={supplyData.productId} onChange={(e) => setSupplyData({...supplyData, productId: e.target.value})}>
                        <option value="">Select a product...</option>
                        {deepDiveData.stockList.map(stock => (
                          <option key={stock.id} value={stock.id}>{stock.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Volume (L)</label>
                      <input required type="number" min="0" step="1" className="w-full p-2 border border-gray-200 rounded-lg outline-none" placeholder="e.g. 10000" value={supplyData.quantity} onChange={(e) => setSupplyData({...supplyData, quantity: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Total Cost (₦)</label>
                      <input required type="number" min="0" step="0.01" className="w-full p-2 border border-gray-200 rounded-lg outline-none" placeholder="e.g. 500000" value={supplyData.costPrice} onChange={(e) => setSupplyData({...supplyData, costPrice: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Supplier Name</label>
                      <input required type="text" className="w-full p-2 border border-gray-200 rounded-lg outline-none" placeholder="e.g. NNPC" value={supplyData.supplier} onChange={(e) => setSupplyData({...supplyData, supplier: e.target.value})} />
                    </div>
                    <button disabled={isSubmittingSupply} type="submit" className="w-full bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50">
                      {isSubmittingSupply ? 'Dispatching...' : 'Dispatch Supply'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Stock</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {deepDiveData.stockList.map(stock => (
                        <div key={stock.name} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <span className="block text-gray-500 mb-1">{stock.name}</span>
                          <span className="font-bold text-lg">{Number(stock.quantity).toLocaleString()} L</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!data.isViewer && (
                    <button 
                      onClick={() => setIsSupplyModalOpen(true)} 
                      className="w-full bg-tycoon-red hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Initiate Supply
                    </button>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Trend</h4>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-medium">
                        {(['7D', '30D', '6M', '1Y'] as Timeframe[]).map(tf => (
                          <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 rounded-md transition-colors ${
                              timeframe === tf 
                                ? 'bg-tycoon-red text-white shadow-sm' 
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 relative">
                      {isChartLoading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
                          <span className="text-sm text-gray-500 font-medium">Loading...</span>
                        </div>
                      )}
                      <SalesChart data={deepDiveData.salesTrend} />
                    </div>
                  </div>
                  
                  {/* LOCAL LAST DAY DIGEST */}
                  {deepDiveData.recentLogs && deepDiveData.recentLogs.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Day Digest</h4>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-[300px] overflow-y-auto">
                        <ul className="divide-y divide-gray-100">
                          {deepDiveData.recentLogs.map((log) => (
                            <li key={log.id} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${log.type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {log.type === 'sale' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4M12 4L4 12L12 20" /></svg>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-gray-900 truncate">{log.type === 'sale' ? `Sold: ${log.detail}` : `Expense: ${log.detail}`}</span>
                                  <span className="text-xs text-gray-500 truncate">{new Intl.DateTimeFormat('en-US', { timeStyle: 'short', dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(log.timestamp))}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className={`font-bold ${log.type === 'sale' ? 'text-green-700' : 'text-tycoon-charcoal'}`}>
                                  {log.amount}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUPPLY MODAL */}
      {isEditSupplyModalOpen && selectedPendingSupply && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-tycoon-charcoal">Edit Pending Supply</h2>
              <button 
                onClick={() => {
                  setIsEditSupplyModalOpen(false);
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Station</p>
                <p className="text-gray-900 bg-gray-100 px-3 py-2 rounded-lg text-sm">{selectedPendingSupply.stationName}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Product</p>
                <p className="text-gray-900 bg-gray-100 px-3 py-2 rounded-lg text-sm">{selectedPendingSupply.productName}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Liters)</label>
                <input 
                  type="number"
                  value={editSupplyData.quantity}
                  onChange={e => setEditSupplyData({...editSupplyData, quantity: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-tycoon-navy focus:ring-1 focus:ring-tycoon-navy outline-none transition-all text-gray-900"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₦)</label>
                <input 
                  type="number"
                  value={editSupplyData.costPrice}
                  onChange={e => setEditSupplyData({...editSupplyData, costPrice: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-tycoon-navy focus:ring-1 focus:ring-tycoon-navy outline-none transition-all text-gray-900"
                />
              </div>

              <button 
                disabled={isSubmittingEditSupply}
                onClick={async (e) => {
                  setIsSubmittingEditSupply(true);
                  
                  if (!editSupplyData.quantity || !editSupplyData.costPrice) {
                    toast.error('All fields are required.');
                    setIsSubmittingEditSupply(false);
                    return;
                  }

                  const res = await updatePendingSupply(selectedPendingSupply.id, Number(editSupplyData.quantity), Number(editSupplyData.costPrice));
                  
                  if (res.success) {
                    toast.success('Supply updated successfully!');
                    getAdminDashboardData().then(setData);
                    setTimeout(() => {
                      setIsEditSupplyModalOpen(false);
                    }, 1500);
                  } else {
                    toast.error(res.error || 'Failed to update supply.');
                  }
                  setIsSubmittingEditSupply(false);
                }}
                className="w-full bg-tycoon-navy hover:bg-blue-900 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmittingEditSupply ? 'Updating...' : 'Update Supply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEV TOOLS */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 flex justify-center pb-8">
          <button 
            onClick={async (e) => {
              const btn = e.currentTarget;
              btn.disabled = true;
              btn.innerText = 'Resetting...';
              try {
                // We use dynamic import so it doesn't break client bundles if not needed, 
                // but static import is fine too. Let's just call it.
                const { resetTestData } = await import('../actions/devActions');
                const res = await resetTestData();
                if (res.success) {
                  alert('System environment reset successfully. Dashboard refreshed.');
                  window.location.reload();
                } else {
                  alert('Error: ' + res.error);
                }
              } catch (err: any) {
                alert('Reset failed: ' + err.message);
              } finally {
                btn.disabled = false;
                btn.innerText = 'Reset Environment';
              }
            }}
            className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg border border-red-300 transition-colors shadow-sm"
          >
            Reset Environment
          </button>
        </div>
      )}
    </div>
  );
}
