import React, { Suspense } from 'react';
import GlobalAnalyticsClient from './GlobalAnalyticsClient';
import { getGlobalFinancialLogs } from './actions';
import { getAuditLogFeed } from '../analytics/auditActions';

export const metadata = {
  title: 'Global Analytics - TAPP',
};

async function GlobalAnalyticsLoader() {
  const [financialLogs, auditLogs] = await Promise.all([
    getGlobalFinancialLogs(500),
    getAuditLogFeed() // without stationId to fetch globally
  ]);

  return <GlobalAnalyticsClient financialLogs={financialLogs} auditLogs={auditLogs} />;
}

export default function GlobalAnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 font-semibold">Loading master ledger...</div>}>
      <GlobalAnalyticsLoader />
    </Suspense>
  );
}
