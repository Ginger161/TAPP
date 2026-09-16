import React from 'react';
import { Truck } from 'lucide-react';

export default function ManagerDashboardLoading() {
  return (
    <div className="w-full relative animate-pulse">
      {/* Alert Skeleton */}
      <div className="p-4 bg-gray-200 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-2">
          <Truck size={20} className="text-gray-400" />
          <div className="h-4 bg-gray-300 rounded w-48"></div>
        </div>
        <div className="h-6 bg-gray-300 rounded w-16"></div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Status Hero Skeleton */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-lg shadow-sm border-l-4 border-gray-200 bg-white flex justify-between items-center">
                <div>
                  <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-32"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 bg-gray-200 rounded w-20 mb-2 ml-auto"></div>
                  <div className="h-5 bg-gray-100 rounded w-16 ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Ledger Skeleton */}
        <section>
          <div className="h-6 bg-gray-200 rounded w-40 mb-3"></div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 h-[300px] flex items-center justify-center">
             <div className="h-full w-full bg-gray-50 rounded"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[250px]">
              <div className="p-3 bg-gray-50 border-b border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[250px]">
              <div className="p-3 bg-gray-50 border-b border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-100 rounded w-32"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
