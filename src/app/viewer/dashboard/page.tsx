import React, { Suspense } from 'react';
import ViewerDashboardLoader from './ViewerDashboardLoader';
import ViewerDashboardLoading from './loading';

export const metadata = {
  title: 'Viewer Dashboard - TAPP',
};

export default function ViewerDashboardPage() {
  return (
    <Suspense fallback={<ViewerDashboardLoading />}>
      <ViewerDashboardLoader />
    </Suspense>
  );
}
