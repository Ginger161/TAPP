import React, { Suspense } from 'react';
import AdminStationDashboardLoader from './AdminStationDashboardLoader';
import AdminStationLoading from './loading';

export const metadata = {
  title: 'Station Dashboard - TAPP',
};

export default function AdminStationPage({ params }: { params: { stationId: string } }) {
  return (
    <Suspense fallback={<AdminStationLoading />}>
      <AdminStationDashboardLoader stationId={params.stationId} />
    </Suspense>
  );
}
