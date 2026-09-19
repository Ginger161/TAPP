'use client';

import React, { useState } from 'react';
import { FileText, Eye, X, Droplet, Fuel, Wallet, TrendingUp } from 'lucide-react';
import { getEODDetails } from './actions';
import toast from 'react-hot-toast';
import { catchNetworkError } from '@/utils/network';

export type EODHistoryItem = {
  id: string;
  date: string;
  gross_revenue: number;
  total_expenses: number;
  balance_due: number;
  status: string;
};

export default function EODHistoryClient({ initialHistory }: { initialHistory: EODHistoryItem[] }) {
  const [history] = useState<EODHistoryItem[]>(initialHistory);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handleViewDetails = async (date: string) => {
    setSelectedDate(date);
    setIsLoadingDetails(true);
    const data = await catchNetworkError(getEODDetails(date));
    if (data && !('error' in data)) {
      setDetails(data);
    } else {
      toast.error('Failed to load EOD details');
      setSelectedDate(null);
    }
    setIsLoadingDetails(false);
  };

  const closeModal = () => {
    setSelectedDate(null);
    setDetails(null);
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Gross Revenue</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Expenses</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                    No historical EOD submissions found.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-tycoon-navy rounded-lg">
                          <FileText size={18} />
                        </div>
                        <span className="font-bold text-tycoon-charcoal">
                          {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(record.date))}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-tycoon-navy">
                      ₦{Number(record.gross_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-bold text-red-600">
                      ₦{Number(record.total_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-full inline-flex items-center gap-1 border border-emerald-200">
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleViewDetails(record.date)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-tycoon-navy hover:text-tycoon-navy rounded-lg text-sm font-semibold text-gray-600 transition-colors shadow-sm"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl w-full max-w-4xl shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-2xl flex justify-between items-center z-10">
              <div>
                <h3 className="font-bold text-xl text-tycoon-charcoal flex items-center gap-2">
                  <FileText className="text-tycoon-navy" size={24} />
                  EOD Report Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted for: {new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'Africa/Lagos' }).format(new Date(selectedDate))}
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {isLoadingDetails || !details ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tycoon-navy"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    
                    {/* Pump Logs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-2">
                        <Fuel className="text-tycoon-navy" size={18} />
                        <h4 className="font-bold text-sm text-tycoon-charcoal uppercase tracking-wider">Pump Logs</h4>
                      </div>
                      <div className="p-4">
                        {details.pumps.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center">No pump data.</p>
                        ) : (
                          <div className="space-y-4">
                            {details.pumps.map((pump: any) => (
                              <div key={pump.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-sm text-tycoon-navy">{pump.pump_id}</span>
                                  <span className="text-xs font-semibold px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">
                                    {(pump.products as any)?.name}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-white p-2 border border-gray-100 rounded">
                                    <span className="text-gray-500 block mb-1">Opening</span>
                                    <span className="font-bold">{pump.opening_meter}</span>
                                  </div>
                                  <div className="bg-white p-2 border border-gray-100 rounded">
                                    <span className="text-gray-500 block mb-1">Closing</span>
                                    <span className="font-bold">{pump.closing_meter}</span>
                                  </div>
                                  <div className="bg-white p-2 border border-gray-100 rounded col-span-2 flex justify-between">
                                    <span className="text-gray-500">Net Volume (Less RTT)</span>
                                    <span className="font-bold text-emerald-600">{pump.net_volume} L</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tank Dippings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-2">
                        <Droplet className="text-blue-500" size={18} />
                        <h4 className="font-bold text-sm text-tycoon-charcoal uppercase tracking-wider">Tank Dippings</h4>
                      </div>
                      <div className="p-4">
                         {details.dippings.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center">No dipping data.</p>
                        ) : (
                          <div className="space-y-3">
                            {details.dippings.map((dip: any) => (
                              <div key={dip.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                                <div>
                                  <span className="font-bold text-sm text-gray-800 block">{dip.tank_id}</span>
                                  <span className="text-xs text-gray-500">{(dip.products as any)?.name}</span>
                                </div>
                                <div className="font-bold text-tycoon-navy">{dip.dipped_volume} L</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    
                    {/* Sales Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex items-center gap-2">
                        <TrendingUp className="text-emerald-600" size={18} />
                        <h4 className="font-bold text-sm text-emerald-800 uppercase tracking-wider">Sales Summary</h4>
                      </div>
                      <div className="p-4">
                        {details.sales.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center">No sales data.</p>
                        ) : (
                          <div className="space-y-4">
                            {details.sales.map((sale: any) => (
                              <div key={sale.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-bold text-sm text-gray-800">{(sale.products as any)?.name}</span>
                                  <span className="font-bold text-sm text-emerald-600">
                                    ₦{Number(sale.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="text-xs space-y-2">
                                  <div className="flex justify-between text-gray-600">
                                    <span>Total Volume</span>
                                    <span className="font-semibold">{sale.quantity_sold} L</span>
                                  </div>
                                  {sale.price_tiers && sale.price_tiers.length > 0 && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <span className="text-gray-500 mb-1 block">Tiers:</span>
                                      {sale.price_tiers.map((tier: any, i: number) => (
                                        <div key={i} className="flex justify-between text-gray-700">
                                          <span>{tier.volume} L @ ₦{tier.price}/L</span>
                                          <span>₦{(tier.volume * tier.price).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2">
                        <Wallet className="text-red-600" size={18} />
                        <h4 className="font-bold text-sm text-red-800 uppercase tracking-wider">Expenses</h4>
                      </div>
                      <div className="p-4">
                        {details.expenses.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center">No expenses recorded.</p>
                        ) : (
                          <div className="space-y-3">
                            {details.expenses.map((exp: any) => (
                              <div key={exp.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-sm text-gray-800 block">{exp.expense_type}</span>
                                  {exp.description && <span className="text-xs text-gray-500">{exp.description}</span>}
                                </div>
                                <div className="font-bold text-red-600">
                                  ₦{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remittance Bottom Line */}
                    {details.remittance && (
                      <div className="bg-tycoon-navy text-white rounded-xl shadow-md p-5 flex flex-col gap-3">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-blue-200 border-b border-blue-800 pb-2">Remittance Summary</h4>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-100">Expected Cash</span>
                          <span className="font-semibold">
                            ₦{(Number(details.remittance.gross_revenue) - Number(details.remittance.total_expenses)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-100">POS to Account</span>
                          <span className="font-semibold text-emerald-400">
                            - ₦{Number(details.remittance.pos_to_account).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-100">Cash to Bank</span>
                          <span className="font-semibold text-emerald-400">
                            - ₦{Number(details.remittance.cash_to_bank).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-blue-800 flex justify-between items-center mt-1">
                          <span className="font-bold text-blue-100 uppercase tracking-widest text-xs">Balance Due</span>
                          <span className={`font-black text-xl ${Number(details.remittance.balance_due) > 0 ? 'text-red-400' : 'text-white'}`}>
                            ₦{Number(details.remittance.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
