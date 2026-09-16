'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitSales, submitExpense, SalesPayload } from './actions'
import { CheckCircle2, AlertCircle, FileText, Receipt, Upload, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { catchNetworkError } from '@/utils/network'

function getLocalWATDateString() {
  const d = new Date()
  // Calculate WAT (UTC+1)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  const wat = new Date(utc + (3600000 * 1))
  return wat.toISOString().split('T')[0]
}

type Batch = { id: string; volume: string; pricePerLiter: string };

type ProductBatches = {
  productId: string;
  productName: string;
  batches: Batch[];
};

export default function SubmitClient({ products }: { products: { id: string, name: string }[] }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as 'sales' | 'expenses' | null

  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>(tabParam === 'expenses' ? 'expenses' : 'sales')
  const [prevTabParam, setPrevTabParam] = useState(tabParam)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const [date, setDate] = useState(getLocalWATDateString())

  const [salesData, setSalesData] = useState<ProductBatches[]>(
    products.map(p => ({
      productId: p.id,
      productName: p.name,
      batches: [{ id: Date.now().toString() + Math.random().toString(), volume: '', pricePerLiter: '' }]
    }))
  )

  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam)
    if (tabParam === 'expenses' || tabParam === 'sales') {
      setActiveTab(tabParam)
    }
  }

  const addBatch = (productId: string) => {
    setSalesData(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          batches: [...p.batches, { id: Date.now().toString() + Math.random().toString(), volume: '', pricePerLiter: '' }]
        };
      }
      return p;
    }));
  };

  const removeBatch = (productId: string, batchId: string) => {
    setSalesData(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          batches: p.batches.filter(b => b.id !== batchId)
        };
      }
      return p;
    }));
  };

  const updateBatch = (productId: string, batchId: string, field: 'volume' | 'pricePerLiter', value: string) => {
    setSalesData(prev => prev.map(p => {
      if (p.productId === productId) {
        return {
          ...p,
          batches: p.batches.map(b => b.id === batchId ? { ...b, [field]: value } : b)
        };
      }
      return p;
    }));
  };

  async function handleSalesAction(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const payload: SalesPayload = {
      date,
      products: salesData.map(p => ({
        productId: p.productId,
        batches: p.batches.map(b => ({
          volume: parseFloat(b.volume) || 0,
          pricePerLiter: parseFloat(b.pricePerLiter) || 0
        })).filter(b => b.volume > 0 && b.pricePerLiter > 0)
      }))
    };

    const hasAnyValidData = payload.products.some(p => p.batches.length > 0);
    if (!hasAnyValidData) {
      toast.error('Please enter at least one valid sale (volume and price).');
      setIsSubmitting(false);
      return;
    }

    const result = await catchNetworkError(submitSales(payload))
    setIsSubmitting(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Sales records submitted successfully!')
      setSalesData(products.map(p => ({
        productId: p.id,
        productName: p.name,
        batches: [{ id: Date.now().toString() + Math.random().toString(), volume: '', pricePerLiter: '' }]
      })));
    }
  }

  async function handleExpenseAction(formData: FormData) {
    setIsSubmitting(true)
    const result = await catchNetworkError(submitExpense(formData))
    setIsSubmitting(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense record submitted successfully!')
      setFileName(null)
      ;(document.getElementById('expense-form') as HTMLFormElement).reset()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Tabs */}
      <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          onClick={() => { setActiveTab('sales') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'sales'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Submit Sales
        </button>
        <button
          onClick={() => { setActiveTab('expenses') }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'expenses'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Submit Expense
        </button>
      </div>

      {/* Forms Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
        
        {/* Sales Form */}
        {activeTab === 'sales' && (
          <form id="sales-form" onSubmit={handleSalesAction} className="space-y-8">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="date">
                Date
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

            <div className="space-y-8">
              {salesData.map((product) => (
                <div key={product.productId} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/30">
                  <h3 className="font-bold text-tycoon-charcoal dark:text-white mb-4 text-lg">{product.productName}</h3>
                  <div className="space-y-3">
                    {product.batches.map((batch, index) => (
                      <div key={batch.id} className="flex flex-col sm:flex-row gap-3 items-end bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative group">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Volume (L)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="e.g. 1500"
                            value={batch.volume}
                            onChange={(e) => updateBatch(product.productId, batch.id, 'volume', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors"
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price per Liter (₦)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="e.g. 800"
                            value={batch.pricePerLiter}
                            onChange={(e) => updateBatch(product.productId, batch.id, 'pricePerLiter', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors"
                          />
                        </div>
                        {product.batches.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeBatch(product.productId, batch.id)}
                            className="text-gray-400 hover:text-alert-red transition-colors p-2 absolute -right-2 -top-2 bg-white rounded-full shadow-sm sm:static sm:bg-transparent sm:shadow-none sm:p-2"
                            title="Remove batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => addBatch(product.productId)}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-600 transition-colors bg-white dark:bg-gray-900"
                  >
                    <Plus className="w-4 h-4" /> Add Sale Entry
                  </button>
                </div>
              ))}
            </div>

            <button 
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95 text-lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Sales Record'}
            </button>
          </form>
        )}

        {/* Expenses Form */}
        {activeTab === 'expenses' && (
          <form id="expense-form" action={handleExpenseAction} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="expenseType">
                  Expense Type
                </label>
                <input 
                  required 
                  id="expenseType" 
                  name="expenseType" 
                  type="text"
                  placeholder="e.g. Maintenance, Utilities"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="amount">
                  Amount
                </label>
                <input 
                  required 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors outline-none"
                />
              </div>
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="description">
                  Description (Optional)
                </label>
                <textarea 
                  id="description" 
                  name="description" 
                  rows={2}
                  placeholder="Brief description of the expense..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Receipt Photo
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative group">
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 group-hover:text-red-600 transition-colors" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <label htmlFor="photo" className="relative cursor-pointer rounded-md font-medium text-red-600 dark:text-red-400 hover:text-red-600 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input 
                          id="photo" 
                          name="photo" 
                          type="file" 
                          accept="image/*"
                          className="sr-only" 
                          onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {fileName ? <span className="font-medium text-red-600">{fileName}</span> : 'PNG, JPG, GIF up to 10MB'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <button 
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Expense Record'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
