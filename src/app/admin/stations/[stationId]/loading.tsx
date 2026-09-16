import React from 'react';

export default function AdminStationLoading() {
  return (
    <div className="w-full relative p-4 space-y-6 flex-1 animate-pulse">
      {/* Status Hero Skeleton */}
      <section>
        <div className="h-6 bg-gray-200 rounded w-64 mb-3"></div>
        <div className="grid gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-4 rounded-lg shadow-sm border-l-4 bg-white border-gray-200 h-24"></div>
          ))}
        </div>
      </section>

      {/* Financial Overview Skeleton */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-24"></div>
          ))}
        </div>
      </section>

      {/* Activity Ledger Skeleton */}
      <section>
        <div className="h-6 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 h-64"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-96"></div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-96"></div>
        </div>
      </section>
    </div>
  );
}
