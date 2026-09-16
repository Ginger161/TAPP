import React from 'react';
import { getAdminStationDashboardData } from './actions';
import AdminStationDashboardClient from './AdminStationDashboardClient';

export default async function AdminStationDashboardLoader({ stationId }: { stationId: string }) {
  const data = await getAdminStationDashboardData(stationId, '30D');
  
  if (!data) return <div className="p-8 text-tycoon-charcoal">Error loading data.</div>;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{(data as any).error}</div>;

  return <AdminStationDashboardClient initialData={data as any} stationId={stationId} />;
}
