import React, { useState, useEffect } from 'react';
import { Card, Box, Typography, ButtonGroup, Button, CircularProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';

// Helper to add hours to "HH:mm" string
const addHours = (timeStr: string, hours: number) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    let newH = h + hours;
    if (newH >= 24) newH -= 24;
    if (newH < 0) newH += 24;
    return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

interface HistoryChartProps {
  type: 'environment' | 'substrate';
  title: string;
  targets?: {
      vwc?: number;
      dryback?: number;
  };
  data?: any[]; // Optional external data
  phase?: 'vegetative' | 'generative';
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

const HistoryChart: React.FC<HistoryChartProps> = ({ type, title, targets, data: externalData, phase = 'vegetative' }) => {
  const { mode } = useTheme();
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  const [internalData, setInternalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lightingSchedule, setLightingSchedule] = useState<{on: string, off: string} | null>(null);

  // Use external data if provided and we are in 'day'/'live' mode, otherwise valid internal data
  const rawData = (externalData && range === 'day' && isLive) ? externalData : internalData;

  // Process data for charts (Sanitization & Formatting)
  // This ensures BOTH externalData and internalData are cleaned of zeros.
  // Process data for charts (Sanitization & Formatting)
  const chartData = React.useMemo(() => {
    if (!Array.isArray(rawData)) return [];

    return rawData
        .filter(d => d && typeof d === 'object' && d.timestamp) // Filter invalid objects
        .map((d: any) => {
            try {
                const t = Number(d.temperature);
                const h = Number(d.humidity);
                const s = Number(d.substrateHumidity);
                const sh1 = Number(d.sh1);
                const sh2 = Number(d.sh2);
                const sh3 = Number(d.sh3);

                const dateObj = new Date(d.timestamp);
                if (isNaN(dateObj.getTime())) return null; // Skip invalid dates

                return {
                  ...d,
                  timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  fullDate: dateObj,

                  // Map 0 to null to prevent drops/spikes (converts falsy 0 to null)
                  temperature: t > 0 ? t : null,
                  humidity: h > 0 ? h : null,
                  substrateHumidity: s > 0 ? s : null,
                  sh1: sh1 > 0 ? sh1 : null,
                  sh2: sh2 > 0 ? sh2 : null,
                  sh3: sh3 > 0 ? sh3 : null,

                  dp: (t > 0 && h > 0) ? calculateDP(t, h) : null,
                  vpd: (d.vpd && Number(d.vpd) > 0) ? Number(d.vpd) : ((t > 0 && h > 0) ? calculateVPD(t, h) : null)
                };
            } catch (err) {
                console.warn("Skipping malformed data point", d);
                return null;
            }
        })
        .filter(Boolean); // Remove nulls from map errors
  }, [rawData]);

  useEffect(() => {
    // Only fetch if we DON'T have external data OR if we need specific range data (week/month)
    if (!externalData || range !== 'day' || !isLive) {
        fetchHistory();
    }
    fetchSettings();
// eslint-disable-next-line
  }, [range, isLive, selectedDate, externalData]);

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

      // Store raw data, let usage memo handle sanitization
      setInternalData(histDataRaw || []);

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

        <Box sx={{ height: 300, minHeight: 300, width: '100%' }}>
            {loading ? (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={30} />
                </Box>
            ) : chartData.length === 0 ? (
                <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                     <Typography variant="body2" color="text.secondary">Esperando datos reales...</Typography>
                     <Typography variant="caption" color="text.disabled">(El historial se genera cada 60s)</Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                                <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={2} fill="url(#colorTemp)" unit="°C" connectNulls />
                                <Area yAxisId="left" type="monotone" dataKey="humidity" name="RH" stroke="#3b82f6" strokeWidth={2} fill="url(#colorHum)" unit="%" connectNulls />
                                <Area yAxisId="left" type="monotone" dataKey="dp" name="DP" stroke="#8b5cf6" strokeWidth={2} fill="none" unit="°C" connectNulls />
                                <Area yAxisId="right" type="monotone" dataKey="vpd" name="VPD" stroke="#10b981" strokeWidth={2} fill="url(#colorVpd)" unit=" kPa" connectNulls />
                            </>
                        )}

                        {type === 'substrate' && (
                            <>
                                {/* Average (Area) */}
                                <Area yAxisId="left" type="monotone" dataKey="substrateHumidity" name="Promedio" stroke="#22c55e" strokeWidth={3} fill="url(#colorSub)" unit="%" connectNulls />

                                {/* Individual Sensors (Lines) */}
                                <Area yAxisId="left" type="monotone" dataKey="sh1" name="Sensor 1" stroke="#06b6d4" strokeWidth={2} fill="none" unit="%" strokeDasharray="5 5" connectNulls />
                                <Area yAxisId="left" type="monotone" dataKey="sh2" name="Sensor 2" stroke="#d946ef" strokeWidth={2} fill="none" unit="%" strokeDasharray="5 5" connectNulls />
                                <Area yAxisId="left" type="monotone" dataKey="sh3" name="Sensor 3" stroke="#eab308" strokeWidth={2} fill="none" unit="%" strokeDasharray="5 5" connectNulls />

                                {/* Dynamic Targets */}
                                {targets?.vwc && (
                                    <ReferenceLine yAxisId="left" y={targets.vwc} label={{ position: 'right', value: `Target: ${targets.vwc}%`, fill: '#22c55e', fontSize: 10 }} stroke="#22c55e" strokeDasharray="3 3" />
                                )}
                                {targets?.vwc && targets?.dryback && (
                                    <ReferenceLine yAxisId="left" y={targets.vwc - targets.dryback} label={{ position: 'right', value: `Dryback: -${targets.dryback}%`, fill: '#ef4444', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                                )}

                                {/* P1 / P2 / P3 Annotations (Only for Substrate & Daily view & Schedule present) */}
                                {type === 'substrate' && range === 'day' && lightingSchedule && (
                                    <>
                                        {/* P1 Start: Lights On + 1h */}
                                        <ReferenceLine yAxisId="left" x={addHours(lightingSchedule.on, 1)} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'P1 Start', position: 'insideTopLeft', fill: '#22c55e', fontSize: 10 }} />

                                        {/* P2 Start: Lights On + 3h */}
                                        <ReferenceLine yAxisId="left" x={addHours(lightingSchedule.on, 3)} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'P2 Maint', position: 'insideTopLeft', fill: '#3b82f6', fontSize: 10 }} />

                                        {/* P3 Start: Lights Off - 2h */}
                                        <ReferenceLine yAxisId="left" x={addHours(lightingSchedule.off, -2)} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'P3 Stop', position: 'insideTopLeft', fill: '#a855f7', fontSize: 10 }} />
                                    </>
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
