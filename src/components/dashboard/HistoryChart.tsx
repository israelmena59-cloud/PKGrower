// src/components/dashboard/HistoryChart.tsx
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Paper from '@mui/material/Paper'
import { Box, Typography } from '@mui/material';

interface HistoryChartProps {
  data: any[];
  dataKey: string;
  stroke: string;
}

const HistoryChart: React.FC<HistoryChartProps> = React.memo(({ data, dataKey, stroke }) => {
  // Memoize data slice to prevent heavy calculations on every render if data hasn't changed
  const chartData = useMemo(() => {
     return data.slice(-20); // Show last 20 points for cleaner UI
  }, [data]);

  return (
    <Paper
        elevation={0}
        sx={{
            p: 2,
            borderRadius: 'var(--squircle-radius)',
            height: 320,
            bgcolor: 'var(--glass-bg)',
            backdropFilter: 'var(--backdrop-blur)',
            border: 'var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
            position: 'relative',
            overflow: 'hidden'
        }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
         <Typography variant="caption" fontWeight="bold" sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
             {dataKey === 'temperature' ? 'Temperatura' : 'Humedad'}
         </Typography>
         <Typography variant="caption" sx={{ color: stroke, fontWeight: 'bold' }}>
             En vivo
         </Typography>
      </Box>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10 }}
              tickFormatter={(timeStr) => new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                  backgroundColor: 'rgba(20, 20, 30, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }}
              itemStyle={{ color: stroke, fontWeight: 'bold' }}
            />
            <Area
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                strokeWidth={3}
                fill={`url(#gradient-${dataKey})`}
                animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
});

export default HistoryChart;
