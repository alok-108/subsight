'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface IntervalScatterPlotProps {
  intervals: number[];
  median: number;
}

export function IntervalScatterPlot({ intervals, median }: IntervalScatterPlotProps) {
  const data = intervals.map((val, idx) => ({
    cycle: idx + 1,
    interval: val,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" />
          <XAxis
            type="number"
            dataKey="cycle"
            name="Cycle"
            unit=""
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            dataKey="interval"
            name="Days"
            unit="d"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: any, name: any) => [`${value} days`, name === 'cycle' ? 'Billing Cycle' : 'Interval']}
            contentStyle={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--line)',
              borderRadius: '12px',
              color: 'var(--ink)',
              fontSize: '12px',
              boxShadow: 'var(--shadow-elevated)',
            }}
          />
          <ReferenceLine
            y={median}
            stroke="#7C3AED"
            strokeDasharray="4 4"
            label={{ value: `Median (${median}d)`, position: 'insideTopRight', fill: '#7C3AED', fontSize: 11 }}
          />
          <Scatter name="Intervals" data={data} fill="#7C3AED" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
