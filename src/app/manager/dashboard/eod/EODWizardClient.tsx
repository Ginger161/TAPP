'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import PumpMetersForm, { PumpState } from './PumpMetersForm';
import SalesAndExpensesForm, { ProductSalesState, ExpenseItem } from './SalesAndExpensesForm';
import RemittanceAndDippingForm from './RemittanceAndDippingForm';
import { submitDailyEOD, EODSubmissionPayload } from '../actions';

type PumpData = {
  pump_id: string;
  product_id: string;
  product_name: string;
  opening_meter: number;
};

export default function EODWizardClient({ initialPumps }: { initialPumps: PumpData[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated State
  const [aggregatedVolumes, setAggregatedVolumes] = useState<Record<string, number>>({});
  const [pumpData, setPumpData] = useState<PumpState[]>([]);
  
  const [salesData, setSalesData] = useState<ProductSalesState[]>([]);
  const [expensesData, setExpensesData] = useState<ExpenseItem[]>([]);
  const [totalGrossRevenue, setTotalGrossRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Extract unique products for Phase 4 tank dipping
  const uniqueProducts = Array.from(
    new Map(initialPumps.map((p) => [p.product_name, { product_id: p.product_id, product_name: p.product_name }])).values()
  );

  const handlePumpMetersSubmit = (totals: Record<string, number>, pumps: PumpState[]) => {
    setAggregatedVolumes(totals);
    setPumpData(pumps);
    setStep(2);
  };

  const handleSalesAndExpensesSubmit = (
    totalGross: number,
    totalExp: number,
    sales: ProductSalesState[],
    expenses: ExpenseItem[]
  ) => {
    setTotalGrossRevenue(totalGross);
    setTotalExpenses(totalExp);
    setSalesData(sales);
    setExpensesData(expenses);
    setStep(3);
  };

  const handleRemittanceSubmit = async (data: {
    posToAccount: number;
    cashToBank: number;
    balanceDue: number;
    dippings: { tank_id: string; product_id: string; dipped_volume: number }[];
  }) => {
    setIsSubmitting(true);
    try {
      const payload: EODSubmissionPayload = {
        // Use local date string in YYYY-MM-DD
        date: new Date().toISOString().split('T')[0],
        pumps: pumpData.map((p) => ({
          pump_id: p.pump_id,
          product_id: p.product_id,
          opening_meter: parseFloat(p.opening_meter) || 0,
          closing_meter: parseFloat(p.closing_meter) || 0,
          rtt: parseFloat(p.rtt) || 0,
          override_reason: p.override_reason,
          net_volume: p.netVolume || 0,
        })),
        sales: salesData.map((s) => {
          const product = initialPumps.find((p) => p.product_name === s.productName);
          const productId = product?.product_id || '';
          
          const avgPrice = s.totalVolume > 0 && s.productRevenue 
            ? s.productRevenue / s.totalVolume 
            : 0;

          return {
            product_id: productId,
            total_volume: s.totalVolume,
            price_tiers: s.tiers.map((t) => ({
              volume: parseFloat(t.volume) || 0,
              price: parseFloat(t.price) || 0,
            })),
            average_price: avgPrice,
          };
        }),
        expenses: expensesData.map((e) => ({
          description: e.description,
          amount: parseFloat(e.amount) || 0,
        })),
        dippings: data.dippings,
        remittance: {
          gross_revenue: totalGrossRevenue,
          total_expenses: totalExpenses,
          pos_to_account: data.posToAccount,
          cash_to_bank: data.cashToBank,
          balance_due: data.balanceDue,
        },
      };

      await submitDailyEOD(payload);
      toast.success('End of Day (EOD) log submitted successfully!');
      router.push('/manager/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to submit EOD log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <div className={`flex-1 h-2 rounded ${step >= 1 ? 'bg-tycoon-navy' : 'bg-gray-200'}`} />
        <div className={`flex-1 h-2 rounded ${step >= 2 ? 'bg-tycoon-navy' : 'bg-gray-200'}`} />
        <div className={`flex-1 h-2 rounded ${step >= 3 ? 'bg-tycoon-navy' : 'bg-gray-200'}`} />
      </div>

      {step === 1 && (
        <PumpMetersForm initialPumps={initialPumps} onSubmit={handlePumpMetersSubmit} />
      )}

      {step === 2 && (
        <SalesAndExpensesForm 
          aggregatedVolumes={aggregatedVolumes} 
          onBack={() => setStep(1)}
          onSubmit={handleSalesAndExpensesSubmit} 
        />
      )}

      {step === 3 && (
        <RemittanceAndDippingForm
          uniqueProducts={uniqueProducts}
          totalGrossRevenue={totalGrossRevenue}
          totalExpenses={totalExpenses}
          onBack={() => setStep(2)}
          onSubmit={handleRemittanceSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
