import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Line } from 'recharts';
import { Card, CardHeader, CardContent, ToggleButton, ToggleButtonGroup, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Droplets, Sprout, Flower, Wind } from 'lucide-react';
import { SensorData } from '../../api/client';

interface VPDStageChartProps {
  data: SensorData[];
  className?: string;
}

type Stage = 'VEG' | 'FLOWER_1_4' | 'FLOWER_4_7' | 'FLOWER_7_PLUS' | 'DRYING';

// Enhanced Stage Config with Temp/Hum ranges
const STAGE_CONFIG: Record<Stage, { label: string; minVpd: number; maxVpd: number; color: string; minTemp: number; maxTemp: number; minHum: number; maxHum: number; icon: React.ReactNode }> = {
  VEG: { label: 'Vegetativo', minVpd: 0.8, maxVpd: 1.1, color: '#4ade80', minTemp: 22, maxTemp: 28, minHum: 60, maxHum: 75, icon: <Sprout size={16} /> },
  FLOWER_1_4: { label: 'Flora 1-4 Sem', minVpd: 1.0, maxVpd: 1.2, color: '#fcd34d', minTemp: 22, maxTemp: 26, minHum: 50, maxHum: 65, icon: <Flower size={16} /> },
  FLOWER_4_7: { label: 'Flora 4-7 Sem', minVpd: 1.2, maxVpd: 1.4, color: '#f97316', minTemp: 20, maxTemp: 25, minHum: 40, maxHum: 50, icon: <Flower size={16} /> },
  FLOWER_7_PLUS: { label: 'Flora 7+ Sem', minVpd: 1.2, maxVpd: 1.5, color: '#ef4444', minTemp: 18, maxTemp: 24, minHum: 35, maxHum: 45, icon: <Flower size={16} /> },
  DRYING: { label: 'Secado', minVpd: 0.7, maxVpd: 0.9, color: '#60a5fa', minTemp: 18, maxTemp: 22, minHum: 50, maxHum: 60, icon: <Wind size={16} /> },
};

// VPD Calculation Utility
const calculateVPD = (temp: number, humidity: number): number => {
  if (!temp || !humidity) return 0;
  // Saturation Vapor Pressure (kPa)
  const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  // Actual Vapor Pressure (kPa)
  const avp = svp * (humidity / 100);
  return Number((svp - avp).toFixed(2));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 border border-white/10 rounded-xl text-xs backdrop-blur-md bg-black/80 text-white shadow-xl">
        <p className="font-bold mb-2 text-gray-400">{label}</p>
        <div className="flex flex-col gap-1">
            <p style={{ color: '#a78bfa' }}>
              <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
              VPD: <b>{payload[0].value} kPa</b>
            </p>
            {payload[1] && (
                 <p style={{ color: '#ef4444' }}>
                   <span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-2"></span>
                   Temp: {payload[1].value}°C
                </p>
            )}
            {payload[2] && (
                 <p style={{ color: '#3b82f6' }}>
                   <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                   Humedad: {payload[2].value}%
                </p>
            )}
        </div>
      </div>
    );
  }
  return null;
};

export const VPDStageChart: React.FC<VPDStageChartProps> = ({ data = [] }) => {
  const [stage, setStage] = useState<Stage>('VEG');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Enrich data with calculated VPD
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      vpd: calculateVPD(point.temperature, point.humidity),
      timeStr: point.timestamp ? new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    }));
  }, [data]);

  const currentStage = STAGE_CONFIG[stage];

  return (
    <Card
      className="glass-panel"
      sx={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: 'var(--glass-border)',
        borderRadius: 'var(--squircle-radius)',
        color: 'white',
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardHeader
        title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Droplets className="text-purple-400" />
                <Typography variant="h6" fontWeight="bold">VPD & Clima</Typography>
            </Box>
        }
        subheader={
            <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                <span>VPD: {currentStage.minVpd}-{currentStage.maxVpd}</span>
                <span style={{ color: '#ef4444' }}>T: {currentStage.minTemp}-{currentStage.maxTemp}°C</span>
                <span style={{ color: '#3b82f6' }}>H: {currentStage.minHum}-{currentStage.maxHum}%</span>
            </Box>
        }
        action={
            <ToggleButtonGroup
                value={stage}
                exclusive
                onChange={(_, newStage) => newStage && setStage(newStage)}
                size="small"
                sx={{
                    '& .MuiToggleButton-root': {
                        color: 'rgba(255,255,255,0.5)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        '&.Mui-selected': {
                            color: 'white',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            fontWeight: 'bold'
                        }
                    }
                }}
            >
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                     <ToggleButton key={key} value={key} title={config.label}>
                         {isMobile ? config.icon : config.label}
                     </ToggleButton>
                ))}
            </ToggleButtonGroup>
        }
      />
      <CardContent sx={{ flexGrow: 1, pt: 0, pb: '16px !important', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVpd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis
                    dataKey="timeStr"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis
                    yAxisId="left"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 4]}
                    unit=" kPa"
                />
                 <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />

                {/* Target VPD Range Zone */}
                <ReferenceArea
                    yAxisId="left"
                    y1={currentStage.minVpd}
                    y2={currentStage.maxVpd}
                    fill={currentStage.color}
                    fillOpacity={0.15}
                />

                {/* Optimal Temp/Hum Lines (Optional, maybe too cluttered? Let's add reference lines for min/max if needed, but Area is better) */}

                <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="vpd"
                    name="VPD"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVpd)"
                    animationDuration={1000}
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temperature"
                    name="Temp"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    strokeOpacity={0.8}
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    name="Humedad"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    strokeOpacity={0.8}
                    strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
