import React, { useState, useEffect } from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidthProvider } from './WidthProvider';
import { BaseWidgetWrapper } from './BaseWidgetWrapper';
import { WIDGET_COMPONENTS, WidgetDefinition, WidgetType } from './WidgetRegistry';
import {
    Box, Button, SpeedDial, SpeedDialIcon, SpeedDialAction,
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, Select, MenuItem, TextField, Chip, Typography
} from '@mui/material';
import { Check, Edit2, BarChart2, ToggleLeft, Thermometer } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { apiClient } from '../../api/client';
import _ from 'lodash';

// Using local WidthProvider because lib export is broken in v2
const ResponsiveGridLayout = WidthProvider(Responsive);

interface ConfiguredDevice {
    id: string;
    name: string;
    type: string;
    platform: string;
    capabilities?: string[];
    configured?: boolean;
}

interface DashboardLayoutProps {
    widgets: WidgetDefinition[];
    layout: any[];
    onLayoutChange: (layout: any[]) => void;
    onAddWidget?: (type: WidgetType, deviceId?: string, deviceName?: string) => void;
    onRemoveWidget?: (id: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    widgets,
    layout,
    onLayoutChange,
    onAddWidget,
    onRemoveWidget
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [devices, setDevices] = useState<ConfiguredDevice[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [selectedType, setSelectedType] = useState<WidgetType>('chart');
    const [widgetName, setWidgetName] = useState('');

    // Fetch configured devices when dialog opens
    useEffect(() => {
        if (dialogOpen) {
            fetchDevices();
        }
    }, [dialogOpen]);

    const fetchDevices = async () => {
        try {
            const data = await apiClient.request<ConfiguredDevice[]>('/api/devices/list');
            if (Array.isArray(data)) {
                // Filter to show only configured/integrated devices
                setDevices(data.filter(d => d.configured));
            }
        } catch (e) {
            console.error('Error fetching devices:', e);
        }
    };

    const handleOpenDialog = (type: WidgetType) => {
        setSelectedType(type);
        setSelectedDevice('');
        setWidgetName('');
        setDialogOpen(true);
    };

    const handleAddWidget = () => {
        const device = devices.find(d => d.id === selectedDevice);
        const name = widgetName || device?.name || 'Widget';
        onAddWidget?.(selectedType, selectedDevice || undefined, name);
        setDialogOpen(false);
    };

    // Auto-detect widget type based on device capabilities
    const getRecommendedType = (device: ConfiguredDevice): WidgetType => {
        const caps = device.capabilities || [];
        if (caps.includes('temperature') || caps.includes('humidity')) {
            return 'sensor';
        }
        if (caps.includes('switch') || caps.includes('dimmer')) {
            return 'control';
        }
        return 'chart';
    };

    const handleLayoutChange = (currentLayout: any) => {
        onLayoutChange(currentLayout);
    };

    return (
        <Box sx={{ position: 'relative', minHeight: '80vh' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                    variant={isEditMode ? "contained" : "outlined"}
                    color={isEditMode ? "primary" : "inherit"}
                    startIcon={isEditMode ? <Check size={18} /> : <Edit2 size={18} />}
                    onClick={() => setIsEditMode(!isEditMode)}
                >
                    {isEditMode ? "Terminar Edición" : "Editar Dashboard"}
                </Button>
            </Box>

            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
                rowHeight={100}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16]}
                draggableHandle=".drag-handle"
            >
                {widgets.map((widget) => {
                    const Component = WIDGET_COMPONENTS[widget.type];
                    if (!Component) {
                         return <div key={widget.id}><BaseWidgetWrapper title="Unknown" isEditMode={isEditMode} onRemove={() => onRemoveWidget?.(widget.id)}>Unknown Type: {widget.type}</BaseWidgetWrapper></div>;
                    }

                    return (
                        <div key={widget.id}>
                            <BaseWidgetWrapper
                                title={widget.title}
                                isEditMode={isEditMode}
                                onRemove={() => onRemoveWidget?.(widget.id)}
                            >
                                <ErrorBoundary>
                                     <Component {...widget.props} />
                                </ErrorBoundary>
                            </BaseWidgetWrapper>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

            {/* Add Widget SpeedDial */}
            {isEditMode && (
                 <SpeedDial
                    ariaLabel="Add Widget"
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                    icon={<SpeedDialIcon />}
                 >
                    <SpeedDialAction
                        icon={<BarChart2 size={20} />}
                        tooltipTitle="Gráfico"
                        onClick={() => handleOpenDialog('chart')}
                    />
                    <SpeedDialAction
                        icon={<ToggleLeft size={20} />}
                        tooltipTitle="Control"
                        onClick={() => handleOpenDialog('control')}
                    />
                    <SpeedDialAction
                        icon={<Thermometer size={20} />}
                        tooltipTitle="Sensor"
                        onClick={() => handleOpenDialog('sensor')}
                    />
                 </SpeedDial>
            )}

            {/* Add Widget Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar Widget</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Tipo de Widget</InputLabel>
                        <Select
                            value={selectedType}
                            label="Tipo de Widget"
                            onChange={(e) => setSelectedType(e.target.value as WidgetType)}
                        >
                            <MenuItem value="chart">📊 Gráfico</MenuItem>
                            <MenuItem value="sensor">🌡️ Sensor</MenuItem>
                            <MenuItem value="control">🔌 Control (Switch)</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Dispositivo (Opcional)</InputLabel>
                        <Select
                            value={selectedDevice}
                            label="Dispositivo (Opcional)"
                            onChange={(e) => {
                                setSelectedDevice(e.target.value);
                                const dev = devices.find(d => d.id === e.target.value);
                                if (dev) {
                                    setWidgetName(dev.name);
                                    setSelectedType(getRecommendedType(dev));
                                }
                            }}
                        >
                            <MenuItem value="">Sin dispositivo (datos generales)</MenuItem>
                            {devices.map(device => (
                                <MenuItem key={device.id} value={device.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{device.name}</span>
                                        <Chip
                                            label={device.platform}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: '0.65rem' }}
                                        />
                                        {device.capabilities?.slice(0, 2).map(cap => (
                                            <Chip
                                                key={cap}
                                                label={cap}
                                                size="small"
                                                color="primary"
                                                sx={{ fontSize: '0.6rem' }}
                                            />
                                        ))}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Nombre del Widget"
                        value={widgetName}
                        onChange={(e) => setWidgetName(e.target.value)}
                        placeholder="Ej: Temperatura Sala"
                    />

                    {devices.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            No hay dispositivos configurados. Ve a Configuración → Meross/Tuya para agregar dispositivos.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddWidget} variant="contained">
                        Agregar Widget
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
