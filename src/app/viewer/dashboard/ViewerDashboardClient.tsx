'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getViewerDashboardData, dispatchSupply, getStationDeepDive, getStationHistoricalSales, MapStation, Timeframe } from './actions';
import UrgencyBadge from '@/components/UrgencyBadge';
import SalesChart, { SalesData } from '@/components/SalesChart';
import Link from 'next/link';

export type DashboardData = {
  kpi: { volume: number, revenue: number, pendingVolume: number };
  mapStations: MapStation[];
  isViewer: boolean;
  canSupply: boolean;
  pendingSuppliesList?: {
    id: string;
    stationName: string;
    productName: string;
    quantity: number;
    costPrice: number;
    date: string;
  }[];
};

type DeepDiveData = {
  salesTrend: SalesData[];
  stockList: { id: string; name: string, quantity: number }[];
};

export default function ViewerDashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Global Dispatch Supply Modal State
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [supplyData, setSupplyData] = useState({ stationId: '', productId: '', quantity: '', costPrice: '', supplier: '' });
  const [isSubmittingSupply, setIsSubmittingSupply] = useState(false);
  const [supplyMessage, setSupplyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (selectedStationId) {
      // Reset timeframe when opening a new station
      setTimeframe('7D');
      setIsSupplyModalOpen(false);
      setSupplyMessage(null);
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
    if (!supplyData.stationId || !supplyData.productId) return;
    setIsSubmittingSupply(true);
    setSupplyMessage(null);
    
    const formData = new FormData();
    formData.append('stationId', supplyData.stationId);
    formData.append('productId', supplyData.productId);
    formData.append('quantity', supplyData.quantity);
    formData.append('costPrice', supplyData.costPrice);
    formData.append('supplier', supplyData.supplier);

    const res = await dispatchSupply(formData);
    setIsSubmittingSupply(false);
    if (res.error) {
      setSupplyMessage({ type: 'error', text: res.error });
    } else {
      setSupplyMessage({ type: 'success', text: 'Supply dispatched successfully!' });
      // Reload dashboard data
      getViewerDashboardData().then(setData as any);
      setTimeout(() => {
        setIsSupplyModalOpen(false);
        setSupplyMessage(null);
        setSupplyData({ stationId: '', productId: '', quantity: '', costPrice: '', supplier: '' });
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
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-tycoon-charcoal flex items-center">
            <span className="w-1.5 h-6 bg-red-600 rounded mr-2 inline-block"></span>
            Station Overview
          </h2>
          {data.canSupply && (
            <button 
              onClick={() => setIsSupplyModalOpen(true)} 
              className="bg-tycoon-red hover:bg-red-800 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Dispatch Supply
            </button>
          )}
        </div>
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
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg text-tycoon-navy">{station.name}</span>
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
                          prod.status === 'Yellow' ? 'bg-transparent' : 'bg-green-500'
                        }`} />
                        <span className="text-gray-600 font-medium">{prod.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-base block">{prod.stock.toLocaleString()} L</span>
                        <span className="text-xs text-gray-400">
                          {prod.stock === 0 ? 'Empty' : `Est. ${prod.daysRemaining === Infinity ? '∞' : prod.daysRemaining.toFixed(1)} days`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-gray-100">
                <Link 
                  href={`/viewer/stations/${station.id}`}
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

                  <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                    <Link href={`/admin/analytics?station_id=${selectedStation.id}`}>
                      <button className="w-full bg-white hover:bg-gray-50 text-tycoon-navy border border-gray-200 font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                        View Full Analytics
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Supply Modal Overlay */}
      {isSupplyModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-tycoon-navy">Dispatch Supply</h3>
              <button onClick={() => {
                setIsSupplyModalOpen(false);
                setSupplyMessage(null);
              }} className="text-gray-400 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="p-5">
              {supplyMessage && (
                <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${supplyMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {supplyMessage.text}
                </div>
              )}

              <form onSubmit={handleSupplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Station</label>
                  <select required className="w-full p-2 border border-gray-200 rounded-lg outline-none" value={supplyData.stationId} onChange={(e) => setSupplyData({...supplyData, stationId: e.target.value, productId: ''})}>
                    <option value="">Select a station...</option>
                    {data.mapStations.map(station => (
                      <option key={station.id} value={station.id}>{station.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Product</label>
                  <select required className="w-full p-2 border border-gray-200 rounded-lg outline-none" value={supplyData.productId} onChange={(e) => setSupplyData({...supplyData, productId: e.target.value})} disabled={!supplyData.stationId}>
                    <option value="">Select a product...</option>
                    {supplyData.stationId && data.mapStations.find(s => s.id === supplyData.stationId)?.products?.map(prod => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
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
          </div>
        </div>
      )}

    </div>
  );
}
