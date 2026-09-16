import React from 'react';
import { PackageSearch } from 'lucide-react';

export default function SuppliesLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-tycoon-charcoal flex items-center gap-3">
            <PackageSearch className="w-6 h-6 text-gray-300" />
            Supply Log
          </h1>
          <div className="h-4 bg-gray-200 rounded w-64 mt-2"></div>
        </div>

        <div className="space-y-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          {[1, 2].map(i => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-32"></div>
          ))}
          
          <div className="h-6 bg-gray-200 rounded w-48 mt-8 mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-20"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
