'use client';

import { useState } from 'react';
import { testUrgencyWithNumbers, fetchStationUrgency } from './actions';

export default function TestUrgencyPage() {
  const [stock, setStock] = useState<number>(2500);
  const [sales, setSales] = useState<number>(950);
  
  // Custom config override
  const [useOverride, setUseOverride] = useState<boolean>(false);
  const [redThreshold, setRedThreshold] = useState<number>(2);
  const [yellowThreshold, setYellowThreshold] = useState<number>(3);
  const [greenThreshold, setGreenThreshold] = useState<number>(4);

  const [calcResult, setCalcResult] = useState<{status: string, daysRemaining: number, config: { green_threshold: number, yellow_threshold: number, red_threshold: number }} | null>(null);

  const [stationId, setStationId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [dbResult, setDbResult] = useState<{status: string, daysRemaining: number, averageDailySales: number, stock: number, config: { green_threshold: number, yellow_threshold: number, red_threshold: number }} | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);

  const handleTestNumbers = async () => {
    setLoading(true);
    try {
      const configOverride = useOverride ? {
        red_threshold: redThreshold,
        yellow_threshold: yellowThreshold,
        green_threshold: greenThreshold
      } : undefined;

      const res = await testUrgencyWithNumbers(stock, sales, configOverride);
      setCalcResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleTestDb = async () => {
    setLoading(true);
    try {
      const res = await fetchStationUrgency(stationId, productId);
      setDbResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Urgency Engine Test</h1>
        <p className="text-gray-600">Verify the mathematical calculation of the predictive urgency engine.</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">1. Scenario Calculator Test</h2>
        <p className="text-sm text-gray-500 mb-6">
          Input a stock volume and a 7-day average daily sales volume to verify the estimated days remaining and the resulting Red/Yellow/Green flag.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock (Litres)</label>
            <input 
              type="number" inputMode="decimal" pattern="[0-9]*" 
              value={stock} 
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">7-Day Average Sales (Litres/Day)</label>
            <input 
              type="number" inputMode="decimal" pattern="[0-9]*" 
              value={sales} 
              onChange={(e) => setSales(Number(e.target.value))}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-100">
          <label className="flex items-center space-x-2 mb-4">
            <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Override Database Urgency Config Thresholds</span>
          </label>
          
          {useOverride && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-red-700 mb-1">Red Threshold (Days)</label>
                <input type="number" inputMode="decimal" pattern="[0-9]*" value={redThreshold} onChange={(e) => setRedThreshold(Number(e.target.value))} className="w-full border border-red-300 rounded p-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-yellow-700 mb-1">Yellow Threshold (Days)</label>
                <input type="number" inputMode="decimal" pattern="[0-9]*" value={yellowThreshold} onChange={(e) => setYellowThreshold(Number(e.target.value))} className="w-full border border-yellow-300 rounded p-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">Green Threshold (Days)</label>
                <input type="number" inputMode="decimal" pattern="[0-9]*" value={greenThreshold} onChange={(e) => setGreenThreshold(Number(e.target.value))} className="w-full border border-green-300 rounded p-1 text-sm" />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleTestNumbers}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          Calculate
        </button>

        {calcResult && (
          <div className="mt-6 p-4 rounded bg-gray-50 border border-gray-200">
            <h3 className="font-semibold mb-2 text-lg">Result</h3>
            <ul className="space-y-1 text-sm text-gray-800">
              <li><strong>Estimated Days Remaining:</strong> {calcResult.daysRemaining.toFixed(2)} days</li>
              <li>
                <strong>Status Flag:</strong>{' '}
                <span className={`font-bold px-2 py-1 rounded ${
                  calcResult.status === 'Red' ? 'bg-red-100 text-red-800' :
                  calcResult.status === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {calcResult.status}
                </span>
              </li>
              <li className="mt-2 text-xs text-gray-500">
                Applied Thresholds: Red &le; {calcResult.config.red_threshold}, 
                Yellow &gt; {calcResult.config.red_threshold} and &le; {calcResult.config.green_threshold}, 
                Green &gt; {calcResult.config.green_threshold}
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">2. Database Station Test</h2>
        <p className="text-sm text-gray-500 mb-6">
          Input an actual Station ID and Product ID to fetch its current stock, calculate its 7-day average from `sales_transactions`, and output the urgency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Station ID (UUID)</label>
            <input 
              type="text" 
              value={stationId} 
              onChange={(e) => setStationId(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (UUID)</label>
            <input 
              type="text" 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            />
          </div>
        </div>

        <button 
          onClick={handleTestDb}
          disabled={loading || !stationId || !productId}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
        >
          Run Database Query
        </button>

        {dbResult && (
          <div className="mt-6 p-4 rounded bg-gray-50 border border-gray-200">
            <h3 className="font-semibold mb-2 text-lg">Live DB Result</h3>
            <ul className="space-y-1 text-sm text-gray-800">
              <li><strong>Current Stock (from ledger):</strong> {dbResult.stock} litres</li>
              <li><strong>7-Day Average Sales:</strong> {dbResult.averageDailySales.toFixed(2)} litres/day</li>
              <li><strong>Estimated Days Remaining:</strong> {dbResult.daysRemaining === Infinity ? 'Infinity (No Sales)' : dbResult.daysRemaining.toFixed(2)} days</li>
              <li>
                <strong>Status Flag:</strong>{' '}
                <span className={`font-bold px-2 py-1 rounded ${
                  dbResult.status === 'Red' ? 'bg-red-100 text-red-800' :
                  dbResult.status === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {dbResult.status}
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
