import React from 'react';

export default function UrgencyBadge({ status }: { status: string }) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  let displayStatus = status;

  if (status === 'Red') {
    bgColor = 'bg-alert-red';
    textColor = 'text-white';
    displayStatus = '🔴 Depleted';
  } else if (status === 'Normal') {
    bgColor = 'bg-gray-100';
    textColor = 'text-gray-800';
    displayStatus = 'Normal';
  } else if (status === 'Green') {
    bgColor = 'bg-green-500';
    textColor = 'text-white';
    displayStatus = '🟢 Healthy';
  }

  return (
    <span className={`px-2 py-1 text-xs font-bold rounded shadow-sm ${bgColor} ${textColor}`}>
      {displayStatus}
    </span>
  );
}
