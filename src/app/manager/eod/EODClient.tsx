'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitLegacyEOD } from './actions';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar, FileText, Droplet, Wallet, TrendingUp } from 'lucide-react';
import { catchNetworkError } from '@/utils/network';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parseISOToDate } from '@/utils/dateFormatter';

export type Product = {
  id: string;
  name: string;
};

type Batch = {
  startMeter: string;
  closeMeter: string;
  volume: string;
  pricePerLiter: string;
};

type ProductState = {
  productId: string;
  batches: Batch[];
  dipVolume: string;
};

type ExpenseState = {
  type: string;
  amount: string;
  description: string;
};

const EXPENSE_CATEGORIES = [
  'Solar remittance',
  'POS charges',
  'Fuel to Generator',
  'Data Subscription',
  'Others'
];

function getLocalWATDateString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wat = new Date(utc + (3600000 * 1));
  return wat.toISOString().split('T')[0];
}

export default function EODClient({ products }: { products: Product[] }) {
  const router = useRouter();
  
  const [reportDate, setReportDate] = useState(getLocalWATDateString());
  
  const [productData, setProductData] = useState<Record<string, ProductState>>(
    products.reduce((acc, p) => ({
      ...acc,
      [p.id]: {
        productId: p.id,
        batches: [{ startMeter: '', closeMeter: '', volume: '', pricePerLiter: '' }],
        dipVolume: ''
      }
    }), {})
  );

  const [expenses, setExpenses] = useState<ExpenseState[]>(
    EXPENSE_CATEGORIES.map(cat => ({
      type: cat,
      amount: '',
      description: ''
    }))
  );

  const [posAmount, setPosAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBatchChange = (productId: string, batchIndex: number, field: keyof Batch, value: string) => {
    setProductData(prev => {
      const prod = prev[productId];
      const newBatches = [...prod.batches];
      newBatches[batchIndex] = { ...newBatches[batchIndex], [field]: value };
      return { ...prev, [productId]: { ...prod, batches: newBatches } };
    });
  };

  const addBatch = (productId: string) => {
    setProductData(prev => {
      const prod = prev[productId];
      return {
        ...prev,
        [productId]: {
          ...prod,
          batches: [...prod.batches, { startMeter: '', closeMeter: '', volume: '', pricePerLiter: '' }]
        }
      };
    });
  };

  const removeBatch = (productId: string, batchIndex: number) => {
    setProductData(prev => {
      const prod = prev[productId];
      const newBatches = prod.batches.filter((_, i) => i !== batchIndex);
      return { ...prev, [productId]: { ...prod, batches: newBatches } };
    });
  };

  const handleDipChange = (productId: string, value: string) => {
    setProductData(prev => ({
      ...prev,
      [productId]: { ...prev[productId], dipVolume: value }
    }));
  };

  const handleExpenseChange = (index: number, field: keyof ExpenseState, value: string) => {
    setExpenses(prev => {
      const newExp = [...prev];
      newExp[index] = { ...newExp[index], [field]: value };
      return newExp;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    for (const p of products) {
      const pData = productData[p.id];
      if (!pData.dipVolume || pData.dipVolume.trim() === '') {
        toast.error(`Please enter the Closing Volume (Tank Dip) for ${p.name}.`);
        setIsSubmitting(false);
        return;
      }
    }

    const payloadProducts = products.map(p => {
      const pData = productData[p.id];
      const validBatches = pData.batches
        .filter(b => b.volume && Number(b.volume) > 0 && b.pricePerLiter && Number(b.pricePerLiter) > 0)
        .map(b => ({
          startMeter: b.startMeter ? Number(b.startMeter) : undefined,
          closeMeter: b.closeMeter ? Number(b.closeMeter) : undefined,
          volume: Number(b.volume),
          pricePerLiter: Number(b.pricePerLiter)
        }));

      return {
        productId: p.id,
        dipVolume: Number(pData.dipVolume) || 0,
        batches: validBatches
      };
    });

    const payloadExpenses = expenses.map(exp => ({
      type: exp.type,
      amount: Number(exp.amount) || 0,
      description: exp.description
    }));

    // No longer throwing error for completely empty payload because Tank Dips are mandatory, 
    // so payloadProducts will always exist and have dipVolumes.

    const payload = {
      date: reportDate,
      products: payloadProducts,
      expenses: payloadExpenses,
      pos: Number(posAmount) || 0,
      cash: Number(cashAmount) || 0
    };

    const result = await catchNetworkError(submitLegacyEOD(payload));
    setIsSubmitting(false);

    if (result && !result.error) {
      toast.success('EOD Log submitted successfully!');
      router.push('/manager/dashboard');
    } else if (result && result.error) {
      toast.error(result.error);
    }
  };

  // Compute running totals for UI
  const totalSales = products.reduce((acc, p) => {
    const pData = productData[p.id];
    const pTotal = pData.batches.reduce((bAcc, b) => {
      const vol = Number(b.volume) || 0;
      const price = Number(b.pricePerLiter) || 0;
      return bAcc + (vol * price);
    }, 0);
    return acc + pTotal;
  }, 0);

  const totalExpenses = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 pb-16">
      
      {/* Date Picker */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-tycoon-navy rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Report Date</h2>
            <p className="text-xs text-gray-500">Select the date for this EOD report</p>
          </div>
        </div>
        <DatePicker
          selected={parseISOToDate(reportDate)}
          onChange={(date: Date | null) => {
            if (date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              setReportDate(`${year}-${month}-${day}`);
            }
          }}
          dateFormat="dd/MM/yyyy"
          className="px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-tycoon-navy w-full text-center"
          maxDate={new Date()}
          required
        />
      </div>

      {/* Sales & Tank Dips per Product */}
      <div className="space-y-8">
        {products.map(product => {
          const pData = productData[product.id];
          return (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
                <TrendingUp className="text-emerald-600" size={24} />
                <h3 className="font-bold text-lg text-tycoon-charcoal">{product.name}</h3>
              </div>
              
              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2">Sales Transactions</h4>
                  
                  <div className="space-y-4">
                    {pData.batches.map((batch, idx) => (
                      <div key={idx} className="relative p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                        {pData.batches.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeBatch(product.id, idx)}
                            className="absolute -top-3 -right-3 bg-white p-1.5 rounded-full border border-gray-200 text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Meter (Opt)</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={batch.startMeter}
                              onChange={(e) => handleBatchChange(product.id, idx, 'startMeter', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Close Meter (Opt)</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={batch.closeMeter}
                              onChange={(e) => handleBatchChange(product.id, idx, 'closeMeter', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Volume (L) *</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={batch.volume}
                              onChange={(e) => handleBatchChange(product.id, idx, 'volume', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                              placeholder="Liters"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price (₦/L) *</label>
                            <input 
                              type="number"
                              step="0.01"
                              value={batch.pricePerLiter}
                              onChange={(e) => handleBatchChange(product.id, idx, 'pricePerLiter', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                              placeholder="Price"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    onClick={() => addBatch(product.id)}
                    className="mt-4 flex items-center gap-2 text-sm font-bold text-tycoon-navy hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg"
                  >
                    <Plus size={16} /> Add Another Batch
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <Droplet className="text-blue-500" size={16} />
                    Physical Tank Dip
                  </h4>
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">CLOSING VOLUME (L)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={pData.dipVolume}
                      onChange={(e) => handleDipChange(product.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-tycoon-navy bg-gray-50"
                      placeholder="Total liters in tank"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Expenses */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
          <Wallet className="text-red-600" size={24} />
          <h3 className="font-bold text-lg text-tycoon-charcoal">Daily Expenses</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {expenses.map((exp, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 items-center">
              <div className="md:col-span-4">
                <span className="font-bold text-gray-700 block">{exp.type}</span>
              </div>
              <div className="md:col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={exp.amount}
                    onChange={(e) => handleExpenseChange(idx, 'amount', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                    placeholder="Amount"
                  />
                </div>
              </div>
              <div className="md:col-span-5">
                <input 
                  type="text"
                  value={exp.description}
                  onChange={(e) => handleExpenseChange(idx, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-tycoon-navy"
                  placeholder="Comments (Optional)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Remittance & Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="text-tycoon-navy" size={24} />
            <h3 className="font-bold text-lg text-tycoon-charcoal">Daily Remittance</h3>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">POS to Account (₦)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                <input 
                  type="number"
                  step="0.01"
                  value={posAmount}
                  onChange={(e) => setPosAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Cash to Bank (₦)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                <input 
                  type="number"
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-tycoon-navy"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          {/* Running Totals Summary */}
          <div className="mt-6 p-5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block">Total Sales</span>
              <span className="text-xl font-black text-emerald-600">
                ₦{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-center md:text-left">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider block">Total Expenses</span>
              <span className="text-xl font-black text-red-600">
                ₦{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-tycoon-red hover:bg-red-800 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
      >
        <FileText size={24} />
        {isSubmitting ? 'Submitting...' : 'Submit End of Day Log'}
      </button>

    </form>
  );
}
