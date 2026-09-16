import React, { Suspense } from 'react';
import ManagerDashboardLoader from './ManagerDashboardLoader';
import ManagerDashboardLoading from './loading';

export const metadata = {
  title: 'Manager Dashboard - TAPP',
};

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<ManagerDashboardLoading />}>
      <ManagerDashboardLoader />
    </Suspense>
  );
}
