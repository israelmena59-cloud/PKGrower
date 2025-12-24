import React, { useState, useMemo } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, Legend } from 'recharts';
import { Settings, TrendingUp, Activity, Sprout, Flower, Leaf } from 'lucide-react';
// import { useTheme } from '../../context/ThemeContext'; // Removed unused

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

// Standardized Colors matching Tailwind Theme
// These correspond to the CSS variables in index.css
const SERIES_COLORS = {
    temperature: '#ef4444', // destructive / red-500
    humidity: '#3b82f6',    // blue-500
    vpd: '#22c55e',         // primary / green-500
    substrateHumidity: '#f59e0b', // amber-500
    default: '#8b5cf6'      // violet-500
};

export const ChartWidget: React.FC<ChartWidgetProps & { lightSchedule?: { on: string, off: string } }> = ({
    data,
    dataKey,
    color = SERIES_COLORS.default,
    unit = '',
    onRangeChange: _onRangeChange,
    lightSchedule = { on: '06:00', off: '00:00' },
    multiSeries = false,
    chartTitle
}) => {
    // const { mode } = useTheme(); // Removed unused mode
    const [chartType, setChartType] = useState<ChartType>('area');
    const [timeRange, _setTimeRange] = useState<TimeRange>('24h');
    const [growthStage, setGrowthStage] = useState<GrowthStage>('none');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleCloseSettings = () => setAnchorEl(null);
    const handleChartTypeChange = (type: ChartType) => { setChartType(type); handleCloseSettings(); };
    const handleStageChange = (stage: GrowthStage) => { setGrowthStage(stage); handleCloseSettings(); };

    // Sanitize data: convert 0 values to null to prevent chart drops to zero
    // Ensure timestamps are valid
    const sanitizedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.map((d: any) => ({
            ...d,
            temperature: d.temperature > 0 ? d.temperature : null,
            humidity: d.humidity > 0 ? d.humidity : null,
            vpd: d.vpd > 0 ? d.vpd : null,
            substrateHumidity: d.substrateHumidity > 0 ? d.substrateHumidity : null,
            sh1: d.sh1 > 0 ? d.sh1 : null,
            sh2: d.sh2 > 0 ? d.sh2 : null,
            sh3: d.sh3 > 0 ? d.sh3 : null,
        }));
    }, [data]);

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
                fill="#22c55e"
                fillOpacity={0.1}
                stroke="none"
                label={{
                    value: "Zona Ideal",
                    position: 'insideTopRight',
                    fill: '#22c55e',
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
                    fill="#6366f1"
                    fillOpacity={0.1}
                    ifOverflow="extendDomain"
                    style={{ pointerEvents: 'none' }}
                />
            ));
        } catch (e) {
            console.warn("Error rendering night zones:", e);
            return null;
        }
    };

    // Tooltip with Tailwind classes
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const date = new Date(label);
            const timeStr = !isNaN(date.getTime())
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

            return (
                <div className="bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-3 min-w-[160px]">
                    <p className="text-muted-foreground text-xs font-semibold mb-2">
                        {timeStr}
                    </p>
                    {payload.map((p: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                                    style={{ backgroundColor: p.color, color: p.color }}
                                />
                                <span className="text-sm font-medium text-foreground capitalize">
                                    {p.name === 'vp' ? 'VPD' : p.name}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-foreground">
                                {p.value != null ? Number(p.value).toFixed(1) : '--'}
                                <span className="text-muted-foreground text-xs ml-0.5">{p.unit || unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderChart = () => {
        const commonProps = {
            data: sanitizedData,
            margin: { top: 20, right: 10, left: 0, bottom: 5 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} stroke="currentColor" />;
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
                    <Tooltip content={<CustomTooltip />} />
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
                        name="Temp"
                        stroke={SERIES_COLORS.temperature}
                        fill="url(#colorTemp)"
                        strokeWidth={2}
                        connectNulls
                        unit="°C"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="humidity"
                        name="Hum"
                        stroke={SERIES_COLORS.humidity}
                        fill="url(#colorHum)"
                        strokeWidth={2}
                        connectNulls
                        unit="%"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="vpd"
                        name="VPD"
                        stroke={SERIES_COLORS.vpd}
                        fill="url(#colorVpd)"
                        strokeWidth={3}
                        connectNulls
                        unit=" kPa"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                </AreaChart>
            );
        }

        // Single series mode (original behavior)
        const yaxis = <YAxis domain={['auto', 'auto']} hide />;
        const tooltip = <Tooltip content={<CustomTooltip />} />;
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
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
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
                        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#color${dataKey})`} strokeWidth={2} connectNulls />
                    </AreaChart>
                );
        }
    };

    if (!sanitizedData || sanitizedData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <p className="text-sm">No Data ({timeRange})</p>
                <IconButton size="small" onClick={handleOpenSettings}><Settings size={16} /></IconButton>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
             {/* Header with title and Stage Label */}
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-2">
                {chartTitle && (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {chartTitle}
                    </span>
                )}
                <div className="flex gap-2 items-center">
                    {growthStage !== 'none' && (
                         <div className="bg-primary/10 px-2 py-0.5 rounded-full flex items-center backdrop-blur-sm">
                            <span className="text-[10px] font-bold text-primary">
                                {STAGE_LABELS[growthStage]}
                            </span>
                         </div>
                    )}
                     <IconButton size="small" onClick={handleOpenSettings} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <Settings size={14} />
                     </IconButton>
                </div>
            </div>

            <div style={{ width: '100%', height: '100%', minHeight: 200, minWidth: 200 }}>
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
                    className: "bg-popover/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl",
                    sx: { minWidth: 200 }
                }}
            >
                <MenuItem disabled><span className="text-xs font-semibold text-muted-foreground">TIPO</span></MenuItem>
                <MenuItem selected={chartType === 'area'} onClick={() => handleChartTypeChange('area')} dense>
                    <ListItemIcon><Activity size={16} /></ListItemIcon> <ListItemText primary="Área" />
                </MenuItem>
                <MenuItem selected={chartType === 'line'} onClick={() => handleChartTypeChange('line')} dense>
                    <ListItemIcon><TrendingUp size={16} /></ListItemIcon> <ListItemText primary="Línea" />
                </MenuItem>
                <Divider className="my-1" />
                <MenuItem disabled><span className="text-xs font-semibold text-muted-foreground">ETAPA</span></MenuItem>
                {(['none', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as GrowthStage[]).map((stage) => (
                    <MenuItem key={stage} selected={growthStage === stage} onClick={() => handleStageChange(stage)} dense>
                           <ListItemIcon>{stage === 'veg' ? <Sprout size={16}/> : (stage === 'none' ? <Leaf size={16}/> : <Flower size={16}/>)}</ListItemIcon>
                           <ListItemText primary={STAGE_LABELS[stage]} />
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
};
