'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';

export type PriceTier = {
  id: string;
  volume: string;
  price: string;
};

export type ProductSalesState = {
  productName: string;
  totalVolume: number;
  tiers: PriceTier[];
  productRevenue?: number;
};

export type ExpenseItem = {
  id: string;
  description: string;
  amount: string;
};

export default function SalesAndExpensesForm({
  aggregatedVolumes,
  onBack,
  onSubmit,
}: {
  aggregatedVolumes: Record<string, number>;
  onBack: () => void;
  onSubmit: (totalGrossRevenue: number, totalExpenses: number, sales: ProductSalesState[], expenses: ExpenseItem[]) => void;
}) {
  // Initialize state only for products that have volume > 0
  const [salesData, setSalesData] = useState<ProductSalesState[]>(() => {
    return Object.entries(aggregatedVolumes)
      .filter(([_, volume]) => volume > 0)
      .map(([productName, totalVolume]) => ({
        productName,
        totalVolume,
        tiers: [{ id: `initial-${Date.now()}`, volume: totalVolume.toString(), price: '' }],
      }));
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: `exp-${Date.now()}`, description: '', amount: '' },
  ]);

  // --- Sales Handlers ---

  const addPriceTier = (productName: string) => {
    setSalesData((prev) =>
      prev.map((p) => {
        if (p.productName === productName) {
          return {
            ...p,
            tiers: [...p.tiers, { id: `tier-${Date.now()}-${Math.random()}`, volume: '', price: '' }],
          };
        }
        return p;
      })
    );
  };

  const removePriceTier = (productName: string, tierId: string) => {
    setSalesData((prev) =>
      prev.map((p) => {
        if (p.productName === productName) {
          return {
            ...p,
            tiers: p.tiers.filter((t) => t.id !== tierId),
          };
        }
        return p;
      })
    );
  };

  const updatePriceTier = (productName: string, tierId: string, field: keyof PriceTier, value: string) => {
    setSalesData((prev) =>
      prev.map((p) => {
        if (p.productName === productName) {
          return {
            ...p,
            tiers: p.tiers.map((t) => (t.id === tierId ? { ...t, [field]: value } : t)),
          };
        }
        return p;
      })
    );
  };

  // --- Expenses Handlers ---

  const addExpense = () => {
    setExpenses((prev) => [...prev, { id: `exp-${Date.now()}-${Math.random()}`, description: '', amount: '' }]);
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: string) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  // --- Calculations ---

  const { calculatedSales, allAssignedValid, totalGrossRevenue } = useMemo(() => {
    let allValid = true;
    let totalRevenue = 0;

    const calculated = salesData.map((product) => {
      let assignedVolume = 0;
      let productRevenue = 0;

      const calcTiers = product.tiers.map((tier) => {
        const vol = parseFloat(tier.volume) || 0;
        const price = parseFloat(tier.price) || 0;
        const rev = vol * price;

        assignedVolume += vol;
        productRevenue += rev;

        return { ...tier, revenue: rev };
      });

      const unassignedVolume = product.totalVolume - assignedVolume;
      totalRevenue += productRevenue;

      // We use a small epsilon for floating point comparison issues
      if (Math.abs(unassignedVolume) > 0.01) {
        allValid = false;
      }

      return {
        ...product,
        tiers: calcTiers,
        assignedVolume,
        unassignedVolume,
        productRevenue,
      };
    });

    return { calculatedSales: calculated, allAssignedValid: allValid, totalGrossRevenue: totalRevenue };
  }, [salesData]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAssignedValid) {
      alert("Please assign all volumes exactly. Unassigned volume must be 0.");
      return;
    }
    onSubmit(totalGrossRevenue, totalExpenses, calculatedSales, expenses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sales / Tiered Pricing Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-tycoon-navy mb-4 border-b pb-2">Tiered Pricing (Sales)</h2>
        
        {calculatedSales.length === 0 && (
          <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
            No sales volume generated from pumps.
          </div>
        )}

        {calculatedSales.map((product) => (
          <div key={product.productName} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-tycoon-navy text-lg">{product.productName}</h3>
              <div className="text-sm font-semibold">
                Total Pumped: <span className="text-tycoon-charcoal">{product.totalVolume.toFixed(2)} L</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Unassigned Volume Alert */}
              {Math.abs(product.unassignedVolume) > 0.01 ? (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm font-medium ${product.unassignedVolume > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  <AlertCircle size={18} />
                  <span>
                    Unassigned Volume: {product.unassignedVolume > 0 ? '' : '+'}{product.unassignedVolume.toFixed(2)} L 
                    {product.unassignedVolume < 0 && ' (You have assigned more than pumped!)'}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-md flex items-center gap-2 text-sm font-medium bg-green-50 text-green-800 border border-green-200">
                  <AlertCircle size={18} />
                  <span>All volumes successfully assigned!</span>
                </div>
              )}

              {/* Tiers List */}
              <div className="space-y-3">
                {product.tiers.map((tier, index) => (
                  <div key={tier.id} className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="w-full sm:w-1/3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Volume (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.volume}
                        onChange={(e) => updatePriceTier(product.productName, tier.id, 'volume', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tycoon-navy focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="w-full sm:w-1/3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price (₦/L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => updatePriceTier(product.productName, tier.id, 'price', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tycoon-navy focus:border-transparent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="w-full sm:w-1/3 p-2 bg-gray-50 border border-gray-200 rounded-md flex justify-between items-center h-[42px]">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Rev:</span>
                      <span className="font-bold text-tycoon-navy">₦{tier.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {product.tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePriceTier(product.productName, tier.id)}
                        className="text-red-400 hover:text-red-600 p-2 mb-1"
                        title="Remove Tier"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => addPriceTier(product.productName)}
                  className="flex items-center gap-1 text-sm font-semibold text-tycoon-navy hover:text-blue-700 transition-colors"
                >
                  <Plus size={16} /> Add Price Tier
                </button>
                <div className="text-sm font-bold text-tycoon-charcoal">
                  Gross: ₦{product.productRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-gray-200" />

      {/* Daily Expenses Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-bold text-tycoon-navy">Daily Expenses</h2>
          <div className="text-lg font-bold text-red-600">
            Total: ₦{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="w-full sm:flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description / Category</label>
                <input
                  type="text"
                  value={expense.description}
                  onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="e.g. Generator Fuel"
                  required
                />
              </div>
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount (₦)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expense.amount}
                  onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeExpense(expense.id)}
                className="text-red-400 hover:text-red-600 p-2 mb-1"
                title="Remove Expense"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addExpense}
          className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-800 transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-gray-500 text-sm font-semibold uppercase block">Total Net Today</span>
          <span className="text-2xl font-bold text-tycoon-charcoal">
            ₦{(totalGrossRevenue - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            type="submit"
            disabled={!allAssignedValid}
            className={`px-8 py-3 font-bold rounded-lg transition-colors w-full sm:w-auto shadow-md ${
              allAssignedValid 
                ? 'bg-tycoon-red hover:bg-red-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Proceed to Remittance
          </button>
        </div>
      </div>
    </form>
  );
}
