'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface TrendLineChartProps {
  data: { month: string; spend: number }[];
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted">No trend data</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip
            formatter={(val: any) => [formatCurrency(Number(val)), 'Projected Recurring']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--line)',
              borderRadius: '12px',
              color: 'var(--ink)',
              fontSize: '12px',
              boxShadow: 'var(--shadow-elevated)',
            }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="#7C3AED"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#7C3AED' }}
            activeDot={{ r: 5, fill: '#6D28D9' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
