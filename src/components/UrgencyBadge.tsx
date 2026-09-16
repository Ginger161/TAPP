import React from 'react';

export default function UrgencyBadge({ status }: { status: string }) {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  if (status === 'Red') {
    bgColor = 'bg-alert-red';
    textColor = 'text-white';
  } else if (status === 'Yellow') {
    bgColor = 'bg-yellow-400';
    textColor = 'text-yellow-900';
  } else if (status === 'Green') {
    bgColor = 'bg-green-500';
    textColor = 'text-white';
  }

  return (
    <span className={`px-2 py-1 text-xs font-bold rounded shadow-sm ${bgColor} ${textColor}`}>
      {status}
    </span>
  );
}
