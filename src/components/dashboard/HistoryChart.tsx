import React, { useState, useEffect } from 'react';
import { Card, Box, Typography, ButtonGroup, Button, CircularProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';

interface HistoryChartProps {
  type: 'environment' | 'substrate';
  title: string;
  targets?: {
      vwc?: number;
      dryback?: number;
  };
}

const HistoryChart: React.FC<HistoryChartProps> = ({ type, title, targets }) => {
  const { mode } = useTheme();
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lightingSchedule, setLightingSchedule] = useState<{on: string, off: string} | null>(null);

  useEffect(() => {
    fetchHistory();
    fetchSettings();
// eslint-disable-next-line
  }, [range, isLive, selectedDate]);

  const fetchSettings = async () => {
      try {
          const settings = await apiClient.getSettings();
          if (settings?.lighting?.enabled && settings?.lighting?.onTime && settings?.lighting?.offTime) {
              setLightingSchedule({
                  on: settings.lighting.onTime,
                  off: settings.lighting.offTime
              });
          }
      } catch (e) { console.error("Error fetching lighting settings", e); }
  }

  const calculateDP = (T: number, RH: number) => {
      // Magnus formula
      const a = 17.27;
      const b = 237.7;
      const alpha = ((a * T) / (b + T)) + Math.log(RH / 100.0);
      return (b * alpha) / (a - alpha);
  };

  const calculateVPD = (T: number, RH: number) => {
      // VPD = SVP * (1 - RH/100)
      const svp = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
      return svp * (1 - (RH / 100));
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let histDataRaw;

      if (isLive) {
          histDataRaw = await apiClient.getHistoryRange(range);
      } else {
          // Custom Date Logic
          const start = new Date(selectedDate);
          const end = new Date(selectedDate);

          if (range === 'day') {
              start.setHours(0,0,0,0);
              end.setHours(23,59,59,999);
          } else if (range === 'week') {
              start.setHours(0,0,0,0);
              end.setDate(end.getDate() + 7);
              end.setHours(23,59,59,999);
          } else {
              start.setHours(0,0,0,0);
              end.setDate(end.getDate() + 30);
              end.setHours(23,59,59,999);
          }
          histDataRaw = await apiClient.getHistoryDateRange(start.toISOString(), end.toISOString());
      }

      let histData = histDataRaw;

      // Filter invalid data
      histData = histData.filter((d: any) => d && d.timestamp);

      // Process dates for easier chart reading
      histData = histData.map((d: any) => ({
          ...d,
          timeStr: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date(d.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          fullDate: new Date(d.timestamp),
          // Ensure numbers
          temperature: Number(d.temperature) || 0,
          humidity: Number(d.humidity) || 0,
          substrateHumidity: Number(d.substrateHumidity) || 0,
          dp: calculateDP(Number(d.temperature) || 0, Number(d.humidity) || 0),
          vpd: d.vpd ? Number(d.vpd) : calculateVPD(Number(d.temperature) || 0, Number(d.humidity) || 0)
      }));

      setData(histData);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDark = mode === 'dark';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box sx={{
            bgcolor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
            p: 1.5,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            boxShadow: 3
        }}>
          <Typography variant="caption" sx={{ color: isDark? 'gray' : 'text.secondary', display: 'block', mb: 1 }}>
            {d.dateStr} {d.timeStr}
          </Typography>

          {payload.map((p: any) => (
              <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                  <Typography variant="body2" sx={{ color: isDark? 'white' : 'black', fontWeight: 'bold' }}>
                      {p.name}: {p.value}{p.unit}
                  </Typography>
              </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{
        p: 3,
        borderRadius: 4,
        background: isDark ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'white',
        boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'start', md: 'center' }, mb: 3, gap: 2 }}>
            <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ color: textColor }}>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Modo:</Typography>
                        <ButtonGroup size="small">
                            <Button
                                variant={isLive ? "contained" : "outlined"}
                                color={isLive ? "success" : "inherit"}
                                onClick={() => setIsLive(true)}
                                sx={{ py: 0.5, fontSize: '0.75rem' }}
                            >
                                En Vivo
                            </Button>
                            <Button
                                variant={!isLive ? "contained" : "outlined"}
                                color={!isLive ? "primary" : "inherit"}
                                onClick={() => setIsLive(false)}
                                sx={{ py: 0.5, fontSize: '0.75rem' }}
                            >
                                Histórico
                            </Button>
                        </ButtonGroup>
                    </Box>

                    {!isLive && (
                         <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                background: isDark ? '#334155' : '#f8fafc',
                                color: textColor
                            }}
                         />
                    )}
                </Box>
            </Box>

            <ButtonGroup size="small" variant="contained" sx={{ boxShadow: 'none' }}>
                {['day', 'week', 'month'].map((r) => (
                    <Button
                        key={r}
                        onClick={() => setRange(r as any)}
                        sx={{
                            textTransform: 'capitalize',
                            bgcolor: range === r ? (type === 'environment' ? 'primary.main' : 'success.main') : (isDark ? 'rgba(255,255,255,0.05)' : 'grey.100'),
                            color: range === r ? 'white' : textColor,
                            borderColor: isDark ? 'rgba(255,255,255,0.1) !important' : 'grey.300 !important',
                            '&:hover': {
                                bgcolor: range === r ? (type === 'environment' ? 'primary.dark' : 'success.dark') : (isDark ? 'rgba(255,255,255,0.1)' : 'grey.200')
                            }
                        }}
                    >
                        {r === 'day' ? 'Día' : r === 'week' ? 'Semana' : 'Mes'}
                    </Button>
                ))}
            </ButtonGroup>
        </Box>

        <Box sx={{ height: 300, width: '100%' }}>
            {loading ? (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={30} />
                </Box>
            ) : (
                <ResponsiveContainer>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorVpd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey={range === 'day' ? "timeStr" : "dateStr"}
                            stroke={textColor}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis yAxisId="left" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Light Regions Background (Simplified for 'day' view) */}
                        {range === 'day' && lightingSchedule && (
                             <ReferenceArea
                                yAxisId="left"
                                x1={lightingSchedule.on}
                                x2={lightingSchedule.off}
                                fill="#fef08a"
                                fillOpacity={isDark ? 0.1 : 0.3}
                             />
                        )}

                        {type === 'environment' && (
                            <>
                                <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={2} fill="url(#colorTemp)" unit="°C" />
                                <Area yAxisId="left" type="monotone" dataKey="humidity" name="RH" stroke="#3b82f6" strokeWidth={2} fill="url(#colorHum)" unit="%" />
                                <Area yAxisId="left" type="monotone" dataKey="dp" name="DP" stroke="#8b5cf6" strokeWidth={2} fill="none" unit="°C" />
                                <Area yAxisId="right" type="monotone" dataKey="vpd" name="VPD" stroke="#10b981" strokeWidth={2} fill="url(#colorVpd)" unit=" kPa" />
                            </>
                        )}

                        {type === 'substrate' && (
                            <>
                                <Area yAxisId="left" type="monotone" dataKey="substrateHumidity" name="Humedad Sustrato" stroke="#22c55e" strokeWidth={2} fill="url(#colorSub)" unit="%" />

                                {/* Dynamic Targets */}
                                {targets?.vwc && (
                                    <ReferenceLine yAxisId="left" y={targets.vwc} label={{ position: 'right', value: `Target: ${targets.vwc}%`, fill: '#22c55e', fontSize: 10 }} stroke="#22c55e" strokeDasharray="3 3" />
                                )}
                                {targets?.vwc && targets?.dryback && (
                                    <ReferenceLine yAxisId="left" y={targets.vwc - targets.dryback} label={{ position: 'right', value: `Dryback: -${targets.dryback}%`, fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                                )}
                            </>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </Box>
    </Card>
  );
};

export default HistoryChart;
