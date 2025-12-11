import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Settings, BarChart as BarChartIcon, TrendingUp, Activity, Clock } from 'lucide-react';

interface ChartWidgetProps {
    data: any[];
    dataKey: string;
    color?: string;
    unit?: string;
    onRangeChange?: (range: string) => void;
}

type ChartType = 'area' | 'line' | 'bar';
type TimeRange = '24h' | '7d' | '30d';

export const ChartWidget: React.FC<ChartWidgetProps> = ({
    data,
    dataKey,
    color = '#8884d8',
    unit = '',
    onRangeChange
}) => {
    const [chartType, setChartType] = useState<ChartType>('area');
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
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

    const renderChart = () => {
        const commonProps = {
            data: data,
            margin: { top: 5, right: 0, left: 0, bottom: 5 }
        };

        const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />;
        const xaxis = <XAxis dataKey="timestamp" hide />;
        const yaxis = <YAxis domain={['auto', 'auto']} hide />;
        const tooltip = (
            <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
                formatter={(value: any) => [`${value}${unit}`, dataKey]}
                labelFormatter={() => ''}
            />
        );

        switch (chartType) {
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        {grid}
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
            <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                 <IconButton size="small" onClick={handleOpenSettings} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <Settings size={14} />
                 </IconButton>
            </Box>

            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseSettings}
                PaperProps={{ sx: { minWidth: 150 } }}
            >
                <MenuItem disabled><Typography variant="caption" color="text.secondary">TIPO DE GRÁFICO</Typography></MenuItem>
                <MenuItem selected={chartType === 'area'} onClick={() => handleChartTypeChange('area')}>
                    <ListItemIcon><Activity size={16} /></ListItemIcon>
                    <ListItemText>Área</ListItemText>
                </MenuItem>
                <MenuItem selected={chartType === 'line'} onClick={() => handleChartTypeChange('line')}>
                     <ListItemIcon><TrendingUp size={16} /></ListItemIcon>
                    <ListItemText>Línea</ListItemText>
                </MenuItem>
                <MenuItem selected={chartType === 'bar'} onClick={() => handleChartTypeChange('bar')}>
                     <ListItemIcon><BarChartIcon size={16} /></ListItemIcon>
                    <ListItemText>Barra</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem disabled><Typography variant="caption" color="text.secondary">RANGO DE TIEMPO</Typography></MenuItem>
                <MenuItem selected={timeRange === '24h'} onClick={() => handleRangeChange('24h')}>
                     <ListItemIcon><Clock size={16} /></ListItemIcon>
                    <ListItemText>24 Horas</ListItemText>
                </MenuItem>
                <MenuItem selected={timeRange === '7d'} onClick={() => handleRangeChange('7d')}>
                     <ListItemIcon><Clock size={16} /></ListItemIcon>
                    <ListItemText>7 Días</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};
