import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, Legend } from 'recharts';
import { Settings, TrendingUp, Activity, Sprout, Flower, Leaf } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ChartWidgetProps {
    data: any[];
    dataKey: string;
    color?: string;
    unit?: string;
    onRangeChange?: (range: string) => void;
    // Multi-series mode for showing temp, humidity, vpd together
    multiSeries?: boolean;
    chartTitle?: string;
}

type ChartType = 'area' | 'line' | 'bar';
type TimeRange = '24h' | '7d' | '30d';
type GrowthStage = 'veg' | 'flower_early' | 'flower_mid' | 'flower_late' | 'none';

const STAGE_ZONES: Record<GrowthStage, Record<string, [number, number]>> = {
    'veg': {
        'vpd': [0.4, 0.8],
        'humidity': [65, 80],
        'temperature': [24, 28],
        'substrateHumidity': [45, 65]
    },
    'flower_early': {
        'vpd': [0.8, 1.2],
        'humidity': [55, 70],
        'temperature': [22, 26],
        'substrateHumidity': [35, 55]
    },
    'flower_mid': {
        'vpd': [1.2, 1.6],
        'humidity': [45, 60],
        'temperature': [20, 25],
        'substrateHumidity': [30, 50]
    },
    'flower_late': {
        'vpd': [1.4, 1.8],
        'humidity': [35, 50],
        'temperature': [18, 24],
        'substrateHumidity': [20, 40]
    },
    'none': {}
};

const STAGE_LABELS: Record<GrowthStage, string> = {
    'veg': 'Vegetativo',
    'flower_early': 'Floración Temprana',
    'flower_mid': 'Floración Media',
    'flower_late': 'Floración Tardía',
    'none': 'Sin Etapa'
};

// iOS Colors
const SERIES_COLORS = {
    temperature: '#FF3B30', // iOS Red
    humidity: '#007AFF',    // iOS Blue
    vpd: '#34C759',         // iOS Green
    dp: '#AF52DE',          // iOS Purple
    substrateHumidity: '#5AC8FA' // iOS Teal
};

