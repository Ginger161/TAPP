'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

export type SalesData = {
  date: string;
  volume: number;
};

export default function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              }
              if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
              if (value.match(/^\d{4}-\d{2}$/)) {
                const date = new Date(value + '-01');
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              }
              return value;
            }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip 
            cursor={{ fill: '#f3f4f6' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="volume" fill="#8B0000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
