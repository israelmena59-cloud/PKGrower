import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from 'recharts';
import { Settings, TrendingUp, Activity, Sprout, Flower, Leaf } from 'lucide-react';

interface ChartWidgetProps {
    data: any[];
    dataKey: string;
    color?: string;
    unit?: string;
    onRangeChange?: (range: string) => void;
}

type ChartType = 'area' | 'line' | 'bar';
type TimeRange = '24h' | '7d' | '30d';
type GrowthStage = 'veg' | 'flower_early' | 'flower_mid' | 'flower_late' | 'none';

const STAGE_ZONES: Record<GrowthStage, Record<string, [number, number]>> = {
    'veg': {
        'vpd': [0.4, 0.8], // Low VPD for Veg
        'humidity': [65, 80],
        'temperature': [24, 28],
        'substrateHumidity': [45, 65] // Wet
    },
    'flower_early': {
        'vpd': [0.8, 1.2],
        'humidity': [55, 70],
        'temperature': [22, 26],
        'substrateHumidity': [35, 55] // Generative
    },
    'flower_mid': {
        'vpd': [1.2, 1.6],
        'humidity': [45, 60],
        'temperature': [20, 25],
        'substrateHumidity': [30, 50]
    },
    'flower_late': {
        'vpd': [1.4, 1.8], // High drift for maturation
        'humidity': [35, 50],
        'temperature': [18, 24],
        'substrateHumidity': [20, 40] // Ripening
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

export const ChartWidget: React.FC<ChartWidgetProps & { lightSchedule?: { on: string, off: string } }> = ({
    data,
    dataKey,
    color = '#8884d8',
    unit = '',
    onRangeChange: _onRangeChange,
    lightSchedule = { on: '06:00', off: '00:00' } // Default 18/6
}) => {
    // ... state ...
    const [chartType, setChartType] = useState<ChartType>('area');
    const [timeRange, _setTimeRange] = useState<TimeRange>('24h');
    const [growthStage, setGrowthStage] = useState<GrowthStage>('none');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // ... handlers ...
    const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleCloseSettings = () => setAnchorEl(null);
    // ... other handlers unchanged ...
    const handleChartTypeChange = (type: ChartType) => { setChartType(type); handleCloseSettings(); };
    const handleStageChange = (stage: GrowthStage) => { setGrowthStage(stage); handleCloseSettings(); };


    const renderReferenceZones = () => {
        if (growthStage === 'none') return null;
        const zones = STAGE_ZONES[growthStage];
        let zoneKey = dataKey; // simple map
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
        if (typeof lightSchedule.on !== 'string' || typeof lightSchedule.off !== 'string') return null;

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
                    fill="#000"
                    fillOpacity={0.2}
                    ifOverflow="extendDomain"
                    style={{ pointerEvents: 'none' }}
                />
            ));
        } catch (e) {
            console.warn("Error rendering night zones:", e);
            return null;
        }
    };

    const renderChart = () => {
        const commonProps = {
            data: data,
            margin: { top: 5, right: 0, left: 0, bottom: 5 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />;
        const xaxis = <XAxis dataKey="timestamp" hide />; // using timestamp as key
        const yaxis = <YAxis domain={['auto', 'auto']} hide />;
        const tooltip = (
            <Tooltip
                contentStyle={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
                formatter={(value: any) => [`${value}${unit}`, dataKey]}
                labelFormatter={() => ''}
            />
        );
        const refZones = renderReferenceZones();
        const nightZones = renderNightZones();

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
                // ... same ...
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

    // ... rest of render ... (menu, etc)
    if (!data || data.length === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.disabled', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">No Data ({timeRange})</Typography>
                <IconButton size="small" onClick={handleOpenSettings}><Settings size={16} /></IconButton>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
             {/* Header with Stage Label */}
            <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10, display: 'flex', gap: 1, alignItems: 'center' }}>
                {growthStage !== 'none' && (
                     <Box sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', px: 1, py: 0.5, borderRadius: 1, display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                        <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700, fontSize: '0.65rem' }}>
                            {STAGE_LABELS[growthStage]}
                        </Typography>
                     </Box>
                )}
                 <IconButton size="small" onClick={handleOpenSettings} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <Settings size={14} />
                 </IconButton>
            </Box>

            <div style={{ width: '100%', height: '100%', minHeight: 200, minWidth: 200, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* Menu stays same */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseSettings}
                PaperProps={{
                    sx: {
                        minWidth: 200,
                        maxHeight: 300,
                        bgcolor: 'background.paper', // Uses new Theme logic
                        backgroundImage: 'none',
                        borderRadius: 2
                    }
                }}
            >
                {/* ... existing menu items ... but mapped with new code logic if replaced */}
                <MenuItem disabled><Typography variant="caption" color="text.secondary">TIPO</Typography></MenuItem>
                <MenuItem selected={chartType === 'area'} onClick={() => handleChartTypeChange('area')} dense>
                    <ListItemIcon><Activity size={16} /></ListItemIcon> <ListItemText primary="Área" />
                </MenuItem>
                <MenuItem selected={chartType === 'line'} onClick={() => handleChartTypeChange('line')} dense>
                    <ListItemIcon><TrendingUp size={16} /></ListItemIcon> <ListItemText primary="Línea" />
                </MenuItem>
                <Divider />
                <MenuItem disabled><Typography variant="caption" color="text.secondary">ETAPA</Typography></MenuItem>
                {['none', 'veg', 'flower_early', 'flower_mid', 'flower_late'].map((stage: any) => (
                    <MenuItem key={stage} selected={growthStage === stage} onClick={() => handleStageChange(stage)} dense>
                           <ListItemIcon>{stage === 'veg' ? <Sprout size={16}/> : (stage === 'none' ? <Leaf size={16}/> : <Flower size={16}/>)}</ListItemIcon>
                           <ListItemText primary={STAGE_LABELS[stage as GrowthStage]} />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};
