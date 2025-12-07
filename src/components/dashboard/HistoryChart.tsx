// src/components/dashboard/HistoryChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Paper from '@mui/material/Paper'


interface HistoryChartProps {
  data: any[];
  dataKey: string;
  stroke: string;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, dataKey, stroke }) => {
  return (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#a0aec0"
            tickFormatter={(timeStr) => new Date(timeStr).toLocaleTimeString()}
          />
          <YAxis stroke="#a0aec0" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#2d3748', border: 'none' }}
            labelStyle={{ color: '#a0aec0' }}
          />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke={stroke} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      </Paper>
  );
};

export default HistoryChart;
