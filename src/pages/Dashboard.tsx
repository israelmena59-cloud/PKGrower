
import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '../components/widgets/DashboardLayout';
import { WidgetDefinition } from '../components/widgets/WidgetRegistry';
import { apiClient, type SensorData, type DeviceStates } from '../api/client';
import ConfigModal from '../components/dashboard/ConfigModal';
import { Thermometer, Droplet, Wind, Droplets, Lightbulb, RefreshCw, Settings, Plus, X } from 'lucide-react';
import { Box, Paper, Typography, IconButton, CircularProgress, Button, Tabs, Tab, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import _ from 'lodash';

// Initial default layout for a fresh start
const DEFAULT_WIDGETS_CONFIG: WidgetDefinition[] = [
    { id: 'temp', type: 'sensor', title: 'Temperatura' },
    { id: 'hum', type: 'sensor', title: 'Humedad' },
    { id: 'vpd', type: 'sensor', title: 'D.P.V' },
    { id: 'sub', type: 'sensor', title: 'Sustrato' },
    { id: 'chart_vpd', type: 'chart', title: 'Historial Ambiental' },
    { id: 'chart_soil', type: 'chart', title: 'Historial Sustrato' },
    { id: 'light_main', type: 'control', title: 'Luz Principal' }
];

// Dashboard-level Error Boundary to catch layout crashes
class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode, onReset: () => void }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any) { console.error("Critical Dashboard Crash:", error); }
    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ height: '90vh', display: 'flex', flexDirection: 'column', items: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <Typography variant="h5" color="error" gutterBottom>Algo salió mal en el Dashboard</Typography>
                    <Button variant="contained" color="error" onClick={this.props.onReset}>
                        Reestablecer Todo (Factory Reset)
                    </Button>
                </Box>
            );
        }
        return this.props.children;
    }
}

