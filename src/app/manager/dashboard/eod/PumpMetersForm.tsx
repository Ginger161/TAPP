'use client';

import React, { useState, useMemo } from 'react';
import { Lock, Unlock, Edit3, Plus, Trash2 } from 'lucide-react';

type PumpData = {
  pump_id: string;
  product_id: string;
  product_name: string;
  opening_meter: number;
};

export type PumpState = {
  id: string;
  pump_id: string;
  product_id: string;
  product_name: string;
  opening_meter: string; // use string for input fields to handle empty state
  is_unlocked: boolean;
  override_reason: string;
  closing_meter: string;
  rtt: string;
  netVolume?: number; // Calculated later
};

export default function PumpMetersForm({ 
  initialPumps,
  onSubmit 
}: { 
  initialPumps: PumpData[],
  onSubmit: (totals: Record<string, number>, pumps: PumpState[]) => void
}) {
  const [pumps, setPumps] = useState<PumpState[]>(
    initialPumps.map((p, index) => ({
      id: `existing-${index}`,
      pump_id: p.pump_id,
      product_id: p.product_id,
      product_name: p.product_name,
      opening_meter: p.opening_meter.toString(),
      is_unlocked: false,
      override_reason: '',
      closing_meter: '',
      rtt: '0',
    }))
  );

  // Temporary function to allow adding a new pump if none exist or needed for testing
  const handleAddPump = () => {
    setPumps([
      ...pumps,
      {
        id: `new-${Date.now()}`,
        pump_id: `Pump ${pumps.length + 1}`,
        product_id: '', 
        product_name: 'PMS', // Defaulting to PMS
        opening_meter: '0',
        is_unlocked: true,
        override_reason: 'Initial setup',
        closing_meter: '',
        rtt: '0',
      },
    ]);
  };

  const updatePump = (id: string, field: keyof PumpState, value: string | boolean) => {
    setPumps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removePump = (id: string) => {
    setPumps((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleLock = (id: string, currentlyUnlocked: boolean) => {
    updatePump(id, 'is_unlocked', !currentlyUnlocked);
  };

  // Calculate Net Volumes
  const calculatedPumps = useMemo(() => {
    return pumps.map((p) => {
      const open = parseFloat(p.opening_meter) || 0;
      const close = parseFloat(p.closing_meter) || 0;
      const rtt = parseFloat(p.rtt) || 0;
      const net = close > 0 ? (close - open) - rtt : 0;
      
      return {
        ...p,
        netVolume: net,
      };
    });
  }, [pumps]);

  // Aggregate by Product Type
  const aggregatedTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    calculatedPumps.forEach((p) => {
      if (!totals[p.product_name]) {
        totals[p.product_name] = 0;
      }
      totals[p.product_name] += p.netVolume;
    });
    return totals;
  }, [calculatedPumps]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-tycoon-navy mb-4 border-b pb-2">Pump Meters & RTT</h2>
      {calculatedPumps.length === 0 && (
        <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
          No active pumps found for this station. 
        </div>
      )}

      {calculatedPumps.map((pump) => (
        <div key={pump.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-tycoon-navy text-lg flex items-center gap-2">
              <input
                type="text"
                value={pump.pump_id}
                onChange={(e) => updatePump(pump.id, 'pump_id', e.target.value)}
                className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-tycoon-navy focus:outline-none focus:ring-0 max-w-[150px]"
                placeholder="Pump Name"
              />
              <span className="text-xs bg-tycoon-navy text-white px-2 py-1 rounded">
                <input
                  type="text"
                  value={pump.product_name}
                  onChange={(e) => updatePump(pump.id, 'product_name', e.target.value.toUpperCase())}
                  className="bg-transparent w-12 text-center focus:outline-none"
                  placeholder="PMS"
                />
              </span>
            </h3>
            <button
              onClick={() => removePump(pump.id)}
              className="text-red-400 hover:text-red-600 p-1"
              title="Remove Pump"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Opening Meter */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center justify-between">
                <span>Opening Meter</span>
                <button
                  type="button"
                  onClick={() => toggleLock(pump.id, pump.is_unlocked)}
                  className="text-gray-400 hover:text-tycoon-navy transition-colors"
                  title={pump.is_unlocked ? 'Lock Meter' : 'Unlock Meter'}
                >
                  {pump.is_unlocked ? <Unlock size={14} className="text-amber-500" /> : <Lock size={14} />}
                </button>
              </label>
              <input
                type="number"
                value={pump.opening_meter}
                onChange={(e) => updatePump(pump.id, 'opening_meter', e.target.value)}
                readOnly={!pump.is_unlocked}
                className={`w-full p-2 border rounded-md text-right focus:ring-2 focus:ring-tycoon-navy focus:border-transparent transition-colors ${
                  !pump.is_unlocked ? 'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed' : 'bg-white border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>

            {/* Closing Meter */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Closing Meter
              </label>
              <input
                type="number"
                value={pump.closing_meter}
                onChange={(e) => updatePump(pump.id, 'closing_meter', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-right bg-white focus:ring-2 focus:ring-tycoon-navy focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* RTT */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">
                RTT (Liters)
              </label>
              <input
                type="number"
                value={pump.rtt}
                onChange={(e) => updatePump(pump.id, 'rtt', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-right bg-white focus:ring-2 focus:ring-tycoon-navy focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* Net Volume (Calculated) */}
            <div className="col-span-1 space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Net Volume
              </label>
              <div className={`w-full p-2 border rounded-md text-right font-bold flex items-center justify-end ${
                pump.netVolume < 0 ? 'bg-red-50 text-red-600 border-red-200' : 
                pump.netVolume > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {pump.netVolume.toFixed(2)} L
              </div>
            </div>
          </div>

          {/* Override Reason Field (Conditionally Rendered) */}
          {pump.is_unlocked && (
            <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-md">
              <label className="text-xs font-bold text-amber-800 uppercase mb-1 block">
                Override Reason (Required)
              </label>
              <input
                type="text"
                value={pump.override_reason}
                onChange={(e) => updatePump(pump.id, 'override_reason', e.target.value)}
                className="w-full p-2 border border-amber-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Why are you changing the opening meter?"
                required
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-between items-center py-2">
        <button
          type="button"
          onClick={handleAddPump}
          className="flex items-center gap-2 text-sm font-semibold text-tycoon-navy hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
        >
          <Plus size={16} />
          Add Pump
        </button>
      </div>

      {/* Aggregated Totals */}
      <div className="mt-8 bg-tycoon-navy text-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-bold mb-4 border-b border-white/20 pb-2">Total Net Volumes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {Object.keys(aggregatedTotals).length === 0 ? (
            <div className="text-gray-300 text-sm">No sales calculated yet.</div>
          ) : (
            Object.entries(aggregatedTotals).map(([productName, total]) => (
              <div key={productName} className="flex flex-col">
                <span className="text-xs font-semibold text-white/70 uppercase mb-1">
                  Total {productName}
                </span>
                <span className="text-2xl font-bold">
                  {total.toFixed(2)} <span className="text-sm font-normal text-white/70">Liters</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Proceed Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="bg-tycoon-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors"
          onClick={() => onSubmit(aggregatedTotals, calculatedPumps)}
        >
          Proceed to Sales
        </button>
      </div>
    </div>
  );
}
