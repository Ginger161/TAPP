import React, { Suspense } from 'react';
import { getAssignedStationId, getPreviousClosingMeters } from '../actions';
import EODWizardClient from './EODWizardClient';

export const metadata = {
  title: 'End of Day (EOD) Submission - TAPP',
};

export default async function EODPage() {
  const stationId = await getAssignedStationId();
  const previousMetersMap = await getPreviousClosingMeters(stationId);

  // Convert the map to an array for the client component
  const initialPumps = Object.entries(previousMetersMap).map(([pump_id, data]) => ({
    pump_id,
    product_id: data.product_id,
    product_name: data.product_name,
    opening_meter: data.closing_meter,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-tycoon-charcoal mb-6">End of Day (EOD) Submission</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <EODWizardClient initialPumps={initialPumps} />
      </div>
    </div>
  );
}
