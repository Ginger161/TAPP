'use client';

import React, { useState } from 'react';
import { formatDateTimeToDDMMYYYY } from '@/utils/dateFormatter';
import { GlobalFinancialLog } from './actions';
import { AuditLogEntry } from '../analytics/auditActions';
import CustomDropdown from '@/components/CustomDropdown';

export default function GlobalAnalyticsClient({
  financialLogs,
  auditLogs
}: {
  financialLogs: GlobalFinancialLog[];
  auditLogs: AuditLogEntry[];
}) {
  const [activeTab, setActiveTab] = useState<'financial' | 'audit'>('financial');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredFinancialLogs = financialLogs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (searchTerm && !log.stationName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    if (searchTerm && !log.station_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-tycoon-navy">Master Ledger</h1>
          <p className="text-gray-500 mt-1">Global view of all system actions and financial records.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[600px]">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${activeTab === 'financial' ? 'bg-white text-tycoon-navy border-b-2 border-tycoon-red' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            Global Financial Logs
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${activeTab === 'audit' ? 'bg-white text-tycoon-navy border-b-2 border-tycoon-red' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
          >
            Master Audit Trail
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-white">
          <input
            type="text"
            placeholder="Search by station..."
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-tycoon-navy w-full sm:max-w-xs text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {activeTab === 'financial' && (
            <div className="w-full sm:w-48">
              <CustomDropdown
                value={filterType}
                onChange={(val) => setFilterType(val)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'sale', label: 'Sales Only' },
                  { value: 'expense', label: 'Expenses Only' }
                ]}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          {activeTab === 'financial' ? (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Station</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredFinancialLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-gray-500 whitespace-nowrap">
                      {formatDateTimeToDDMMYYYY(log.timestamp)}
                    </td>
                    <td className="p-4 font-bold text-tycoon-navy whitespace-nowrap">{log.stationName}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${log.type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">{log.detail}</td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-tycoon-charcoal">
                          {log.type === 'sale' ? `₦${log.amount.toLocaleString()}` : `₦${log.amount.toLocaleString()}`}
                        </span>
                        {log.is_edited && (
                          <span className="text-xs text-tycoon-red font-semibold bg-red-50 px-1.5 py-0.5 rounded mt-1">
                            EDITED
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFinancialLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No financial logs found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAuditLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50/50 transition-colors flex gap-4">
                  <div className="shrink-0 pt-1">
                    <div className="w-2 h-2 rounded-full bg-tycoon-navy mt-1.5"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-800">
                      <span className="font-bold text-tycoon-navy">{log.actor}</span>
                      <span>{log.action_description}</span>
                      {log.amount && <span className="font-bold">({log.amount})</span>}
                      {log.product_name && <span>for {log.product_name}</span>}
                      <span>at</span>
                      <span className="font-semibold text-tycoon-charcoal">{log.station_name}</span>
                    </div>
                    {log.is_corrected && (
                      <span className="inline-block mt-1 text-xs font-bold text-tycoon-red bg-red-100 px-2 py-0.5 rounded border border-red-200">
                        CORRECTED ENTRY
                      </span>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDateTimeToDDMMYYYY(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAuditLogs.length === 0 && (
                <div className="p-8 text-center text-gray-500">No audit logs found matching your criteria.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
