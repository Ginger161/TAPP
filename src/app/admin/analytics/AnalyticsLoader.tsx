import React from 'react';
import AnalyticsClient from './AnalyticsClient';
import { getAvailableYears, getFinancialMetrics, getMultiYearSalesData } from './actions';
import { getAuditLogFeed } from './auditActions';

export default async function AnalyticsLoader({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const stationId = Array.isArray(searchParams.station_id) ? searchParams.station_id[0] : searchParams.station_id;
  
  const years = await getAvailableYears();
  const selectedYears = years.slice(0, 3);
  
  const [financials, multiYearRes, auditRes] = await Promise.all([
    getFinancialMetrics('30d', stationId),
    getMultiYearSalesData(stationId, selectedYears),
    getAuditLogFeed(stationId).catch(() => [])
  ]);
  
  const initialData = {
    availableYears: years,
    selectedYears,
    financials,
    multiYearSales: multiYearRes.data,
    multiYearYears: multiYearRes.years,
    stationName: multiYearRes.stationName,
    auditLog: auditRes
  };
  
  return <AnalyticsClient initialData={initialData} stationId={stationId} />;
}
