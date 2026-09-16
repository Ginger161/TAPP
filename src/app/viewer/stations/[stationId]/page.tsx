import React, { Suspense } from 'react';
import ViewerStationDashboardLoader from './ViewerStationDashboardLoader';
import ViewerStationLoading from './loading';

export const metadata = {
  title: 'Station Dashboard - TAPP',
};

export default function ViewerStationPage({ params }: { params: { stationId: string } }) {
  return (
    <Suspense fallback={<ViewerStationLoading />}>
      <ViewerStationDashboardLoader stationId={params.stationId} />
    </Suspense>
  );
}
