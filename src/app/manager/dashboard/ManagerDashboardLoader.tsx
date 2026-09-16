import React from 'react';
import { getManagerDashboardData } from './actions';
import ManagerDashboardClient from './ManagerDashboardClient';

export default async function ManagerDashboardLoader() {
  const data = await getManagerDashboardData();
  
  if (!data) return <div className="p-8 text-tycoon-charcoal">Error loading data.</div>;
  if ('error' in data) return <div className="p-8 text-alert-red font-bold text-center mt-10">{(data as any).error}</div>;

  return <ManagerDashboardClient initialData={data as any} />;
}
