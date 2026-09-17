import React, { Suspense } from 'react';
import AdminStationDashboardLoader from './AdminStationDashboardLoader';
import AdminStationLoading from './loading';

export const metadata = {
  title: 'Station Dashboard - TAPP',
};

export default async function AdminStationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<AdminStationLoading />}>
      <AdminStationDashboardLoader stationId={resolvedParams.stationId} />
    </Suspense>
  );
}