export const ChartWidget: React.FC<ChartWidgetProps & { lightSchedule?: { on: string, off: string } }> = ({
    data,
    dataKey,
    color = '#8884d8',
    unit = '',
    onRangeChange: _onRangeChange,
    lightSchedule = { on: '06:00', off: '00:00' },
    multiSeries = false,
    chartTitle
}) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const [chartType, setChartType] = useState<ChartType>('area');
    const [timeRange, _setTimeRange] = useState<TimeRange>('24h');
    const [growthStage, setGrowthStage] = useState<GrowthStage>('none');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Process and validate data
    const processedData = React.useMemo(() => {
        if (!data || !Array.isArray(data)) {
            console.log('[ChartWidget] No data or invalid data:', data);
            return [];
        }
        // Filter out entries without timestamp and ensure numeric values
        const valid = data.filter(d => d && d.timestamp).map(d => ({
            ...d,
            temperature: typeof d.temperature === 'number' ? d.temperature : null,
            humidity: typeof d.humidity === 'number' ? d.humidity : null,
            vpd: typeof d.vpd === 'number' ? d.vpd : null
        }));
        console.log('[ChartWidget] Processed data count:', valid.length, 'from', data.length);
        return valid;
    }, [data]);

    const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleCloseSettings = () => setAnchorEl(null);
    const handleChartTypeChange = (type: ChartType) => { setChartType(type); handleCloseSettings(); };
    const handleStageChange = (stage: GrowthStage) => { setGrowthStage(stage); handleCloseSettings(); };

    const renderReferenceZones = () => {
        if (growthStage === 'none') return null;
        const zones = STAGE_ZONES[growthStage];
        let zoneKey = dataKey;
        if (!zones[zoneKey]) return null;

        const [min, max] = zones[zoneKey];

        return (
            <ReferenceArea
                y1={min}
                y2={max}
                fill="#34C759"
                fillOpacity={0.1}
                stroke="none"
                label={{
                    value: "Zona Ideal",
                    position: 'insideTopRight',
                    fill: '#34C759',
                    fontSize: 10,
                    opacity: 0.8
                }}
            />
        );
    };

    const renderNightZones = () => {
        if (!data || !Array.isArray(data) || data.length === 0) return null;
        if (!lightSchedule || !lightSchedule.on || !lightSchedule.off) return null;

        try {
            const [onH, onM] = lightSchedule.on.split(':').map(Number);
            const [offH, offM] = lightSchedule.off.split(':').map(Number);
            if (isNaN(onH) || isNaN(onM) || isNaN(offH) || isNaN(offM)) return null;

            const onMinutes = onH * 60 + onM;
            const offMinutes = offH * 60 + offM;

            const isNight = (dateStr: string | undefined) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                const minutes = d.getHours() * 60 + d.getMinutes();
                if (onMinutes < offMinutes) {
                    return minutes < onMinutes || minutes >= offMinutes;
                } else {
                    return minutes >= offMinutes && minutes < onMinutes;
                }
            };

            const nightBlocks: { start: string, end: string }[] = [];
            let currentBlock: { start: string, end: string } | null = null;

            for (let i = 0; i < data.length; i++) {
                const point = data[i];
                if (!point || !point.timestamp) continue;

                const night = isNight(point.timestamp);

                if (night) {
                    if (!currentBlock) {
                        currentBlock = { start: point.timestamp, end: point.timestamp };
                    } else {
                        currentBlock.end = point.timestamp;
                    }
                } else {
                    if (currentBlock) {
                        nightBlocks.push(currentBlock);
                        currentBlock = null;
                    }
                }
            }
            if (currentBlock) nightBlocks.push(currentBlock);

            return nightBlocks.map((block, i) => (
                 <ReferenceArea
                    key={`night-${i}`}
                    x1={block.start}
                    x2={block.end}
                    fill="#5856D6"
                    fillOpacity={0.15}
                    ifOverflow="extendDomain"
                    style={{ pointerEvents: 'none' }}
                />
            ));
        } catch (e) {
            console.warn("Error rendering night zones:", e);
            return null;
        }
    };

    // Multi-series tooltip with Fluid Glass
    const MultiSeriesTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const timeStr = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
                <Box sx={{
                    bgcolor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    p: 1.5,
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '12px',
                    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
                    minWidth: 160
                }}>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        display: 'block',
                        mb: 1,
                        fontWeight: 600
                    }}>
                        🕐 {timeStr}
                    </Typography>
                    {payload.map((p: any) => (
                        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                    {p.name}
                                </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
                                {p.value !== null && p.value !== undefined ? (typeof p.value === 'number' ? p.value.toFixed(1) : p.value) : '--'}{p.unit || ''}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            );
        }
        return null;
    };

    const renderChart = () => {
        const commonProps = {
            data: processedData,
            margin: { top: 20, right: 10, left: 0, bottom: 5 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />;
        const xaxis = <XAxis dataKey="timestamp" hide />;
        const nightZones = renderNightZones();

        // Multi-series mode: show temp, humidity, VPD together
        if (multiSeries) {
            return (
                <AreaChart {...commonProps}>
                    <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SERIES_COLORS.temperature} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={SERIES_COLORS.temperature} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SERIES_COLORS.humidity} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={SERIES_COLORS.humidity} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVpd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SERIES_COLORS.vpd} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={SERIES_COLORS.vpd} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    {grid}
                    {nightZones}
                    {xaxis}
                    <YAxis yAxisId="left" domain={['auto', 'auto']} hide />
                    <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} hide />
                    <Tooltip content={<MultiSeriesTooltip />} />
                    <Legend
                        verticalAlign="top"
                        height={30}
                        wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                        formatter={(value) => {
                            const labels: Record<string, string> = {
                                temperature: 'Temp °C',
                                humidity: 'Humedad %',
                                vpd: 'VPD kPa'
                            };
                            return labels[value] || value;
                        }}
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="temperature"
                        name="temperature"
                        stroke={SERIES_COLORS.temperature}
                        fill="url(#colorTemp)"
                        strokeWidth={2}
                        connectNulls
                        unit="°C"
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="humidity"
                        name="humidity"
                        stroke={SERIES_COLORS.humidity}
                        fill="url(#colorHum)"
                        strokeWidth={2}
                        connectNulls
                        unit="%"
                    />
                    <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="vpd"
                        name="vpd"
                        stroke={SERIES_COLORS.vpd}
                        fill="url(#colorVpd)"
                        strokeWidth={3}
                        connectNulls
                        unit=" kPa"
                    />
                </AreaChart>
            );
        }

        // Single series mode (original behavior)
        const yaxis = <YAxis domain={['auto', 'auto']} hide />;
        const tooltip = (
            <Tooltip
                contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255,255,255,0.98)',
                    color: isDark ? '#fff' : '#000',
                    backdropFilter: 'blur(20px)'
                }}
                formatter={(value: any) => [`${value}${unit}`, dataKey]}
                labelFormatter={() => ''}
            />
        );
        const refZones = renderReferenceZones();

        switch (chartType) {
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        {grid}
                        {nightZones}
                        {refZones}
                        {xaxis}
                        {yaxis}
                        {tooltip}
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
                    </LineChart>
                );
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                         {grid} {refZones} {xaxis} {yaxis} {tooltip}
                         <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
            case 'area':
            default:
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        {grid}
                        {refZones}
                        {xaxis}
                        {yaxis}
                        {tooltip}
                        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#color${dataKey})`} strokeWidth={2} />
                    </AreaChart>
                );
        }
    };

    if (!processedData || processedData.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">No Data ({timeRange})</Typography>
                <IconButton size="small" onClick={handleOpenSettings}><Settings size={16} /></IconButton>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
             {/* Header with title and Stage Label */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                {chartTitle && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                        {chartTitle}
                    </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {growthStage !== 'none' && (
                         <Box sx={{ bgcolor: 'rgba(52, 199, 89, 0.15)', px: 1, py: 0.3, borderRadius: '8px', display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                            <Typography variant="caption" sx={{ color: '#34C759', fontWeight: 700, fontSize: '0.6rem' }}>
                                {STAGE_LABELS[growthStage]}
                            </Typography>
                         </Box>
                    )}
                     <IconButton size="small" onClick={handleOpenSettings} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <Settings size={14} />
                     </IconButton>
                </Box>
            </Box>

            <div style={{ width: '100%', height: '100%', minHeight: 200, minWidth: 200, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* Settings Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseSettings}
                PaperProps={{
                    sx: {
                        minWidth: 200,
                        maxHeight: 300,
                        bgcolor: 'background.paper',
                        backgroundImage: 'none',
                        borderRadius: '16px',
                        backdropFilter: 'blur(20px)'
                    }
                }}
            >
                <MenuItem disabled><Typography variant="caption" color="text.secondary">TIPO</Typography></MenuItem>
                <MenuItem selected={chartType === 'area'} onClick={() => handleChartTypeChange('area')} dense>
                    <ListItemIcon><Activity size={16} /></ListItemIcon> <ListItemText primary="Área" />
                </MenuItem>
                <MenuItem selected={chartType === 'line'} onClick={() => handleChartTypeChange('line')} dense>
                    <ListItemIcon><TrendingUp size={16} /></ListItemIcon> <ListItemText primary="Línea" />
                </MenuItem>
                <Divider />
                <MenuItem disabled><Typography variant="caption" color="text.secondary">ETAPA</Typography></MenuItem>
                {(['none', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as GrowthStage[]).map((stage) => (
                    <MenuItem key={stage} selected={growthStage === stage} onClick={() => handleStageChange(stage)} dense>
                           <ListItemIcon>{stage === 'veg' ? <Sprout size={16}/> : (stage === 'none' ? <Leaf size={16}/> : <Flower size={16}/>)}</ListItemIcon>
                           <ListItemText primary={STAGE_LABELS[stage]} />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};
