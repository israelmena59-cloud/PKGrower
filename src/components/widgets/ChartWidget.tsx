import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { Settings, BarChart as BarChartIcon, TrendingUp, Activity, Clock, Sprout, Flower, Leaf } from 'lucide-react';

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
        'temperature': [24, 28]
    },
    'flower_early': {
        'vpd': [0.8, 1.2],
        'humidity': [55, 70],
        'temperature': [22, 26]
    },
    'flower_mid': {
        'vpd': [1.2, 1.6],
        'humidity': [45, 60],
        'temperature': [20, 25]
    },
    'flower_late': {
        'vpd': [1.4, 1.8], // High drift for maturation
        'humidity': [35, 50],
        'temperature': [18, 24]
    },
    'none': {}
};

const STAGE_LABELS: Record<GrowthStage, string> = {
    'veg': 'Vegetativo (Engorde)',
    'flower_early': 'Floración S1-4 (Generativo)',
    'flower_mid': 'Floración S4-7',
    'flower_late': 'Maduración S8-9',
    'none': 'Sin Referencia'
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({
    data,
    dataKey,
    color = '#8884d8',
    unit = '',
    onRangeChange
}) => {
    const [chartType, setChartType] = useState<ChartType>('area');
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [growthStage, setGrowthStage] = useState<GrowthStage>('none');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpenSettings = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseSettings = () => {
        setAnchorEl(null);
    };

    const handleChartTypeChange = (type: ChartType) => {
        setChartType(type);
        handleCloseSettings();
    };

    const handleRangeChange = (range: TimeRange) => {
        setTimeRange(range);
        if (onRangeChange) onRangeChange(range);
        handleCloseSettings();
    };

    const handleStageChange = (stage: GrowthStage) => {
        setGrowthStage(stage);
        handleCloseSettings();
    };

    const renderReferenceZones = () => {
        if (growthStage === 'none') return null;
        const zones = STAGE_ZONES[growthStage];
        // Map dataKey (e.g., 'temperature') to zone key if possible
        // Our dataKeys: 'temperature', 'humidity', 'vpd', 'substrateHumidity'
        // Zones keys: 'temperature', 'humidity', 'vpd'

        // Simple mapping check
        let zoneKey = dataKey;
        if (!zones[zoneKey]) return null;

        const [min, max] = zones[zoneKey];

        return (
            <ReferenceArea
                y1={min}
                y2={max}
                fill="#22c55e"
                fillOpacity={0.15}
                stroke="#22c55e"
                strokeOpacity={0.3}
                label={{
                    value: "Zona Ideal",
                    position: 'insideTopRight',
                    fill: '#22c55e',
                    fontSize: 10
                }}
            />
        );
    };

    const renderChart = () => {
        const commonProps = {
            data: data,
            margin: { top: 5, right: 0, left: 0, bottom: 5 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />;
        const xaxis = <XAxis dataKey="timestamp" hide />;
        // Auto domain but maybe padded for zones? No, 'auto' is fine.
        const yaxis = <YAxis domain={['auto', 'auto']} hide />;
        const tooltip = (
            <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
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
                        {grid}
                        {refZones}
                        {xaxis}
                        {yaxis}
                        {tooltip}
                        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
            case 'area':
            default:
                return (
                    <AreaChart {...commonProps}>
                        {grid}
                        {refZones}
                        {xaxis}
                        {yaxis}
                        {tooltip}
                        <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                );
        }
    };

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
            <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10, display: 'flex', gap: 1 }}>
                {growthStage !== 'none' && (
                     <Box sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', px: 1, borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700, fontSize: '0.65rem' }}>
                            {STAGE_LABELS[growthStage].split(' ')[0]}
                        </Typography>
                     </Box>
                )}
                 <IconButton size="small" onClick={handleOpenSettings} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <Settings size={14} />
                 </IconButton>
            </Box>

            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                {renderChart()}
            </ResponsiveContainer>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseSettings}
                PaperProps={{ sx: { minWidth: 200, maxHeight: 300 } }}
            >
                <MenuItem disabled><Typography variant="caption" color="text.secondary">TIPO DE GRÁFICO</Typography></MenuItem>
                <MenuItem selected={chartType === 'area'} onClick={() => handleChartTypeChange('area')} dense>
                    <ListItemIcon><Activity size={16} /></ListItemIcon>
                    <ListItemText primary="Área" />
                </MenuItem>
                <MenuItem selected={chartType === 'line'} onClick={() => handleChartTypeChange('line')} dense>
                     <ListItemIcon><TrendingUp size={16} /></ListItemIcon>
                    <ListItemText primary="Línea" />
                </MenuItem>

                <Divider />

                <MenuItem disabled><Typography variant="caption" color="text.secondary">ETAPA DE CULTIVO</Typography></MenuItem>
                <MenuItem selected={growthStage === 'none'} onClick={() => handleStageChange('none')} dense>
                     <ListItemIcon><Leaf size={16} /></ListItemIcon>
                    <ListItemText primary="Ninguna" />
                </MenuItem>
                <MenuItem selected={growthStage === 'veg'} onClick={() => handleStageChange('veg')} dense>
                     <ListItemIcon><Sprout size={16} /></ListItemIcon>
                    <ListItemText primary="Vegetativo" secondary="Engorde" secondaryTypographyProps={{ fontSize: 10 }} />
                </MenuItem>
                <MenuItem selected={growthStage === 'flower_early'} onClick={() => handleStageChange('flower_early')} dense>
                     <ListItemIcon><Flower size={16} /></ListItemIcon>
                    <ListItemText primary="Floración S1-4" secondary="Generativo" secondaryTypographyProps={{ fontSize: 10 }} />
                </MenuItem>
                <MenuItem selected={growthStage === 'flower_mid'} onClick={() => handleStageChange('flower_mid')} dense>
                     <ListItemIcon><Flower size={16} /></ListItemIcon>
                    <ListItemText primary="Floración S4-7" />
                </MenuItem>
                <MenuItem selected={growthStage === 'flower_late'} onClick={() => handleStageChange('flower_late')} dense>
                     <ListItemIcon><Flower size={16} /></ListItemIcon>
                    <ListItemText primary="Maduración S8-9" />
                </MenuItem>

                <Divider />

                <MenuItem disabled><Typography variant="caption" color="text.secondary">RANGO</Typography></MenuItem>
                <MenuItem selected={timeRange === '24h'} onClick={() => handleRangeChange('24h')} dense>
                     <ListItemIcon><Clock size={16} /></ListItemIcon>
                    <ListItemText primary="24 Horas" />
                </MenuItem>
                <MenuItem selected={timeRange === '7d'} onClick={() => handleRangeChange('7d')} dense>
                     <ListItemIcon><Clock size={16} /></ListItemIcon>
                    <ListItemText primary="7 Días" />
                </MenuItem>
            </Menu>
        </Box>
    );
};
