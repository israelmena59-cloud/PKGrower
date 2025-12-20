/**
 * Environment Page - Integrated with Crop Steering
 * AI-Coated Design & Dynamic VPD targets
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Switch, Button, Chip, Tabs, Tab, Slider, Stack, CircularProgress } from '@mui/material';
import { Thermometer, Droplet, Wind, Fan, Save, Leaf, Target, TrendingUp, TrendingDown, Activity, Zap, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { API_BASE_URL, apiClient } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';
import { VPDGauge } from '../components/cropsteering';
import AIContextPanel from '../components/common/AIContextPanel';

// --- SUB-COMPONENTS (Reusable Glass UI) ---

const GlassCard = ({ children, sx = {} }: { children: React.ReactNode, sx?: any }) => (
    <Paper elevation={0} sx={{
        p: 3,
        borderRadius: '24px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: 'var(--glass-border)',
        ...sx
    }}>
        {children}
    </Paper>
);

const MetricCard = ({ label, value, unit, icon: Icon, color, subValue }: any) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ p: 1, borderRadius: '12px', bgcolor: `${color}20`, color: color }}>
                <Icon size={20} />
            </Box>
            {subValue && <Chip label={subValue} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'text.secondary', fontSize: '0.7rem' }} />}
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff', mb: 0.5 }}>
            {value}<Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>{unit}</Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
);

interface EnvironmentSettings {
    enabled: boolean;
    mode: 'manual' | 'auto';
    humidifierTarget: number;
    extractorCycleOn: number;
    extractorCycleOff: number;
}

const Environment: React.FC = () => {
  const [settings, setSettings] = useState<EnvironmentSettings | null>(null);
  const [devices, setDevices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vpdData, setVpdData] = useState<any[]>([]);
  const [currentVpd, setCurrentVpd] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);

  // Crop Steering Integration
  const { currentStage, getTargetVPD, getTargetTemp, getTargetHumidity, updateConditions } = useCropSteering();

  const targets = {
    vpd: getTargetVPD(),
    temp: getTargetTemp(),
    humidity: getTargetHumidity()
  };

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => { if (active) setLoading(false); }, 5000);

    const fetchData = async () => {
        try {
            // 1. Settings
            let settingsData = {
                enabled: false, mode: 'manual', humidifierTarget: targets.humidity.dayMax,
                extractorCycleOn: 15, extractorCycleOff: 15
            };
            try {
                const setRes = await fetch(`${API_BASE_URL}/api/settings`);
                if (setRes.ok) {
                    const setData = await setRes.json();
                    if (setData.environment) settingsData = setData.environment;
                }
            } catch (e) { console.warn("Settings API failed, using defaults"); }
            if (active) setSettings(settingsData as EnvironmentSettings);

            // 2. Devices
            const devs = await apiClient.getDeviceStates();
            if (active) setDevices(devs);

            // 3. Sensor Data
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();

            const currentTemp = sensorsData.temperature || 0;
            const currentHum = sensorsData.humidity || 0;
            const currentVpdVal = sensorsData.vpd || 0;

            // Update crop steering context
            updateConditions({
              temperature: currentTemp,
              humidity: currentHum,
              vwc: sensorsData.substrateHumidity || 50
            });

            // 4. Get real history data for chart (past 24h)
            try {
                const historyData = await apiClient.getSensorHistory();
                if (historyData && historyData.length > 0) {
                    // Format for chart - take last 48 points for ~24h
                    const chartData = historyData.slice(-48).map((d: any) => ({
                        time: new Date(d.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                        vpd: d.vpd?.toFixed(2) || 0,
                        temp: d.temperature?.toFixed(1) || 0,
                        hum: d.humidity?.toFixed(0) || 0
                    }));
                    if (active) setVpdData(chartData);
                }
            } catch (histErr) {
                console.warn('Could not load VPD history:', histErr);
            }

            if (active) {
                setCurrentVpd(currentVpdVal);
            }
        } catch (e) { console.error(e); }
        finally { if (active) setLoading(false); }
    };
    fetchData();

    // Polling
    const interval = setInterval(async () => {
        try {
            const devs = await apiClient.getDeviceStates();
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();
            if (active) {
                setDevices(devs);
                setCurrentVpd(sensorsData.vpd || 0);
                updateConditions({ temperature: sensorsData.temperature, humidity: sensorsData.humidity, vwc: sensorsData.substrateHumidity || 50 });
            }
        } catch(e) {}
    }, 5000);

    return () => { active = false; clearTimeout(timeout); clearInterval(interval); };
  }, [updateConditions, targets.humidity.dayMax]);

  const handleSave = async () => {
      if (!settings) return;
      setSaving(true);
      try {
        await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ environment: settings })
        });
      } finally { setSaving(false); }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
      setDevices((prev: any) => ({ ...prev, [id]: !currentStatus }));
      try { await apiClient.controlDevice(id, !currentStatus ? 'on' : 'off'); }
      catch (e) { setDevices((prev: any) => ({ ...prev, [id]: currentStatus })); }
  };

  if (loading || !settings) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stageLabel = currentStage.replace('_', ' ').toUpperCase();

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
                <Typography variant="h4" fontWeight="800" className="ai-gradient-text" sx={{ mb: 1 }}>
                    Ambiente & VPD
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Control Climático Inteligente • {stageLabel}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    startIcon={<RefreshCw size={18} />}
                    variant="outlined"
                    sx={{ borderRadius: '12px', color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                    Sync
                </Button>
                <Button
                    startIcon={<Save size={18} />}
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ borderRadius: '12px', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </Box>
      </Box>

      {/* AI CONTEXT PANEL - Environment Insights */}
      <Box sx={{ mb: 3 }}>
          <AIContextPanel
              context="environment"
              temperature={devices.sensorAmbiente?.temperature || 0}
              humidity={devices.sensorAmbiente?.humidity || 0}
              vpd={currentVpd}
              vwc={0}
              compact
          />
      </Box>

      <Grid container spacing={3}>
        {/* TOP ROW: METRIC CARDS */}
        <Grid item xs={12} md={3}>
            <MetricCard
                label="Temperatura"
                value={devices.sensorAmbiente?.temperature || 24.5}
                unit="°C"
                icon={Thermometer}
                color="#f59e0b"
                subValue={`Target: ${targets.temp.dayMax}°C`}
            />
        </Grid>
        <Grid item xs={12} md={3}>
             <MetricCard
                label="Humedad Relativa"
                value={devices.sensorAmbiente?.humidity || 60}
                unit="%"
                icon={Droplet}
                color="#3b82f6"
                subValue={`Target: ${targets.humidity.dayMax}%`}
            />
        </Grid>
        <Grid item xs={12} md={3}>
            <MetricCard
                label="Déficit Presión (VPD)"
                value={currentVpd.toFixed(2)}
                unit="kPa"
                icon={Activity}
                color={currentVpd >= targets.vpd.min && currentVpd <= targets.vpd.max ? '#22c55e' : '#ef4444'}
                subValue="Óptimo para fase"
            />
        </Grid>
        <Grid item xs={12} md={3}>
             <MetricCard
                label="Estado Extractor"
                value={devices.extractorControlador ? 'ON' : 'OFF'}
                unit=""
                icon={Wind}
                color="#8b5cf6"
                subValue={settings.mode === 'auto' ? 'Automático' : 'Manual'}
            />
        </Grid>

        {/* MIDDLE ROW: CHART & GAUGE */}
        <Grid item xs={12} lg={8}>
            <GlassCard>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold">Histórico Climático (24h)</Typography>
                    <Stack direction="row" spacing={2}>
                        <Chip label="Temp" size="small" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 1, borderColor: '#f59e0b' }} />
                        <Chip label="Humedad" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 1, borderColor: '#3b82f6' }} />
                    </Stack>
                </Box>
                <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={vpdData}>
                        <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                        <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" domain={[15, 35]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="°C" width={30} />
                        <YAxis yAxisId="right" orientation="right" domain={[30, 90]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" width={30} />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                        <Area yAxisId="right" type="monotone" dataKey="hum" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHum)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </GlassCard>
        </Grid>

        <Grid item xs={12} lg={4}>
            <GlassCard sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                 <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, width: '100%' }}>VPD en Tiempo Real</Typography>
                 <Box sx={{ transform: 'scale(1.1)', my: 2 }}>
                    <VPDGauge size="medium" showRecommendations={false} value={currentVpd} />
                 </Box>
                 <Box sx={{ mt: 2, textAlign: 'center' }}>
                     <Typography variant="body2" color="text.secondary">Rango Objetivo</Typography>
                     <Typography variant="h6" fontWeight="bold" sx={{ color: '#22c55e' }}>
                         {targets.vpd.min} - {targets.vpd.max} kPa
                     </Typography>
                 </Box>
            </GlassCard>
        </Grid>

        {/* BOTTOM ROW: CONTROLS */}
        <Grid item xs={12}>
            <GlassCard>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="inherit" indicatorColor="secondary" sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
                    <Tab label="Control Manual" icon={<Zap size={18} />} iconPosition="start" />
                    <Tab label="Automatización" icon={<Target size={18} />} iconPosition="start" />
                </Tabs>

                {tabIndex === 0 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Fan size={24} className={devices.extractorControlador ? "text-purple-500" : "text-gray-500"} />
                                    <Box>
                                        <Typography fontWeight="bold">Extractor</Typography>
                                        <Typography variant="caption" color="text.secondary">Salida Aire</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={!!devices.extractorControlador} onChange={() => handleToggle('extractorControlador', devices.extractorControlador)} color="secondary" />
                             </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Droplet size={24} className={devices.humidifier ? "text-blue-500" : "text-gray-500"} />
                                    <Box>
                                        <Typography fontWeight="bold">Humidificador</Typography>
                                        <Typography variant="caption" color="text.secondary">Xiaomi</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={!!devices.humidifier} onChange={() => handleToggle('humidifier', devices.humidifier)} color="info" />
                             </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Wind size={24} className={devices.deshumidifier ? "text-orange-500" : "text-gray-500"} />
                                    <Box>
                                        <Typography fontWeight="bold">Deshumidificador</Typography>
                                        <Typography variant="caption" color="text.secondary">Control Secado</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={!!devices.deshumidifier} onChange={() => handleToggle('deshumidifier', devices.deshumidifier)} color="warning" />
                             </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Fan size={24} className={devices.fans_circ ? "text-green-500" : "text-gray-500"} />
                                    <Box>
                                        <Typography fontWeight="bold">Ventiladores</Typography>
                                        <Typography variant="caption" color="text.secondary">Circulación</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={!!devices.fans_circ} onChange={() => handleToggle('fans_circ', devices.fans_circ)} color="success" />
                             </Box>
                        </Grid>
                    </Grid>
                )}

                {tabIndex === 1 && (
                     <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography gutterBottom>Trigger Humidificador (% HR)</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Slider
                                    value={settings.humidifierTarget}
                                    onChange={(_, v) => setSettings({ ...settings, humidifierTarget: v as number })}
                                    min={30} max={90} sx={{ color: '#3b82f6' }}
                                />
                                <Typography fontWeight="bold">{settings.humidifierTarget}%</Typography>
                            </Box>
                        </Grid>
                     </Grid>
                )}
            </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Environment;