const Dashboard: React.FC = () => {
    // DATA STATE
    const [latestSensors, setLatestSensors] = useState<SensorData | null>(null);
    const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
    const [devices, setDevices] = useState<DeviceStates | null>(null);
    const [deviceMeta, setDeviceMeta] = useState<any[]>([]);

    // UI END STATE
    const [loading, setLoading] = useState(true);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // PAGE STATE
    const [activePage, setActivePage] = useState('General');
    const [pages, setPages] = useState<Record<string, WidgetDefinition[]>>({ 'General': DEFAULT_WIDGETS_CONFIG });
    const [layouts, setLayouts] = useState<Record<string, any[]>>({});
    const [isAddPageOpen, setIsAddPageOpen] = useState(false);
    const [newPageName, setNewPageName] = useState('');

    // --- DATA FETCHING ---
    const fetchData = async () => {
        try {
            const [sensors, history, devs, meta] = await Promise.allSettled([
                apiClient.getLatestSensors(),
                apiClient.getSensorHistory(),
                apiClient.getDeviceStates(),
                apiClient.request<any[]>('/api/devices/list')
            ]);

            if (sensors.status === 'fulfilled') setLatestSensors(sensors.value);
            if (history.status === 'fulfilled') setSensorHistory(history.value);
            if (devs.status === 'fulfilled') setDevices(devs.value);
            if (meta.status === 'fulfilled' && Array.isArray(meta.value)) setDeviceMeta(meta.value);

            setLoading(false);
        } catch (e) {
            console.error("Fetch error", e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // --- AUTO-DISCOVERY ---
    useEffect(() => {
        if (!devices) return;

        const knownDevices = JSON.parse(localStorage.getItem('known_devices') || '[]');
        const newKnownDevices = [...knownDevices];
        const addedWidgets: WidgetDefinition[] = [];
        let hasChanges = false;

        Object.keys(devices).forEach(deviceId => {
            if (['temperature', 'humidity'].includes(deviceId)) return;

            if (!knownDevices.includes(deviceId)) {
                console.log(`Auto-discovering new device: ${deviceId}`);
                const meta = deviceMeta.find(d => d.id === deviceId);
                const type = meta?.type === 'sensor' ? 'sensor' : 'control';
                const title = meta?.name || deviceId;

                addedWidgets.push({ id: deviceId, type: type as any, title: title });
                newKnownDevices.push(deviceId);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            // Add new widgets to the ACTIVE page
            setPages(prev => ({
                ...prev,
                [activePage]: [...(prev[activePage] || []), ...addedWidgets]
            }));
            localStorage.setItem('known_devices', JSON.stringify(newKnownDevices));
        }

    }, [devices, deviceMeta, activePage]);

    // --- INIT & MIGRATION ---
    useEffect(() => {
        // Load Pages (Widgets)
        const savedPages = localStorage.getItem('dashboard_pages');
        if (savedPages) {
            setPages(JSON.parse(savedPages));
        } else {
            // Migration check: did we have a flat list? - No separate storage for widgets before, just hardcoded default + add logic
            // But we might have stored it if we implemented full persistence for widgets list.
            // Currently my previous code did: setRegisteredWidgets(DEFAULT) and added to it.
            // I did NOT implement persisting registeredWidgets to LS in previous step, only layout.
            // So widgets reset on reload except for layout positions?
            // WAIT - if widgets reset, but layout persists, RGL might show empty boxes or nothing?
            // Let's assume we start fresh or from default for widgets, but check layouts.
        }

        // Load Layouts
        const savedLayouts = localStorage.getItem('dashboard_layouts');
        if (savedLayouts) {
            setLayouts(JSON.parse(savedLayouts));
        } else {
            // Migration: Check old single layout
            const oldLayout = localStorage.getItem('dashboard_layout');
            if (oldLayout) {
                const parsed = JSON.parse(oldLayout);
                // Assign old layout to 'General'
                setLayouts({ 'General': parsed });
            } else {
                // Generate default layout for General
                const initialLayout = DEFAULT_WIDGETS_CONFIG.map((w, i) => ({
                    i: w.id,
                    x: (i * 2) % 4,
                    y: Math.floor(i / 2) * 2,
                    w: w.type === 'chart' ? 4 : 1,
                    h: w.type === 'chart' ? 3 : 1
                }));
                setLayouts({ 'General': initialLayout });
            }
        }
    }, []);

    // Persist Pages whenever they change
    useEffect(() => {
        localStorage.setItem('dashboard_pages', JSON.stringify(pages));
    }, [pages]);

    // --- HYDRATION (For Active Page) ---
    const hydratedWidgets = useMemo(() => {
        if (!pages || typeof pages !== 'object') return [];
        const currentWidgets = pages[activePage] || [];
        const widgets: WidgetDefinition[] = [];

        currentWidgets.forEach(w => {
            let props: any = {};

            const handleRename = (newName: string) => {
                handleRenameWidget(w.id, newName);
            };

            // Sensor Mapping
            if (w.id === 'temp') props = { icon: <Thermometer/>, name: w.title, value: latestSensors?.temperature?.toFixed(1) ?? '--', unit: '°C', color: '#ef4444', onRename: handleRename };
            if (w.id === 'hum') props = { icon: <Droplet/>, name: w.title, value: latestSensors?.humidity?.toFixed(0) ?? '--', unit: '%', color: '#3b82f6', onRename: handleRename };
            if (w.id === 'vpd') props = { icon: <Wind/>, name: w.title, value: latestSensors?.vpd?.toFixed(2) ?? '--', unit: 'kPa', color: '#8b5cf6', onRename: handleRename };
            if (w.id === 'sub') props = { icon: <Droplets/>, name: w.title, value: latestSensors?.substrateHumidity?.toFixed(0) ?? '--', unit: '%', color: '#f59e0b', onRename: handleRename };

            // Chart Mapping
            if (w.id === 'chart_vpd') props = { data: sensorHistory, dataKey: 'vpd', color: '#8b5cf6', unit: 'kPa' };
            if (w.id === 'chart_soil') props = { data: sensorHistory, dataKey: 'substrateHumidity', color: '#f59e0b', unit: '%' };

            // Manual Device Mapping
            if (w.id === 'light_main') props = {
                id: 'luzPanel1',
                icon: <Lightbulb/>,
                name: w.title,
                isOn: devices?.['luzPanel1'] ?? false,
                onRename: handleRename
            };

            // Dynamic Device Mapping (Controls)
            if (w.type === 'control' && !['light_main'].includes(w.id)) {
                 const dev = devices?.[w.id];
                 const meta = deviceMeta.find(d => d.id === w.id);
                 props = {
                     id: w.id,
                     icon: meta?.type === 'light' ? <Lightbulb/> : <RefreshCw/>,
                     name: meta?.name || w.title,
                     isOn: !!dev,
                     onRename: handleRename
                 };
            }

            // Dynamic Sensor Mapping
            if (w.type === 'sensor' && !['temp', 'hum', 'vpd', 'sub'].includes(w.id)) {
                const val = latestSensors?.[w.id as keyof SensorData];
                const meta = deviceMeta.find(d => d.id === w.id);
                props = {
                    icon: <RefreshCw/>, // Default icon
                    name: meta?.name || w.title || w.id,
                    value: typeof val === 'number' ? val.toFixed(1) : (val ?? '--'),
                    unit: '', // Unknown unit
                    color: '#64748b',
                    onRename: handleRename
                };
            }

            widgets.push({ ...w, props });
        });

        return widgets;
    }, [pages, activePage, latestSensors, sensorHistory, devices, deviceMeta]);

    // --- HANDLERS ---
    const handleLayoutChange = (newLayout: any[]) => {
        const updated = { ...layouts, [activePage]: newLayout };
        setLayouts(updated);
        localStorage.setItem('dashboard_layouts', JSON.stringify(updated));
    };

    const handleRenameWidget = (id: string, newName: string) => {
        setPages(prev => {
            const current = [...(prev[activePage] || [])];
            const idx = current.findIndex(w => w.id === id);
            if (idx !== -1) {
                current[idx] = { ...current[idx], title: newName };
                return { ...prev, [activePage]: current };
            }
            return prev;
        });
    };

    const handleAddWidget = (type: string) => {
        const id = `widget_${Date.now()}`;
        const newWidget = { id, type: type as any, title: 'Nuevo Widget' };
        setPages(prev => ({
            ...prev,
            [activePage]: [...(prev[activePage] || []), newWidget]
        }));
    };

    const handleRemoveWidget = (id: string) => {
        setPages(prev => ({
            ...prev,
            [activePage]: prev[activePage].filter(w => w.id !== id)
        }));
        // Clean layout
        /* const currentLayout = layouts[activePage] || [];
        const newLayout = currentLayout.filter((l: any) => l.i !== id);
        handleLayoutChange(newLayout); */
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleAddPage = () => {
        if (newPageName && !pages[newPageName]) {
            setPages(prev => ({ ...prev, [newPageName]: [] }));
            setLayouts(prev => ({ ...prev, [newPageName]: [] }));
            setActivePage(newPageName);
            setNewPageName('');
            setIsAddPageOpen(false);
        }
    };

    const handleDeletePage = (e: React.MouseEvent, page: string) => {
        e.stopPropagation();
        if (page === 'General') return;
        if (confirm(`Eliminar página "${page}" y sus widgets?`)) {
            const newPages = { ...pages };
            delete newPages[page];
            setPages(newPages);

            const newLayouts = { ...layouts };
            delete newLayouts[page];
            setLayouts(newLayouts);
            localStorage.setItem('dashboard_layouts', JSON.stringify(newLayouts));

            if (activePage === page) setActivePage('General');
        }
    };



    if (loading && !latestSensors) {
         return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    const triggerReset = () => {
         localStorage.removeItem('dashboard_pages');
         localStorage.removeItem('dashboard_layouts');
         localStorage.removeItem('known_devices');
         window.location.reload();
    };

    return (

        <Box sx={{ maxWidth: 1800, mx: 'auto', p: 2 }}>
             {/* HEADER */}
             <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 'var(--squircle-radius)', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="overline" sx={{ opacity: 0.7 }}>SISTEMA ONLINE</Typography>
                    <Typography variant="h4" fontWeight="900" sx={{ background: 'linear-gradient(45deg, #fff, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        PKGrower OS
                    </Typography>
                </Box>

                {/* TABS */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                     <Tabs
                        value={activePage}
                        onChange={(_, val) => setActivePage(val)}
                        textColor="inherit"
                        indicatorColor="secondary"
                        variant="scrollable"
                        scrollButtons="auto"
                     >
                        {Object.keys(pages).map(page => (
                            <Tab
                                key={page}
                                value={page}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {page}
                                        {page !== 'General' && (
                                            <X size={14} onClick={(e) => handleDeletePage(e, page)} style={{ opacity: 0.6, cursor: 'pointer' }} />
                                        )}
                                    </Box>
                                }
                            />
                        ))}
                     </Tabs>
                     <IconButton size="small" onClick={() => setIsAddPageOpen(true)} sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <Plus size={16} />
                     </IconButton>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                     <Button
                        startIcon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
                        onClick={handleRefresh}
                        sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                        variant="outlined"
                    >
                        Refrescar
                    </Button>
                    <Tooltip title="Restablecer Diseño (Si hay errores)">
                         <Button
                            onClick={() => {
                                if (confirm('¿Restablecer todo el diseño? Se perderán las personalizaciones.')) {
                                    localStorage.removeItem('dashboard_pages');
                                    localStorage.removeItem('dashboard_layouts');
                                    localStorage.removeItem('known_devices');
                                    window.location.reload();
                                }
                            }}
                            sx={{ color: 'white', borderColor: 'rgba(255,0,0,0.5)', '&:hover': { borderColor: 'red', bgcolor: 'rgba(255,0,0,0.1)' } }}
                            variant="outlined"
                        >
                            Reset
                        </Button>
                    </Tooltip>
                    <IconButton onClick={() => setIsConfigOpen(true)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                        <Settings />
                    </IconButton>
                </Box>
            </Paper>

            <ConfigModal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

            {/* NEW PAGE MODAL */}
            <Dialog open={isAddPageOpen} onClose={() => setIsAddPageOpen(false)}>
                <DialogTitle>Nueva Página</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nombre de la página"
                        fullWidth
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAddPageOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddPage} variant="contained">Crear</Button>
                </DialogActions>
            </Dialog>

            {/* DYNAMIC GRID */}
            <DashboardErrorBoundary key={activePage} onReset={triggerReset}>
                <DashboardLayout
                    widgets={hydratedWidgets}
                    layout={layouts[activePage] || []}
                    onLayoutChange={handleLayoutChange}
                    onAddWidget={handleAddWidget}
                    onRemoveWidget={handleRemoveWidget}
                />
            </DashboardErrorBoundary>
        </Box>
    );
};

export default Dashboard;
