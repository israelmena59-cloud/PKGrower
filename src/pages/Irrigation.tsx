
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Slider, Button, Stack, Chip, Tabs, Tab, Alert } from '@mui/material';
import { Activity, Zap, Play, Square, TrendingDown, AlertCircle, Waves, Timer, History, Settings2, Droplet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea, Line } from 'recharts';
import { IrrigationTimeline, AutomationPanel } from '../components/cropsteering'; // Migrated components
import { useCropSteering } from '../context/CropSteeringContext';
import { apiClient } from '../api/client';

// --- STRATEGY DATA FROM REAL SENSORS ---
// This function formats sensor history data for the crop steering chart
const formatStrategyData = (historyData: any[]) => {
    if (!historyData || historyData.length === 0) {
        // Return placeholder if no data
        return Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            vwc: 45,
            ec: 2.5,
            temp: 22,
            phase: i >= 6 && i < 11 ? 'P1 Ramp' : (i >= 11 && i < 16 ? 'P2 Maint' : 'P3 Dryback')
        }));
    }

    // Format real data - take last 48 points (~24h)
    return historyData.slice(-48).map((d: any) => {
        const hour = new Date(d.timestamp).getHours();
        return {
            time: new Date(d.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            vwc: d.substrateHumidity || 0,
            ec: 2.5, // EC not tracked yet - placeholder
            temp: d.temperature || 0,
            phase: hour >= 6 && hour < 11 ? 'P1 Ramp' : (hour >= 11 && hour < 16 ? 'P2 Maint' : 'P3 Dryback')
        };
    });
};

// --- SUB-COMPONENTS ---

