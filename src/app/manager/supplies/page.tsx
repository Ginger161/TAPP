import React, { Suspense } from 'react';
import ManagerSuppliesLoader from './ManagerSuppliesLoader';
import SuppliesLoading from './loading';

export const metadata = {
  title: 'Supplies - TAPP',
};

export default function ManagerSuppliesPage() {
  return (
    <Suspense fallback={<SuppliesLoading />}>
      <ManagerSuppliesLoader />
    </Suspense>
  );
}
