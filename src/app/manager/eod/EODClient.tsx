'use client'

import { useState } from 'react'
import { submitEODLog, EODPayload } from './actions'
import { CheckCircle2, AlertCircle, Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'

function getLocalWATDateString() {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const wat = new Date(utc + (3600000 * 1))
  return wat.toISOString().split('T')[0]
}

type Batch = { 
  id: string; 
  startMeter: string;
  closeMeter: string;
  volume: string; 
  pricePerLiter: string;
};

type ProductSales = {
  productId: string;
  productName: string;
  batches: Batch[];
  dipVolume: string;
};

type ExpenseItem = {
  type: string;
  amount: string;
  description: string;
};

const EXPENSE_CATEGORIES = [
  'Solar remittance',
  'POS charges',
  'Fuel to Generator',
  'Repairs and maintenance',
  'Transport',
  'Data Subscription',
  'Others'
];

export default function EODClient({ products }: { products: { id: string, name: string }[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState(getLocalWATDateString())

  // Section A & B state
  const [productData, setProductData] = useState<ProductSales[]>(
    products.map(p => ({
      productId: p.id,
      productName: p.name,
      batches: [{ id: Date.now().toString() + Math.random().toString(), startMeter: '', closeMeter: '', volume: '', pricePerLiter: '' }],
      dipVolume: ''
    }))
  )

  // Section C state
  const [expenses, setExpenses] = useState<ExpenseItem[]>(
    EXPENSE_CATEGORIES.map(cat => ({ type: cat, amount: '', description: '' }))
  )

  const addBatch = (productId: string) => {
    setProductData(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          batches: [...p.batches, { id: Date.now().toString() + Math.random().toString(), startMeter: '', closeMeter: '', volume: '', pricePerLiter: '' }]
        };
      }
      return p;
    }));
  };

  const removeBatch = (productId: string, batchId: string) => {
    setProductData(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          batches: p.batches.filter(b => b.id !== batchId)
        };
      }
      return p;
    }));
  };

  const updateBatch = (productId: string, batchId: string, field: keyof Batch, value: string) => {
    setProductData(prev => prev.map(p => {
      if (p.productId === productId) {
        const newBatches = p.batches.map(b => {
          if (b.id === batchId) {
            const updated = { ...b, [field]: value };
            // Auto-calculate volume if meters are entered
            if ((field === 'startMeter' || field === 'closeMeter') && updated.startMeter && updated.closeMeter) {
              const start = parseFloat(updated.startMeter);
              const close = parseFloat(updated.closeMeter);
              if (!isNaN(start) && !isNaN(close) && close >= start) {
                updated.volume = (close - start).toString();
              }
            }
            return updated;
          }
          return b;
        });
        return { ...p, batches: newBatches };
      }
      return p;
    }));
  };

  const updateDip = (productId: string, value: string) => {
    setProductData(prev => prev.map(p => p.productId === productId ? { ...p, dipVolume: value } : p));
  }

  const updateExpense = (index: number, field: keyof ExpenseItem, value: string) => {
    setExpenses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  async function handleEODSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload: EODPayload = {
      date,
      products: productData.map(p => ({
        productId: p.productId,
        dipVolume: p.dipVolume ? parseFloat(p.dipVolume) : undefined,
        batches: p.batches.map(b => ({
          startMeter: b.startMeter ? parseFloat(b.startMeter) : undefined,
          closeMeter: b.closeMeter ? parseFloat(b.closeMeter) : undefined,
          volume: parseFloat(b.volume) || 0,
          pricePerLiter: parseFloat(b.pricePerLiter) || 0
        })).filter(b => b.volume > 0 && b.pricePerLiter > 0)
      })),
      expenses: expenses.map(ex => ({
        type: ex.type,
        amount: parseFloat(ex.amount) || 0,
        description: ex.description
      })).filter(ex => ex.amount > 0)
    };

    const hasAnySalesData = payload.products.some(p => p.batches.length > 0);
    const hasAnyDipData = payload.products.some(p => p.dipVolume !== undefined);
    
    if (!hasAnySalesData && !hasAnyDipData) {
      toast.error('Please enter at least some sales or dip data before submitting.');
      setIsSubmitting(false);
      return;
    }

    const result = await catchNetworkError(submitEODLog(payload))
    setIsSubmitting(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('End of Day Log submitted successfully!')
      // Reset form
      setProductData(products.map(p => ({
        productId: p.id,
        productName: p.name,
        batches: [{ id: Date.now().toString() + Math.random().toString(), startMeter: '', closeMeter: '', volume: '', pricePerLiter: '' }],
        dipVolume: ''
      })));
      setExpenses(EXPENSE_CATEGORIES.map(cat => ({ type: cat, amount: '', description: '' })));
    }
  }

  return (
    <div className="space-y-6">
      <form id="eod-form" onSubmit={handleEODSubmit} className="space-y-8">
        
        {/* Global Date Input */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="space-y-1.5 max-w-sm">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="date">
              Report Date
            </label>
            <input 
              required 
              id="date" 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors outline-none"
            />
          </div>
        </div>

        {/* Section A & B Combined per Product */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-tycoon-charcoal dark:text-white">Section A & B: Sales and Tank Dips</h2>
            <p className="text-sm text-gray-500 mt-1">Record pump meter readings, volumes sold, and closing physical tank dips.</p>
          </div>
          
          <div className="space-y-8">
            {productData.map((product) => (
              <div key={product.productId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-tycoon-charcoal dark:text-white text-lg">{product.productName}</h3>
                </div>
                
                <div className="p-4 space-y-6">
                  {/* Sales Batches */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sales Transactions</h4>
                    {product.batches.map((batch, index) => (
                      <div key={batch.id} className="flex flex-col lg:flex-row gap-3 items-end bg-gray-50/50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 relative group">
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full flex-1">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Meter</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="Optional"
                              value={batch.startMeter}
                              onChange={(e) => updateBatch(product.productId, batch.id, 'startMeter', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Close Meter</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="Optional"
                              value={batch.closeMeter}
                              onChange={(e) => updateBatch(product.productId, batch.id, 'closeMeter', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Volume (L)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="e.g. 1500"
                              value={batch.volume}
                              onChange={(e) => updateBatch(product.productId, batch.id, 'volume', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price (₦/L)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="e.g. 800"
                              value={batch.pricePerLiter}
                              onChange={(e) => updateBatch(product.productId, batch.id, 'pricePerLiter', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                            />
                          </div>
                        </div>

                        {product.batches.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeBatch(product.productId, batch.id)}
                            className="text-gray-400 hover:text-alert-red transition-colors p-2"
                            title="Remove batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => addBatch(product.productId)}
                      className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Another Batch
                    </button>
                  </div>

                  <hr className="border-gray-100 dark:border-gray-800" />

                  {/* Tank Dip */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Physical Tank Dip</h4>
                    <div className="max-w-sm">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Closing Volume (L)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="e.g. 15000"
                        value={product.dipVolume}
                        onChange={(e) => updateDip(product.productId, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                      />
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section C: Daily Expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-tycoon-charcoal dark:text-white">Section C: Daily Expenses</h2>
            <p className="text-sm text-gray-500 mt-1">Enter amounts for any expenses incurred today. Leave blank if none.</p>
          </div>

          <div className="space-y-4">
            {expenses.map((expense, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="w-full sm:w-1/3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{expense.type}</span>
                </div>
                <div className="w-full sm:w-1/4">
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="Amount (₦)"
                    value={expense.amount}
                    onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
                <div className="w-full sm:flex-1">
                  <input 
                    type="text"
                    placeholder="Comments (Optional)"
                    value={expense.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Action */}
        <button 
          disabled={isSubmitting}
          type="submit"
          className="w-full flex justify-center items-center gap-2 bg-tycoon-red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] text-lg"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? 'Submitting EOD Log...' : 'Submit End of Day Log'}
        </button>

      </form>
    </div>
  )
}