const PumpDeck = ({
    active,
    onShot,
    onStop,
    shotVolume,
    setShotVolume
}: {
    active: boolean;
    onShot: () => void;
    onStop: () => void;
    shotVolume: number;
    setShotVolume: (v: number) => void;
}) => (
    <Paper sx={{
        p: 3,
        borderRadius: '20px',
        background: active
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
            : 'var(--glass-bg)',
        border: active ? '1px solid #22c55e' : 'var(--glass-border)',
        backdropFilter: 'var(--backdrop-blur)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Zap size={20} className={active ? "text-green-500 fill-current" : "text-gray-400"} />
                    Solenoid Valve 1
                </Typography>
                <Typography variant="caption" color="text.secondary">Main Line • 24V AC</Typography>
            </Box>
            <Box sx={{
                px: 2,
                py: 0.5,
                borderRadius: '12px',
                bgcolor: active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(128, 128, 128, 0.1)',
                border: active ? '1px solid #22c55e' : '1px solid rgba(128, 128, 128, 0.2)'
            }}>
                <Typography variant="caption" fontWeight="bold" sx={{ color: active ? '#22c55e' : 'text.secondary' }}>
                    {active ? 'ACTIVO' : 'STANDBY'}
                </Typography>
            </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
            <Button
                variant="contained"
                color="success"
                startIcon={<Play size={16} />}
                disabled={active}
                onClick={onShot}
                fullWidth
                sx={{ borderRadius: '12px', fontWeight: 'bold' }}
            >
                SHOT MANUAL
            </Button>
            <Button
                variant="outlined"
                color="error"
                startIcon={<Square size={16} />}
                disabled={!active}
                onClick={onStop}
                fullWidth
                sx={{ borderRadius: '12px', fontWeight: 'bold' }}
            >
                STOP
            </Button>
        </Box>

        {/* Volume Quick Adjust - Uses shotVolume and setShotVolume props */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">Shot:</Typography>
            {[50, 100, 150, 200].map(vol => (
                <Button
                    key={vol}
                    size="small"
                    variant={shotVolume === vol ? 'contained' : 'outlined'}
                    onClick={() => setShotVolume(vol)}
                    sx={{
                        minWidth: 50,
                        py: 0.25,
                        fontSize: '0.7rem',
                        borderRadius: '8px',
                        bgcolor: shotVolume === vol ? 'rgba(34, 197, 94, 0.9)' : 'transparent',
                        borderColor: 'rgba(34, 197, 94, 0.4)'
                    }}
                >
                    {vol}ml
                </Button>
            ))}
        </Box>

        {active && (
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', bgcolor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
        )}
    </Paper>
);

const MetricCard = ({ label, value, unit, icon: Icon, color }: any) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Icon size={16} color={color} />
        </Box>
        <Typography variant="h5" fontWeight="bold" sx={{ color: color }}>
            {value} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{unit}</Typography>
        </Typography>
    </Paper>
);


const Irrigation: React.FC = () => {
    const { settings } = useCropSteering();
    const [strategyData, setStrategyData] = useState<any[]>([]);
    const [valveActive, setValveActive] = useState(false);
    const [shotVolume, setShotVolume] = useState(100);
    const [tabIndex, setTabIndex] = useState(0);
    const [automationEnabled, setAutomationEnabled] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const historyData = await apiClient.getSensorHistory();
                setStrategyData(formatStrategyData(historyData));
            } catch (e) {
                console.warn('[IRRIGATION] Could not load history:', e);
                setStrategyData(formatStrategyData([])); // Use placeholder
            }
        };
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleManualShot = async () => {
        try {
            const pumpRate = settings.pumpRateMlPerMin || 60; // ml/min from settings
            const durationMs = Math.round((shotVolume / pumpRate) * 60 * 1000);

            console.log(`[IRRIGATION] Executing shot: ${shotVolume}ml for ${durationMs}ms`);

            await apiClient.pulseDevice('bombaControlador', durationMs);
            setValveActive(true);

            // Auto-update UI after pulse completes
            setTimeout(() => {
                setValveActive(false);
            }, durationMs + 500); // Add 500ms buffer

        } catch (e) {
            console.error('[IRRIGATION] Shot failed:', e);
            alert('Error al ejecutar riego');
        }
    };

    const handleStop = async () => {
        try {
            await apiClient.controlDevice('bombaControlador', 'off');
            setValveActive(false);
        } catch (e) {
            console.error('[IRRIGATION] Stop failed:', e);
            alert('Error al detener bomba');
        }
    };

    return (

        <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" className="ai-gradient-text" sx={{ mb: 1 }}>
                        Riego de Precisión
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Centro de Control Hidrológico & Crop Steering
                    </Typography>
                </Box>
                <Chip
                    icon={<Activity size={16} />}
                    label="P3: DRYBACK PHASE"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 'bold', borderRadius: '8px' }}
                />
            </Box>

            <Grid container spacing={3}>
                {/* TOP ROW: ADVANCED STRATEGY VISUALIZER */}
                <Grid item xs={12} lg={8}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '24px', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', height: '100%', minHeight: 450 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">Estrategia Crop Steering</Typography>
                                <Typography variant="caption" color="text.secondary">Visualización de Fases P1/P2/P3 y Métricas</Typography>
                            </Box>

                            <Stack direction="row" spacing={2}>
                                <Chip label="P1 Ramp" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: '#3b82f6', border: 1 }} />
                                <Chip label="P2 Maint" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: '#22c55e', border: 1 }} />
                                <Chip label="P3 Dry" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444', border: 1 }} />
                            </Stack>
                        </Box>

                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={strategyData}>
                                <defs>
                                    <linearGradient id="colorVwc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />

                                {/* Y-Axis Left: VWC */}
                                <YAxis yAxisId="left" domain={[20, 80]} stroke="#3b82f6" fontSize={12} tickLine={false} axisLine={false} unit="%" width={30} />
                                {/* Y-Axis Right: EC */}
                                <YAxis yAxisId="right" orientation="right" domain={[1, 5]} stroke="#f59e0b" fontSize={12} tickLine={false} axisLine={false} width={30} />

                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                                />

                                {/* Phase Background Highlights */}
                                <ReferenceArea x1="6:00" x2="11:00" yAxisId="left" fill="#3b82f6" fillOpacity={0.05} />
                                <ReferenceArea x1="11:00" x2="16:00" yAxisId="left" fill="#22c55e" fillOpacity={0.05} />

                                {/* Data Series */}
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="vwc"
                                    name="VWC (Humedad)"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVwc)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="ec"
                                    name="Electroconductividad"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left" // Share left scale or create third
                                    type="monotone"
                                    dataKey="temp"
                                    name="Temp Raíz"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* RIGHT COLUMN: METRICS & AI */}
                <Grid item xs={12} lg={4}>
                    <Grid container spacing={2}>
                         {/* Metrics Grid */}
                        <Grid item xs={6}>
                            <MetricCard label="VWC Actual" value="44.2" unit="%" icon={Waves} color="#3b82f6" />
                        </Grid>
                        <Grid item xs={6}>
                            <MetricCard label="EC Sustrato" value="3.1" unit="dS/m" icon={Activity} color="#f59e0b" />
                        </Grid>
                        <Grid item xs={6}>
                            <MetricCard label="Temp Raíz" value="22.4" unit="°C" icon={Timer} color="#ef4444" />
                        </Grid>
                        <Grid item xs={6}>
                            <MetricCard label="Dryback (24h)" value="4.8" unit="%" icon={TrendingDown} color="#22c55e" />
                        </Grid>

                        {/* AI Insight */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2, borderRadius: '16px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <AlertCircle size={20} className="text-blue-400" />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#60a5fa' }}>AI Strategy Insight</Typography>
                                        <Typography variant="caption" sx={{ color: '#93c5fd', display: 'block', mt: 0.5 }}>
                                            La fase P1 está siendo muy suave. Aumenta el volumen de riego matutino +50mL para alcanzar el target de saturación más rápido.
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                {/* BOTTOM ROW: CONTROL & HISTORY TABS */}
                <Grid item xs={12}>
                    <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: '24px', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="inherit" indicatorColor="secondary">
                                <Tab icon={<Zap size={18} />} iconPosition="start" label="Pump Deck (Manual)" />
                                <Tab icon={<History size={18} />} iconPosition="start" label="Historial de Riego" />
                                <Tab icon={<Settings2 size={18} />} iconPosition="start" label="Automatización" />
                            </Tabs>
                        </Box>

                        <Box sx={{ p: 3 }}>
                            {tabIndex === 0 && (
                                <Grid container spacing={4}>
                                    <Grid item xs={12} md={5}>
                                        <PumpDeck
                                            active={valveActive}
                                            onShot={handleManualShot}
                                            onStop={handleStop}
                                            shotVolume={shotVolume}
                                            setShotVolume={setShotVolume}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={7}>
                                         <Typography variant="subtitle2" color="text.secondary" gutterBottom>Configuración de Disparo</Typography>
                                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                                            <Slider
                                                value={shotVolume}
                                                onChange={(_, v) => setShotVolume(v as number)}
                                                min={50}
                                                max={500}
                                                step={10}
                                                sx={{ color: '#22c55e', flex: 1 }}
                                            />
                                            <Typography fontWeight="bold" sx={{ minWidth: 80, textAlign: 'right' }}>
                                                {shotVolume}mL
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    ~{(shotVolume / 60).toFixed(1)}seg
                                                </Typography>
                                            </Typography>
                                         </Box>
                                         <Alert severity="info" sx={{ mt: 2 }} icon={<Droplet size={18} />}>
                                            <Typography variant="caption">
                                                Maceta: <strong>{settings.potSizeLiters}L</strong> |
                                                1% = {(settings.potSizeLiters * 10).toFixed(0)}mL
                                            </Typography>
                                         </Alert>
                                    </Grid>
                                </Grid>
                            )}

                            {tabIndex === 1 && (
                                <IrrigationTimeline showDetails={true} />
                            )}
                            {tabIndex === 2 && (
                                <AutomationPanel enabled={automationEnabled} onEnabledChange={setAutomationEnabled} />
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Irrigation;
