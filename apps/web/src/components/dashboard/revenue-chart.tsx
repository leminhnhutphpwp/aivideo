'use client';

import * as React from 'react';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid 
} from 'recharts';

const data = [
  { name: 'Jan', value: 15 },
  { name: 'Feb', value: 25 },
  { name: 'Mar', value: 45 },
  { name: 'Apr', value: 35 },
  { name: 'May', value: 48 },
  { name: 'Jun', value: 40 },
  { name: 'Jul', value: 55 },
  { name: 'Aug', value: 45 },
  { name: 'Sep', value: 65 },
];

export function RevenueChart() {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b3d" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ff6b3d" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ffffff05" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(value: number) => `${value}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#151515', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px'
            }}
            itemStyle={{ color: '#ff6b3d' }}
            cursor={{ stroke: '#ff6b3d', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ff6b3d"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
