import React from 'react';
import { getViewerDashboardData } from './actions';
import ViewerDashboardClient from './ViewerDashboardClient';

export default async function ViewerDashboardLoader() {
  const data = await getViewerDashboardData();
  
  if (!data || 'error' in data) {
    return <div className="p-8 text-tycoon-charcoal flex items-center justify-center h-screen">Error loading Command Center...</div>;
  }

  return <ViewerDashboardClient initialData={data as any} />;
}
