import React from 'react';
import { getViewerStationDashboardData } from './actions';
import ViewerStationDashboardClient from './ViewerStationDashboardClient';

export default async function ViewerStationDashboardLoader({ stationId }: { stationId: string }) {
  const data = await getViewerStationDashboardData(stationId);
  
  if (!data) return <div className="p-8 text-tycoon-charcoal flex items-center justify-center h-screen">Error loading Command Center...</div>;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{(data as any).error}</div>;

  return <ViewerStationDashboardClient initialData={data as any} stationId={stationId} />;
}
