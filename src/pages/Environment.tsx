import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, CardHeader, CardContent, CircularProgress, Alert, Divider, TextField, Switch, Button } from '@mui/material';
import { Thermometer, Droplet, Wind, Fan, Save } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { API_BASE_URL, apiClient } from '../api/client';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';

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

  // VPD Calculation Helpers
  const calculateSVP = (T: number) => 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
  const calculateVPD = (T: number, RH: number) => {
      if (!T || !RH) return 0;
      const svp = calculateSVP(T);
      return svp * (1 - (RH / 100));
  };

  useEffect(() => {
    let active = true;

    // Timeout to force stop loading if API hangs
    const timeout = setTimeout(() => {
        if (active) setLoading(false);
    }, 5000);

    const fetchData = async () => {
        try {
            // 1. Settings (Fail-Safe)
            let settingsData = {
                enabled: false, mode: 'manual', humidifierTarget: 60,
                extractorCycleOn: 15, extractorCycleOff: 15
            };
            try {
                const setRes = await fetch(`${API_BASE_URL}/api/settings`);
                if (setRes.ok) {
                    const setData = await setRes.json();
                    if (setData.environment) settingsData = setData.environment;
                }
            } catch (e) {
                console.warn("Settings API failed, using defaults");
            }
            if (active) setSettings(settingsData as EnvironmentSettings);

            // 2. Devices (Switches)
            const devs = await apiClient.getDeviceStates();
            if (active) setDevices(devs);

            // 3. Real Sensor Data
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();

            // ... Logic continues ...

            // Generate VPD Chart Data
            const mock = [];
            const currentTemp = sensorsData.temperature || 0;
            const currentHum = sensorsData.humidity || 0;
            const currentVpdVal = sensorsData.vpd || 0;

            for (let i = 0; i < 24; i++) {
                mock.push({ time: `${i}:00`, vpd: currentVpdVal, temp: currentTemp, hum: currentHum });
            }
            if (active) {
                setVpdData(mock);
                setCurrentVpd(currentVpdVal);
                setDevices((prev: any) => ({
                    ...prev,
                    sensorAmbiente: {
                        temperature: sensorsData.temperature,
                        humidity: sensorsData.humidity,
                        isEstimate: sensorsData.isEstimate
                    }
                }));
            }

        } catch (e) {
            console.error(e);
        } finally {
            if (active) setLoading(false);
        }
    };
    fetchData();

    // Polling Interval
    const interval = setInterval(async () => {
        try {
            const devs = await apiClient.getDeviceStates();
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();

            if (active) {
                setDevices((prev: any) => ({
                    ...devs,
                    sensorAmbiente: {
                        temperature: sensorsData.temperature,
                        humidity: sensorsData.humidity,
                        isEstimate: sensorsData.isEstimate
                    }
                }));
                setCurrentVpd(sensorsData.vpd || 0);
            }
        } catch(e) { console.error("Poll failed", e); }
    }, 5000);

    return () => { active = false; clearTimeout(timeout); clearInterval(interval); };
  }, []);

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

  const getVpdStatus = (vpd: number) => {
      if (vpd < 0.4) return { label: 'Peligro (Moho)', color: 'error' };
      if (vpd < 0.8) return { label: 'Bajo (Veg Temprano)', color: 'info' };
      if (vpd < 1.2) return { label: 'Ideal (Veg/Gen)', color: 'success' };
      if (vpd < 1.6) return { label: 'Alto (Gen Tardía)', color: 'warning' };
      return { label: 'Extremo (Estres)', color: 'error' };
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
      // Optimistic
      setDevices((prev: any) => ({ ...prev, [id]: !currentStatus }));
      try {
          await apiClient.controlDevice(id, !currentStatus ? 'on' : 'off');
      } catch (e) {
         console.error(e);
         // Revert
         setDevices((prev: any) => ({ ...prev, [id]: currentStatus }));
      }
  };

  if (loading || !settings) return <Box sx={{ p: 4 }}><CircularProgress /></Box>;

  const vpdInfo = getVpdStatus(currentVpd);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Clima y VPD</Typography>
        <Alert severity={vpdInfo.color as any} sx={{ py: 0, alignItems: 'center' }}>
            VPD Actual: <strong>{currentVpd} kPa</strong> ({vpdInfo.label})
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT: VPD Monitor */}
        <Grid item xs={12} lg={8}>
            <Box className="glass-panel" sx={{
                height: '100%',
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader title="Monitor D.P.V. (Presion de Vapor)" subheader="Relación Temperatura / Humedad" titleTypographyProps={{ fontWeight: 'bold' }} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ height: 300, p: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={vpdData}>
                            <defs>
                                <linearGradient id="colorVpdEnv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorTempEnv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorHumEnv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="white" />
                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 3]} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(28, 28, 30, 0.95)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(20px)'
                                }}
                            />
                            {/* Reference lines for ideal VPD zone */}
                            <ReferenceLine yAxisId="right" y={0.8} stroke="#34C759" strokeDasharray="3 3" />
                            <ReferenceLine yAxisId="right" y={1.2} stroke="#34C759" strokeDasharray="3 3" />

                            {/* Temperature - iOS Red */}
                            <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#FF3B30" strokeWidth={2} fillOpacity={1} fill="url(#colorTempEnv)" name="Temp °C" />
                            {/* Humidity - iOS Blue */}
                            <Area yAxisId="left" type="monotone" dataKey="hum" stroke="#007AFF" strokeWidth={2} fillOpacity={1} fill="url(#colorHumEnv)" name="Humedad %" />
                            {/* VPD - iOS Green (prominent) */}
                            <Area yAxisId="right" type="monotone" dataKey="vpd" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorVpdEnv)" name="VPD kPa" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Grid>

        {/* RIGHT: Controls */}
        <Grid item xs={12} lg={4}>
            {/* REAL SENSOR DATA */}
            <Box className="glass-panel" sx={{
                mb: 3,
                borderLeft: devices.sensorAmbiente?.isEstimate ? '4px solid #ff9800' : '4px solid #00e676',
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader title="Condiciones Actuales" subheader={devices.sensorAmbiente?.isEstimate ? "Sensor Ambiente Desconectado. Usando promedio sustrato." : (devices.sensorAmbiente ? "Sensor: RH/TH" : "Esperando datos...")} avatar={<Thermometer />} titleTypographyProps={{ fontWeight: 'bold' }} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Thermometer className={`w-8 h-8 mx-auto mb-1 ${devices.sensorAmbiente?.isEstimate ? 'text-orange-500' : 'text-green-500'}`} />
                                <Typography variant="h4">{devices.sensorAmbiente?.temperature?.toFixed(1) || '--'}°C</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {devices.sensorAmbiente?.isEstimate ? 'Estimado (Sustrato)' : 'Temperatura'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Droplet className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                                <Typography variant="h4">{devices.sensorAmbiente?.humidity?.toFixed(0) || '--'}%</Typography>
                                <Typography variant="caption" color="text.secondary">Humedad</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Box>

            {/* EXTRACTOR CONFIG */}
            <Box className="glass-panel" sx={{
                mb: 3,
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader
                    title="Renovación de Aire"
                    subheader="Control Cíclico Extractor"
                    avatar={<Wind />}
                    titleTypographyProps={{ fontWeight: 'bold' }}
                    action={
                        <Switch
                            checked={settings.enabled && settings.mode === 'auto'}
                            onChange={(e) => setSettings({...settings, enabled: e.target.checked, mode: e.target.checked ? 'auto' : 'manual'})}
                        />
                    }
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={6}>
                            <TextField
                                label="Minutos ON"
                                type="number"
                                fullWidth
                                value={settings.extractorCycleOn}
                                onChange={(e) => setSettings({...settings, extractorCycleOn: parseFloat(e.target.value)})}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Minutos OFF"
                                type="number"
                                fullWidth
                                value={settings.extractorCycleOff}
                                onChange={(e) => setSettings({...settings, extractorCycleOff: parseFloat(e.target.value)})}
                            />
                        </Grid>
                    </Grid>
                    <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                        Ciclo Total: {settings.extractorCycleOn + settings.extractorCycleOff} minutos.
                    </Alert>
                    <Box sx={{ mt: 2 }}>
                        <DeviceSwitch name="Extractor Manual" icon={<Fan />} isOn={devices.extractorControlador} onToggle={() => handleToggle('extractorControlador', devices.extractorControlador)} />
                    </Box>
                </CardContent>
            </Box>


            {/* HUMIDITY CONFIG */}
            <Box className="glass-panel" sx={{
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader title="Humedad" avatar={<Droplet />} titleTypographyProps={{ fontWeight: 'bold' }} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                   <Box sx={{ mb: 2 }}>
                        <TextField
                            label="Humedad Objetivo (%)"
                            type="number"
                            fullWidth
                            value={settings.humidifierTarget}
                            onChange={(e) => setSettings({...settings, humidifierTarget: parseFloat(e.target.value)})}
                            helperText="El humidificador intentará mantener este valor (WIP)"
                        />
                   </Box>
                   <DeviceSwitch name="Humidificador" icon={<Droplet />} isOn={devices.humidifier} onToggle={() => handleToggle('humidifier', devices.humidifier)} />

                   <Box sx={{ mt: 3, textAlign: 'right' }}>
                        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<Save />}>
                            Actualizar Todo
                        </Button>
                   </Box>
                </CardContent>
            </Box>
        </Grid>
      </Grid>

      {/* HISTORICAL CHART */}
      <Box sx={{ mt: 3 }}>
          <HistoryChart type="environment" title="Historial Climático" />
      </Box>
    </Box>
  );
};

export default Environment;
