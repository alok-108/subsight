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
import { formatCurrency, formatMonthYear } from '@/lib/format';

interface AmountStepLineChartProps {
  dates: string[];
  amounts: number[];
}

export function AmountStepLineChart({ dates, amounts }: AmountStepLineChartProps) {
  const data = dates.map((d, i) => ({
    date: formatMonthYear(d),
    amount: amounts[i] || 0,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" vertical={false} />
          <XAxis
            dataKey="date"
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
            formatter={(val: any) => [formatCurrency(Number(val)), 'Billed Amount']}
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
            type="stepAfter"
            dataKey="amount"
            stroke="#7C3AED"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#7C3AED' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
