import React, { Suspense } from 'react';
import ViewerStationDashboardLoader from './ViewerStationDashboardLoader';
import ViewerStationLoading from './loading';

export const metadata = {
  title: 'Station Dashboard - TAPP',
};

export default async function ViewerStationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<ViewerStationLoading />}>
      <ViewerStationDashboardLoader stationId={resolvedParams.stationId} />
    </Suspense>
  );
}
