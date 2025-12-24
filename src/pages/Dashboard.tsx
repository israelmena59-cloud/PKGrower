import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '../components/widgets/DashboardLayout';
import { WidgetDefinition } from '../components/widgets/WidgetRegistry';
import { apiClient, type SensorData, type DeviceStates } from '../api/client';
import ConfigModal from '../components/dashboard/ConfigModal';
import RulesModal from '../components/dashboard/RulesModal';
import HistoryChart from '../components/dashboard/HistoryChart';
import CropSteeringWidget from '../components/dashboard/CropSteeringWidget';
import QuickActionsWidget from '../components/dashboard/QuickActionsWidget';
import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';
import SmartNotifications from '../components/ai/SmartNotifications';
import { PageHeader } from '../components/layout/PageHeader';
import { Thermometer, Droplet, Wind, Droplets, Lightbulb, RefreshCw } from 'lucide-react';
import { Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

// Initial default layout for a fresh start
const DEFAULT_WIDGETS_CONFIG: WidgetDefinition[] = [
    { id: 'temp', type: 'sensor', title: 'Temperatura' },
    { id: 'hum', type: 'sensor', title: 'Humedad' },
    { id: 'vpd', type: 'sensor', title: 'D.P.V' },
    { id: 'sub', type: 'sensor', title: 'Sustrato' },
    { id: 'light_main', type: 'control', title: 'Luz Principal' }
];

// Dashboard-level Error Boundary
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
                <div className="h-[90vh] flex flex-col items-center justify-center text-center gap-4">
                    <h2 className="text-xl font-bold text-destructive">Algo salió mal en el Dashboard</h2>
                    <Button variant="contained" color="error" onClick={this.props.onReset}>
                        Reestablecer Todo (Factory Reset)
                    </Button>
                </div>
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
    const [settings, setSettings] = useState<any>(null);

    // UI END STATE
    const [loading, setLoading] = useState(true);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isRulesOpen, setIsRulesOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // PAGE STATE
    const [activePage, setActivePage] = useState('General');
    const [pages, setPages] = useState<Record<string, WidgetDefinition[]>>({ 'General': DEFAULT_WIDGETS_CONFIG });
    const [layouts, setLayouts] = useState<Record<string, any[]>>(() => {
        try {
            const saved = localStorage.getItem('dashboard_layouts');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [isAddPageOpen, setIsAddPageOpen] = useState(false);
    const [newPageName, setNewPageName] = useState('');

    // --- DATA FETCHING ---
    const fetchData = async () => {
        try {
            const [sensors, history, devs, meta, globalSettings] = await Promise.allSettled([
                apiClient.getLatestSensors(),
                apiClient.getSensorHistory(),
                apiClient.getDeviceStates(),
                apiClient.request<any[]>('/api/devices/list'),
                apiClient.getSettings()
            ]);

            if (sensors.status === 'fulfilled') setLatestSensors(sensors.value);
            if (history.status === 'fulfilled') setSensorHistory(history.value);
            if (devs.status === 'fulfilled') setDevices(devs.value);
            if (meta.status === 'fulfilled' && Array.isArray(meta.value)) setDeviceMeta(meta.value);
            if (globalSettings.status === 'fulfilled') setSettings(globalSettings.value);

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

    // --- HYDRATION (For Active Page) ---
    const hydratedWidgets = useMemo(() => {
        if (!pages || typeof pages !== 'object') return [];
        const currentWidgets = pages[activePage] || [];
        const widgets: WidgetDefinition[] = [];

        // Prepare Light Schedule for charts
        const lightSchedule = settings?.lighting ? {
            on: settings.lighting.onTime || '06:00',
            off: settings.lighting.offTime || '00:00'
        } : undefined;

        currentWidgets.forEach(w => {
            let props: any = {};
            const currentStage = settings?.cropSteering?.stage || 'none';

            const handleRename = (newName: string) => {
                handleRenameWidget(w.id, newName);
            };

            // Standard Sensors
            if (w.id === 'temp') props = { icon: <Thermometer/>, name: w.title, value: latestSensors?.temperature?.toFixed(1) ?? '--', unit: '°C', color: '#ef4444', onRename: handleRename, metricKey: 'temp', growthStage: currentStage };
            if (w.id === 'hum') props = { icon: <Droplet/>, name: w.title, value: latestSensors?.humidity?.toFixed(0) ?? '--', unit: '%', color: '#3b82f6', onRename: handleRename, metricKey: 'hum', growthStage: currentStage };
            if (w.id === 'vpd') props = { icon: <Wind/>, name: w.title, value: latestSensors?.vpd?.toFixed(2) ?? '--', unit: 'kPa', color: '#22c55e', onRename: handleRename, metricKey: 'vpd', growthStage: currentStage };
            if (w.id === 'sub') props = { icon: <Droplets/>, name: w.title, value: latestSensors?.substrateHumidity?.toFixed(0) ?? '--', unit: '%', color: '#f59e0b', onRename: handleRename, metricKey: 'sub', growthStage: currentStage };

            // Chart Mapping
            if (w.id === 'chart_vpd') props = { data: sensorHistory, dataKey: 'vpd', color: '#22c55e', unit: 'kPa', lightSchedule };
            if (w.id === 'chart_soil') props = { data: sensorHistory, dataKey: 'substrateHumidity', color: '#f59e0b', unit: '%', lightSchedule };

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
                    icon: <RefreshCw/>,
                    name: meta?.name || w.title || w.id,
                    value: typeof val === 'number' ? val.toFixed(1) : (val ?? '--'),
                    unit: '',
                    color: '#64748b',
                    onRename: handleRename
                };
            }

            widgets.push({ ...w, props });
        });

        return widgets;
    }, [pages, activePage, latestSensors, sensorHistory, devices, deviceMeta, settings]);

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

    const handleAddWidget = (type: string, deviceId?: string, deviceName?: string) => {
        const id = `widget_${Date.now()}`;
        const title = deviceName || 'Nuevo Widget';
        const widgetType = deviceId ? 'device' : type;
        const newWidget = {
            id,
            type: widgetType as any,
            title,
            props: deviceId ? { deviceId, deviceName, widgetType: type } : {}
        };
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

    const triggerReset = () => {
         localStorage.removeItem('dashboard_pages');
         localStorage.removeItem('dashboard_layouts');
         localStorage.removeItem('known_devices');
         window.location.reload();
    };

    if (loading && !latestSensors) {
         return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    return (

        <div className="max-w-[1800px] mx-auto p-4">
            <PageHeader
                title="PKGrower OS"
                activePage={activePage}
                pages={Object.keys(pages)}
                onPageChange={setActivePage}
                onAddPage={() => setIsAddPageOpen(true)}
                onDeletePage={handleDeletePage}
                onRefresh={handleRefresh}
                onReset={() => {
                     if (confirm('¿Restablecer todo el diseño? Se perderán las personalizaciones.')) {
                        triggerReset();
                     }
                }}
                onOpenConfig={() => setIsConfigOpen(true)}
                onOpenRules={() => setIsRulesOpen(true)}
                refreshing={refreshing}
            />

            <ConfigModal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
            <RulesModal open={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

            {/* STATIC CHARTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <CropSteeringWidget />
                <QuickActionsWidget />
                <AIInsightsWidget autoRefresh={true} />
                <SmartNotifications maxVisible={3} autoRefresh={true} refreshInterval={30000} />
            </div>

            {/* ENVIRONMENT CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <HistoryChart
                    type="environment"
                    title="Historial Ambiental"
                    data={sensorHistory}
                />
                <HistoryChart
                    type="substrate"
                    title="Historial de Sustrato"
                    data={sensorHistory}
                    targets={{
                        vwc: settings?.cropSteering?.targetVWC || 50,
                        dryback: settings?.cropSteering?.targetDryback || 15
                    }}
                />
            </div>

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

            {/* DYNAMIC GRID - Draggable Widgets */}
            <DashboardErrorBoundary key={activePage} onReset={triggerReset}>
                <DashboardLayout
                    widgets={hydratedWidgets}
                    layout={layouts[activePage] || []}
                    onLayoutChange={handleLayoutChange}
                    onAddWidget={handleAddWidget}
                    onRemoveWidget={handleRemoveWidget}
                />
            </DashboardErrorBoundary>
        </div>
    );
};

export default Dashboard;
