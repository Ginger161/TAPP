import React from 'react';

export default function ViewerDashboardLoading() {
  return (
    <div className="flex flex-col flex-1 bg-gray-50 text-tycoon-charcoal overflow-hidden animate-pulse">
      {/* Top KPI Ribbon */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-8 text-sm">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-5 rounded-xl border border-gray-200 bg-white h-48">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
