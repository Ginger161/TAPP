import React, { Suspense } from 'react';
import AnalyticsLoader from './AnalyticsLoader';
import AnalyticsLoading from './loading';

export const metadata = {
  title: 'Analytics - TAPP',
};

export default function AnalyticsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <AnalyticsLoader searchParams={searchParams} />
    </Suspense>
  );
}
