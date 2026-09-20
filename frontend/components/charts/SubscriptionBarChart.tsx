'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface SubscriptionBarChartProps {
  data: { merchant_name: string; monthly_equivalent: number }[];
}

export function SubscriptionBarChart({ data }: SubscriptionBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted">No subscriptions</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" horizontal={false} />
          <XAxis
            type="number"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${v}`}
          />
          <YAxis
            type="category"
            dataKey="merchant_name"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            formatter={(val: any) => [formatCurrency(Number(val)), 'Monthly Equivalent']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--line)',
              borderRadius: '12px',
              color: 'var(--ink)',
              fontSize: '12px',
              boxShadow: 'var(--shadow-elevated)',
            }}
          />
          <Bar
            dataKey="monthly_equivalent"
            fill="#7C3AED"
            radius={[0, 8, 8, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
