import React, { useState, useEffect } from 'react';
import { Card, Box, Typography, ButtonGroup, Button, CircularProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, ReferenceDot, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { apiClient, API_BASE_URL } from '../../api/client';

// Helper to add hours to "HH:mm" string safely
const addHours = (timeStr: string | undefined | null, hours: number) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '00:00';
    try {
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return '00:00';
        let newH = h + hours;
        if (newH >= 24) newH -= 24;
        if (newH < 0) newH += 24;
        return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } catch { return '00:00'; }
};

// Helper to check if a given time (minutes from midnight) is in light period
const isInLightPeriod = (minutesFromMidnight: number, onMinutes: number, offMinutes: number): boolean => {
    if (onMinutes < offMinutes) {
        // Normal day cycle (e.g., 06:00 ON to 00:00 OFF)
        return minutesFromMidnight >= onMinutes && minutesFromMidnight < offMinutes;
    } else {
        // Overnight cycle (e.g., 22:00 ON to 16:00 OFF next day)
        return minutesFromMidnight >= onMinutes || minutesFromMidnight < offMinutes;
    }
};

// Compute light period blocks from chart data
const computeLightBlocks = (
    data: any[],
    lightSchedule: { on: string; off: string } | null
): { start: string; end: string }[] => {
    if (!data || data.length === 0 || !lightSchedule) return [];

    try {
        const [onH, onM] = lightSchedule.on.split(':').map(Number);
        const [offH, offM] = lightSchedule.off.split(':').map(Number);
        if (isNaN(onH) || isNaN(onM) || isNaN(offH) || isNaN(offM)) return [];

        const onMinutes = onH * 60 + onM;
        const offMinutes = offH * 60 + offM;

        const blocks: { start: string; end: string }[] = [];
        let currentBlock: { start: string; end: string } | null = null;

        for (const point of data) {
            if (!point || !point.fullDate || !point.timeStr) continue;

            const date = point.fullDate instanceof Date ? point.fullDate : new Date(point.fullDate);
            if (isNaN(date.getTime())) continue;

            const minutes = date.getHours() * 60 + date.getMinutes();
            const inLight = isInLightPeriod(minutes, onMinutes, offMinutes);

            if (inLight) {
                if (!currentBlock) {
                    currentBlock = { start: point.timeStr, end: point.timeStr };
                } else {
                    currentBlock.end = point.timeStr;
                }
            } else {
                if (currentBlock) {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
            }
        }
        if (currentBlock) blocks.push(currentBlock);

        return blocks;
    } catch (e) {
        console.warn('Error computing light blocks:', e);
        return [];
    }
};

// P1/P2/P3 Colors for irrigation events
const IRRIGATION_EVENT_COLORS: Record<string, string> = {
    p1: '#22c55e', // Green
    p2: '#3b82f6', // Blue
    p3: '#a855f7', // Purple
};

// Irrigation event interface
interface IrrigationEvent {
    time: string; // "HH:mm" format
    phase: 'p1' | 'p2' | 'p3';
    vwcValue?: number; // VWC at the time of event
}

interface HistoryChartProps {
  type: 'environment' | 'substrate';
  title: string;
  targets?: {
      vwc?: number;
      dryback?: number;
  };
  data?: any[]; // Optional external data
  phase?: 'vegetative' | 'generative';
  irrigationEvents?: IrrigationEvent[]; // Optional irrigation events to display
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

const HistoryChart: React.FC<HistoryChartProps> = ({ type, title, targets, data: externalData, phase: _phase = 'vegetative', irrigationEvents: propEvents = [] }) => {
  const { mode } = useTheme();
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');
  const [internalData, setInternalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lightingSchedule, setLightingSchedule] = useState<{on: string, off: string} | null>(null);
  const [fetchedEvents, setFetchedEvents] = useState<IrrigationEvent[]>([]);

  // Merge prop events with fetched events
  const irrigationEvents = [...propEvents, ...fetchedEvents];

  // Fetch irrigation events from API (now uses auto-detection with calibration)
  useEffect(() => {
    const fetchIrrigationEvents = async () => {
      try {
        const today = selectedDate || new Date().toISOString().split('T')[0];
        // Use auto-detected events API with calibration for known 3% shots
        const calibrationStr = '01:00:3,02:00:3,03:00:3'; // Known 3% shots at these times
        const response = await fetch(`${API_BASE_URL}/api/irrigation/detected?date=${today}&calibrate=${calibrationStr}`);
        const data = await response.json();
        if (data.success && data.events) {
          setFetchedEvents(data.events.map((e: any) => ({
            time: e.timeStr,
            phase: 'p1' as 'p1' | 'p2' | 'p3', // Default to p1, could be enhanced
            vwcValue: e.avgDelta,
            percentage: e.estimatedShotPercent
          })));
        }
      } catch (e) { console.error('Error fetching irrigation events:', e); }
    };
    if (type === 'substrate') fetchIrrigationEvents();
  }, [type, selectedDate]);

  // Use external data if provided and we are in 'day'/'live' mode, otherwise valid internal data
  const rawData = (externalData && range === 'day' && isLive) ? externalData : internalData;

  // Process data for charts (Sanitization & Formatting)
  // This ensures BOTH externalData and internalData are cleaned of zeros and nulls.
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

                // Calculate if point is in light period
                let lightValue = null;
                if (lightingSchedule) {
                    const [onH, onM] = lightingSchedule.on.split(':').map(Number);
                    const [offH, offM] = lightingSchedule.off.split(':').map(Number);
                    if (!isNaN(onH) && !isNaN(onM) && !isNaN(offH) && !isNaN(offM)) {
                        const onMinutes = onH * 60 + onM;
                        const offMinutes = offH * 60 + offM;
                        const pointMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
                        const inLight = isInLightPeriod(pointMinutes, onMinutes, offMinutes);
                        lightValue = inLight ? 100 : null; // 100 during light, null during dark
                    }
                }

                // Convert 0 or NaN to null (prevents chart drops)
                const safeT = (t > 0 && !isNaN(t)) ? t : null;
                const safeH = (h > 0 && !isNaN(h)) ? h : null;
                const safeS = (s > 0 && !isNaN(s)) ? s : null;

                return {
                  ...d,
                  timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  fullDate: dateObj,
                  lightValue,

                  temperature: safeT,
                  humidity: safeH,
                  substrateHumidity: safeS,
                  sh1: (sh1 > 0 && !isNaN(sh1)) ? sh1 : null,
                  sh2: (sh2 > 0 && !isNaN(sh2)) ? sh2 : null,
                  sh3: (sh3 > 0 && !isNaN(sh3)) ? sh3 : null,

                  dp: (safeT && safeH) ? calculateDP(safeT, safeH) : null,
                  vpd: (d.vpd && Number(d.vpd) > 0) ? Number(d.vpd) : ((safeT && safeH) ? calculateVPD(safeT, safeH) : null)
                };
            } catch (err) {
                console.warn("Skipping malformed data point", d);
                return null;
            }
        })
        .filter(Boolean) // Remove nulls from map errors
        // CRITICAL: Filter out records where primary sensors are missing to prevent Area fill drops
        .filter(d => {
            // For environment chart: need temp OR humidity
            // For substrate chart: need substrateHumidity
            // Keep record if it has at least one valid sensor reading
            return d.temperature !== null || d.humidity !== null || d.substrateHumidity !== null;
        });
  }, [rawData, lightingSchedule]);

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
          console.log('[DEBUG-LIGHT] Settings received:', settings?.lighting);
          // Show light overlay whenever onTime/offTime are configured (regardless of enabled flag)
          if (settings?.lighting?.onTime && settings?.lighting?.offTime) {
              const { onTime, offTime } = settings.lighting;
              console.log(`[DEBUG-LIGHT] onTime=${onTime}, offTime=${offTime}`);
              // Validate format HH:mm
              if (/^\d{2}:\d{2}$/.test(onTime) && /^\d{2}:\d{2}$/.test(offTime)) {
                  console.log('[DEBUG-LIGHT] Setting lightingSchedule state');
                  setLightingSchedule({
                      on: onTime,
                      off: offTime
                  });
              } else {
                  console.log('[DEBUG-LIGHT] Invalid time format');
              }
          } else {
              console.log('[DEBUG-LIGHT] No onTime/offTime in settings');
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

  // Ideal ranges for growers (vegetative stage as default)
  const idealRanges = {
    temperature: [24, 28],
    humidity: [65, 80],
    vpd: [0.4, 0.8],
    substrateHumidity: [45, 65],
  };

  // Get grower recommendation based on value
  const getRecommendation = (key: string, value: number): string | null => {
    const range = idealRanges[key as keyof typeof idealRanges];
    if (!range) return null;
    const [min, max] = range;

    if (value < min) {
      switch(key) {
        case 'temperature': return '❄️ Temperatura baja - considera aumentar calefacción';
        case 'humidity': return '💨 Humedad baja - activa humidificador';
        case 'vpd': return '🌿 VPD bajo - reduce humedad o aumenta temp';
        case 'substrateHumidity': return '💧 Sustrato seco - programar riego';
        default: return null;
      }
    }
    if (value > max) {
      switch(key) {
        case 'temperature': return '🔥 Temperatura alta - mejora ventilación';
        case 'humidity': return '💦 Humedad alta - activa deshumidificador';
        case 'vpd': return '⚠️ VPD alto - aumenta humedad';
        case 'substrateHumidity': return '🌊 Sustrato saturado - reduce riego';
        default: return null;
      }
    }
    return '✓ Óptimo';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box sx={{
            bgcolor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            p: 2,
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
            minWidth: 200
        }}>
          <Typography variant="caption" sx={{
            color: isDark ? 'rgba(235, 235, 245, 0.6)' : 'rgba(60, 60, 67, 0.6)',
            display: 'block',
            mb: 1.5,
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            📅 {d.dateStr} • {d.timeStr}
          </Typography>

          {payload.map((p: any) => {
            const recommendation = p.value !== null ? getRecommendation(p.dataKey, p.value) : null;
            const isOptimal = recommendation === '✓ Óptimo';

            return (
              <Box key={p.name} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: p.color,
                      boxShadow: `0 0 8px ${p.color}`
                    }} />
                    <Typography variant="body2" sx={{
                      color: isDark ? '#fff' : '#000',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}>
                      {p.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{
                    color: isDark ? '#fff' : '#000',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    {p.value !== null ? `${typeof p.value === 'number' ? p.value.toFixed(1) : p.value}${p.unit || ''}` : '--'}
                  </Typography>
                </Box>
                {recommendation && !isOptimal && (
                  <Typography sx={{
                    fontSize: '0.7rem',
                    color: '#FF9500',
                    mt: 0.5,
                    pl: 2.5,
                    fontWeight: 500
                  }}>
                    {recommendation}
                  </Typography>
                )}
                {isOptimal && (
                  <Typography sx={{
                    fontSize: '0.7rem',
                    color: '#34C759',
                    mt: 0.5,
                    pl: 2.5,
                    fontWeight: 500
                  }}>
                    {recommendation}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{
        p: 3,
        borderRadius: '20px',
        background: isDark
          ? 'rgba(28, 28, 30, 0.72)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: isDark
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.32)'
          : '0 4px 24px rgba(0, 0, 0, 0.08)'
    }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'start', md: 'center' }, mb: 3, gap: 2 }}>
            <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ color: textColor }}>
                    {title}
                </Typography>
                {/* Current values summary for environment charts */}
                {type === 'environment' && chartData.length > 0 && (() => {
                    const latest = chartData[chartData.length - 1];
                    return (
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            {latest?.temperature && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                                    <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>{latest.temperature.toFixed(1)}°C</Typography>
                                </Box>
                            )}
                            {latest?.humidity && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>{latest.humidity.toFixed(0)}%</Typography>
                                </Box>
                            )}
                            {latest?.vpd && (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>{latest.vpd.toFixed(2)} kPa</Typography>
                                </Box>
                            )}
                        </Box>
                    );
                })()}
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
                <ResponsiveContainer width="100%" height={300} minHeight={300}>
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
                            <linearGradient id="colorLight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fef08a" stopOpacity={isDark ? 0.4 : 0.6}/>
                                <stop offset="95%" stopColor="#fef08a" stopOpacity={isDark ? 0.1 : 0.2}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

                        {/* Light Period Background - Area using lightValue data */}
                        {range === 'day' && lightingSchedule && (
                            <Area
                                yAxisId="left"
                                type="stepAfter"
                                dataKey="lightValue"
                                name="Luz"
                                stroke="#f59e0b"
                                strokeWidth={0}
                                fill="url(#colorLight)"
                                connectNulls={false}
                                isAnimationActive={false}
                                legendType="none"
                            />
                        )}

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
                        <Legend
                            verticalAlign="top"
                            height={36}
                            wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                            formatter={(value) => {
                                const labels: Record<string, string> = {
                                    temperature: 'Temp',
                                    humidity: 'Humedad',
                                    dp: 'Punto Rocío',
                                    vpd: 'VPD',
                                    substrateHumidity: 'Promedio',
                                    sh1: 'Sensor 1',
                                    sh2: 'Sensor 2',
                                    sh3: 'Sensor 3'
                                };
                                return labels[value] || value;
                            }}
                        />

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

                                {/* Irrigation Event Markers (Auto-detected with shot %) */}
                                {type === 'substrate' && irrigationEvents && irrigationEvents.length > 0 && irrigationEvents.map((event, idx) => (
                                    <ReferenceDot
                                        key={`irrigation-${idx}`}
                                        yAxisId="left"
                                        x={event.time}
                                        y={event.vwcValue ? (targets?.vwc || 50) + event.vwcValue : targets?.vwc || 50}
                                        r={10}
                                        fill="#3b82f6"
                                        stroke="#fff"
                                        strokeWidth={2}
                                        label={{
                                            value: event.percentage ? `${event.percentage}%` : '💧',
                                            position: 'top',
                                            fill: '#3b82f6',
                                            fontSize: 10,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                ))}
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
