/**
 * DeviceDataWidget - Wrapper that fetches data for a specific device
 * Determines widget type based on device capabilities and renders appropriate component
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Switch, Button } from '@mui/material';
import { Thermometer, Droplets, Power, ToggleLeft } from 'lucide-react';
import { apiClient } from '../../api/client';
import { SensorWidget } from './SensorWidget';
import { ChartWidget } from './ChartWidget';

interface DeviceData {
    id: string;
    name: string;
    type: string;
    platform: string;
    capabilities?: string[];
    status?: boolean;
    value?: number;
    temperature?: number;
    humidity?: number;
    lastUpdate?: string;
}

interface DeviceDataWidgetProps {
    deviceId?: string;
    deviceName?: string;
    widgetType?: 'chart' | 'sensor' | 'control';
}

export const DeviceDataWidget: React.FC<DeviceDataWidgetProps> = ({
    deviceId,
    deviceName,
    widgetType = 'sensor'
}) => {
    const [device, setDevice] = useState<DeviceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);

    useEffect(() => {
        if (!deviceId) {
            setLoading(false);
            return;
        }
        fetchDeviceData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchDeviceData, 30000);
        return () => clearInterval(interval);
    }, [deviceId]);

    const fetchDeviceData = async () => {
        if (!deviceId) return;

        try {
            setLoading(true);
            // Fetch current device data
            const devices = await apiClient.request<DeviceData[]>('/api/devices/list');
            const found = devices.find(d => d.id === deviceId);

            if (found) {
                setDevice(found);

                // If it's a sensor, also fetch history for chart
                if (widgetType === 'chart' && (found.capabilities?.includes('temperature') || found.capabilities?.includes('humidity'))) {
                    const history = await fetchDeviceHistory(deviceId);
                    setHistoryData(history);
                }
            } else {
                setError('Dispositivo no encontrado');
            }
        } catch (e: any) {
            console.error('Error fetching device data:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeviceHistory = async (id: string): Promise<any[]> => {
        try {
            // Use general history endpoint and filter for this device
            const history = await apiClient.getSensorHistory();
            // Return as-is for now - could filter based on device if needed
            return history.slice(-50); // Last 50 readings
        } catch (e) {
            console.error('Error fetching history:', e);
            return [];
        }
    };

    const handleToggle = async () => {
        if (!device) return;
        try {
            const action = device.status ? 'off' : 'on';
            await apiClient.controlDevice(device.id, action);
            setDevice({ ...device, status: !device.status });
        } catch (e) {
            console.error('Error toggling device:', e);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error || !device) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 1,
                p: 2,
                textAlign: 'center'
            }}>
                <Typography color="error" variant="body2">
                    {error || 'Sin datos'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {deviceName || deviceId}
                </Typography>
            </Box>
        );
    }

    // Determine what to render based on device capabilities and widget type
    const hasTempHumidity = device.capabilities?.includes('temperature') || device.capabilities?.includes('humidity');
    const isSwitch = device.capabilities?.includes('switch');

    // Chart widget for sensors
    if (widgetType === 'chart' && hasTempHumidity) {
        return (
            <ChartWidget
                data={historyData}
                dataKey={device.capabilities?.includes('temperature') ? 'temperature' : 'humidity'}
                color={device.capabilities?.includes('temperature') ? '#FF3B30' : '#007AFF'}
                unit={device.capabilities?.includes('temperature') ? '°C' : '%'}
                chartTitle={device.name}
            />
        );
    }

    // Sensor widget for showing current values
    if (widgetType === 'sensor' && hasTempHumidity) {
        const value = device.temperature ?? device.humidity ?? device.value ?? '--';
        const unit = device.capabilities?.includes('temperature') ? '°C' : '%';

        return (
            <SensorWidget
                icon={device.capabilities?.includes('temperature') ? <Thermometer size={24} /> : <Droplets size={24} />}
                name={device.name}
                value={value}
                unit={unit}
                color={device.capabilities?.includes('temperature') ? '#FF3B30' : '#007AFF'}
                metricKey={device.capabilities?.includes('temperature') ? 'temp' : 'hum'}
            />
        );
    }

    // Control widget for switches
    if (widgetType === 'control' || isSwitch) {
        return (
            <Box sx={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        p: 1,
                        borderRadius: '10px',
                        bgcolor: device.status ? 'rgba(52, 199, 89, 0.2)' : 'rgba(142, 142, 147, 0.2)',
                        color: device.status ? '#34C759' : '#8E8E93'
                    }}>
                        {isSwitch ? <ToggleLeft size={20} /> : <Power size={20} />}
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                        {device.name}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                        {device.platform}
                    </Typography>
                    <Switch
                        checked={!!device.status}
                        onChange={handleToggle}
                        color="success"
                    />
                </Box>
            </Box>
        );
    }

    // Default fallback
    return (
        <Box sx={{
            p: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
        }}>
            <Typography variant="body2" fontWeight={600}>{device.name}</Typography>
            <Typography variant="caption" color="text.secondary">
                {device.platform} • {device.type}
            </Typography>
            {device.value !== undefined && (
                <Typography variant="h5" fontWeight={700}>{device.value}</Typography>
            )}
        </Box>
    );
};

export default DeviceDataWidget;
