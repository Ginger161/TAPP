import React from 'react';

export default function AnalyticsLoading() {
  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-5 bg-gray-100 rounded w-32"></div>
        </header>

        {/* Tabs Skeleton */}
        <div className="flex border-b border-gray-200 gap-2 md:gap-6">
          <div className="py-3 px-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="py-3 px-2">
            <div className="h-4 bg-gray-100 rounded w-20"></div>
          </div>
          <div className="py-3 px-2">
            <div className="h-4 bg-gray-100 rounded w-32"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
