'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { formatDateToDDMMYYYY } from '@/utils/dateFormatter';

export type SalesData = {
  date: string;
  volume: number;
};

export default function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <div className="w-full h-64 outline-none focus:outline-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            axisLine={false} 
            tickLine={false}
            minTickGap={20}
            tickFormatter={(value: string) => {
              if (value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
                // e.g. 2026-09-13 14:00 -> 14:00
                const date = new Date(value.replace(' ', 'T'));
                let hours = date.getHours();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                return `${hours} ${ampm}`;
              }
              if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return formatDateToDDMMYYYY(value).substring(0, 5); // DD/MM
              }
              if (value.match(/^\d{4}-\d{2}$/)) {
                const parts = value.split('-');
                return `${parts[1]}/${parts[0]}`; // MM/YYYY
              }
              return value;
            }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(value: number) => {
              const formatted = Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value);
              return `${formatted} L`;
            }}
          />
          <Tooltip 
            formatter={(value: any) => [`${Number(value || 0).toLocaleString()} L`, 'Volume']}
            cursor={{ fill: '#f3f4f6' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="volume" fill="#8B0000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
