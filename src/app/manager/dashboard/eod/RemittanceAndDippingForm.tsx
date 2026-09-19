'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

type ProductData = {
  product_id: string;
  product_name: string;
};

type DippingState = {
  id: string;
  tank_id: string;
  product_id: string;
  product_name: string;
  dipped_volume: string;
};

export default function RemittanceAndDippingForm({
  uniqueProducts,
  totalGrossRevenue,
  totalExpenses,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  uniqueProducts: ProductData[];
  totalGrossRevenue: number;
  totalExpenses: number;
  onBack: () => void;
  onSubmit: (data: { 
    posToAccount: number; 
    cashToBank: number; 
    balanceDue: number; 
    dippings: { tank_id: string; product_id: string; dipped_volume: number }[] 
  }) => void;
  isSubmitting: boolean;
}) {
  const expectedCashBank = totalGrossRevenue - totalExpenses;
  const [posToAccount, setPosToAccount] = useState<string>('');
  const [cashToBank, setCashToBank] = useState<string>('');
  
  const [dippings, setDippings] = useState<DippingState[]>(
    uniqueProducts.map((p, i) => ({
      id: `dip-${i}`,
      tank_id: `${p.product_name} Tank`,
      product_id: p.product_id,
      product_name: p.product_name,
      dipped_volume: '',
    }))
  );

  const parsedPos = parseFloat(posToAccount) || 0;
  const parsedCash = parseFloat(cashToBank) || 0;
  const balanceDue = expectedCashBank - (parsedPos + parsedCash);

  const updateDipping = (id: string, field: keyof DippingState, value: string) => {
    setDippings((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      posToAccount: parsedPos,
      cashToBank: parsedCash,
      balanceDue,
      dippings: dippings.map(d => ({
        tank_id: d.tank_id,
        product_id: d.product_id,
        dipped_volume: parseFloat(d.dipped_volume) || 0
      }))
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Tank Dipping Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-tycoon-navy mb-4 border-b pb-2">Physical Tank Dipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dippings.map((dip) => (
            <div key={dip.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={dip.tank_id}
                  onChange={(e) => updateDipping(dip.id, 'tank_id', e.target.value)}
                  className="font-bold text-tycoon-navy bg-transparent border-b border-transparent hover:border-gray-300 focus:border-tycoon-navy focus:outline-none"
                  placeholder="Tank Name"
                />
                <span className="text-xs bg-tycoon-navy text-white px-2 py-1 rounded">
                  {dip.product_name}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Closing Volume (Liters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={dip.dipped_volume}
                  onChange={(e) => updateDipping(dip.id, 'dipped_volume', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tycoon-navy focus:border-transparent text-right"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Remittance Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-tycoon-navy mb-4 border-b pb-2">Remittance (The Cash Check)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <span className="text-xs font-semibold text-gray-500 uppercase">Gross Revenue</span>
            <div className="text-lg font-bold text-tycoon-charcoal mt-1">
              ₦{totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Expenses</span>
            <div className="text-lg font-bold text-tycoon-charcoal mt-1">
              ₦{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <span className="text-xs font-semibold text-blue-800 uppercase">Expected Cash/Bank</span>
            <div className="text-xl font-bold text-tycoon-navy mt-1">
              ₦{expectedCashBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase mb-2">POS to Account (₦)</label>
            <input
              type="number"
              step="0.01"
              value={posToAccount}
              onChange={(e) => setPosToAccount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tycoon-navy focus:border-transparent text-lg"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 uppercase mb-2">Cash to Bank (₦)</label>
            <input
              type="number"
              step="0.01"
              value={cashToBank}
              onChange={(e) => setCashToBank(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tycoon-navy focus:border-transparent text-lg"
              placeholder="0.00"
              required
            />
          </div>
        </div>
        
        {/* Real-time Balance Math */}
        <div className={`p-6 rounded-xl border flex flex-col md:flex-row justify-between items-center ${
          balanceDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <div>
            <span className={`text-sm font-semibold uppercase ${balanceDue > 0 ? 'text-red-700' : 'text-green-800'}`}>
              Manager Balance Due to H.O.
            </span>
            <p className="text-xs mt-1 text-gray-500">
              {balanceDue > 0 ? 'You must bring this exact cash amount to the Head Office.' : 'Account is balanced.'}
            </p>
          </div>
          <div className={`text-3xl font-black mt-2 md:mt-0 ${balanceDue > 0 ? 'text-red-600' : 'text-green-700'}`}>
            ₦{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-tycoon-red hover:bg-red-700 text-white font-bold rounded-lg transition-colors w-full sm:w-auto shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={20} />
          {isSubmitting ? 'Submitting EOD...' : 'Submit EOD Log'}
        </button>
      </div>
    </form>
  );
}
