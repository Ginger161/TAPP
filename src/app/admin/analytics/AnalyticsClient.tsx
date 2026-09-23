'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MultiYearSalesData, getMultiYearSalesData, getFinancialMetrics, exportFinancialReport, FinancialMetrics, DateRange } from './actions';
import { getAuditLogFeed, AuditLogEntry } from './auditActions';
import { formatDateTimeToDDMMYYYY } from '@/utils/dateFormatter';
import { Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

export type AnalyticsInitialData = {
  availableYears: string[];
  selectedYears: string[];
  financials: FinancialMetrics;
  multiYearSales: MultiYearSalesData[];
  multiYearYears: string[];
  stationName?: string;
  auditLog: AuditLogEntry[];
};

export default function AnalyticsClient({ 
  initialData, 
  stationId 
}: { 
  initialData: AnalyticsInitialData;
  stationId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'audit' | 'pnl' | 'leakage'>('audit');
  
  const [data, setData] = useState<MultiYearSalesData[]>(initialData.multiYearSales);
  const [years, setYears] = useState<string[]>(initialData.multiYearYears);
  const [stationName, setStationName] = useState<string>(initialData.stationName || 'All Stations (Global)');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(initialData.auditLog);
  const [isLoading, setIsLoading] = useState(false);

  // Financial P&L State
  const [timeframe, setTimeframe] = useState<DateRange>('30d');
  const [financials, setFinancials] = useState<FinancialMetrics | null>(initialData.financials);
  const [isExporting, setIsExporting] = useState(false);
  
  // Advanced Chart State
  const [availableYears, setAvailableYears] = useState<string[]>(initialData.availableYears);
  const [selectedYears, setSelectedYears] = useState<string[]>(initialData.selectedYears);
  const [chartMode, setChartMode] = useState<'overlay' | 'isolated'>('overlay');
  const [isYearsDropdownOpen, setIsYearsDropdownOpen] = useState(false);

  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    
    getFinancialMetrics(timeframe, stationId).then(setFinancials);
  }, [timeframe, stationId]);

  useEffect(() => {
    // Skip initial mount, data is already populated
    if (initialMount.current) return;
    
    if (selectedYears.length === 0) return;
    setIsLoading(true);
    Promise.all([
      getMultiYearSalesData(stationId, selectedYears),
      getAuditLogFeed(stationId).catch(() => [])
    ]).then(([res, auditRes]) => {
      setData(res.data);
      setYears(res.years);
      if (res.stationName) setStationName(res.stationName);
      setAuditLog(auditRes);
      setIsLoading(false);
    });
  }, [stationId, selectedYears]);

  if (isLoading && !data.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-tycoon-charcoal h-full">
        <p className="font-bold text-xl">Loading Analytics...</p>
      </div>
    );
  }
  
  const currentYear = years[0];

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-tycoon-charcoal mb-2">Analytics Hub</h1>
          <p className="text-gray-500 text-lg">{stationName}</p>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 gap-2 md:gap-6 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-2 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'audit' ? 'border-tycoon-red text-tycoon-red' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Audit & Event Log
          </button>
          <button 
            onClick={() => setActiveTab('pnl')}
            className={`py-3 px-2 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${activeTab === 'pnl' ? 'border-tycoon-red text-tycoon-red' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Financial P&L
          </button>
          <button 
            disabled
            className="py-3 px-2 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors border-transparent text-gray-400 cursor-not-allowed flex items-center gap-1 md:gap-2"
          >
            Leakage Detection <span className="bg-gray-200 text-gray-500 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider transform scale-90 md:scale-100 origin-left">Coming Soon</span>
          </button>
        </div>

        {/* Tab 1: Audit & Event Log */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-tycoon-charcoal">Chronological Event Feed</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {auditLog.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No recent events found.</div>
              ) : (
                auditLog.map((log) => (
                  <div key={log.id} className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${log.is_corrected ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-tycoon-charcoal">{log.actor}</span>
                        <span className="text-sm text-gray-500">{log.action_description}</span>
                        {log.is_corrected && (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            Corrected Entry
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        At <span className="font-bold text-tycoon-charcoal">{log.station_name}</span>
                        {log.product_name && <span> for product <span className="font-semibold">{log.product_name}</span></span>}
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end text-sm">
                      {log.amount && (
                        <div className="font-bold text-tycoon-charcoal text-lg">
                          {log.amount}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateTimeToDDMMYYYY(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Financial P&L */}
        {activeTab === 'pnl' && financials && (
          <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200 text-sm font-medium">
                {(['24h', '7d', '30d', 'YTD', 'All Time'] as DateRange[]).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 md:px-4 py-1.5 rounded-md transition-colors ${
                      timeframe === tf 
                        ? 'bg-white text-tycoon-charcoal shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <button 
                disabled={isExporting}
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    const { csv, filename } = await exportFinancialReport(timeframe, stationId);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch(e) {
                    alert('Export failed.');
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="flex items-center gap-2 bg-tycoon-red hover:bg-tycoon-red text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Report'}
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Gross Revenue</h3>
                <p className="text-2xl font-bold text-emerald-600">₦{financials.grossRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">COGS</h3>
                <p className="text-2xl font-bold text-orange-600">₦{financials.cogs.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Expenses</h3>
                <p className="text-2xl font-bold text-red-600">₦{financials.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <div className={`bg-white p-6 rounded-2xl shadow-sm border-2 ${financials.netProfit >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Net Operating Profit</h3>
                <p className={`text-2xl font-bold ${financials.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {financials.netProfit < 0 ? '-' : ''}₦{Math.abs(financials.netProfit).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Product Breakdown & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-tycoon-charcoal mb-4">Product Breakdown</h3>
                <div className="space-y-4">
                  {financials.productBreakdown.length === 0 ? (
                    <p className="text-gray-500 italic">No sales or supplies found for this period.</p>
                  ) : financials.productBreakdown.map(prod => (
                    <div key={prod.productId} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h4 className="font-bold text-tycoon-charcoal mb-2">{prod.productName}</h4>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-emerald-600">₦{prod.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">COGS:</span>
                        <span className="font-semibold text-orange-600">₦{prod.cogs.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                        <span className="font-bold text-gray-700">Margin:</span>
                        <span className="font-bold text-tycoon-charcoal">
                          ₦{(prod.revenue - prod.cogs).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-lg font-bold text-tycoon-charcoal">Historical Sales Volume (L)</h2>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
                      <button onClick={() => setChartMode('overlay')} className={`px-3 py-1 rounded-md transition-colors ${chartMode === 'overlay' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Overlay</button>
                      <button onClick={() => setChartMode('isolated')} className={`px-3 py-1 rounded-md transition-colors ${chartMode === 'isolated' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Isolated</button>
                    </div>

                    {/* Year Multi-Select */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsYearsDropdownOpen(!isYearsDropdownOpen)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white shadow-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50"
                      >
                        Years ({selectedYears.length})
                      </button>
                      {isYearsDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg rounded-xl p-2 z-10">
                          {availableYears.map(yr => (
                            <label key={yr} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={selectedYears.includes(yr)} 
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedYears(prev => [...prev, yr].sort().reverse());
                                  else setSelectedYears(prev => prev.filter(y => y !== yr));
                                }}
                                className="rounded border-gray-300 text-tycoon-charcoal focus:ring-tycoon-red"
                              />
                              <span className="text-sm font-medium text-gray-700">{yr}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  {selectedYears.length === 0 ? (
                    <div className="h-[400px] flex items-center justify-center text-gray-500">Please select at least one year.</div>
                  ) : chartMode === 'overlay' ? (
                    <div className="h-[400px] outline-none focus:outline-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
                      <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                        <LineChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} minTickGap={15} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} width={45} dx={-5} />
                          <Tooltip 
                            cursor={{ stroke: '#e5e7eb', strokeWidth: 2, strokeDasharray: '4 4' }} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', padding: '12px' }} 
                            labelStyle={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', fontSize: '14px' }} 
                            itemStyle={{ fontSize: '13px', padding: '2px 0', fontWeight: 500 }}
                            formatter={(value: any, name: any) => [(value as number).toLocaleString() + ' L', name]}
                          />
                          <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontWeight: 500, color: '#374151', fontSize: '13px', paddingBottom: '10px' }} />
                          {selectedYears.map((yr, idx) => {
                            const colors = ['#C8102E', '#1E3A8A', '#374151', '#059669', '#D97706', '#7C3AED'];
                            const color = colors[idx % colors.length];
                            return (
                              <Line key={yr} type="monotone" name={yr === currentYear ? `${yr} (Current)` : yr} dataKey={yr} stroke={color} strokeWidth={idx === 0 ? 3 : 2} dot={{ r: idx === 0 ? 4 : 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: idx === 0 ? 6 : 5, strokeWidth: 0 }} />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedYears.map((yr, idx) => {
                        const colors = ['#C8102E', '#1E3A8A', '#374151', '#059669', '#D97706', '#7C3AED'];
                        const color = colors[idx % colors.length];
                        return (
                          <div key={yr} className="h-[250px] bg-gray-50 rounded-xl p-4 border border-gray-100 outline-none focus:outline-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
                            <h4 className="font-bold text-gray-700 mb-2">{yr}</h4>
                            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} minTickGap={15} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} width={35} dx={-5} />
                                <Tooltip cursor={{ stroke: '#e5e7eb', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }} formatter={(value: any) => [(value as number).toLocaleString() + ' L', yr]} />
                                <Line type="monotone" name={yr} dataKey={yr} stroke={color} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
