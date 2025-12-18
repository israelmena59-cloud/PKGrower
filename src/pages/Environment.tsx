/**
 * Environment Page - Integrated with Crop Steering
 * Dynamic VPD targets and recommendations based on growth stage
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, CardHeader, CardContent, CircularProgress, Alert, Divider, TextField, Switch, Button, Chip, LinearProgress } from '@mui/material';
import { Thermometer, Droplet, Wind, Fan, Save, Leaf, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { API_BASE_URL, apiClient } from '../api/client';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';
import { useCropSteering } from '../context/CropSteeringContext';
import { VPDGauge } from '../components/cropsteering';

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

  // Crop Steering Integration
  const {
    settings: cropSettings,
    currentStage,
    getTargetVPD,
    getTargetTemp,
    getTargetHumidity,
    environmentStatus,
    recommendations,
    updateConditions
  } = useCropSteering();

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

            // Generate chart data
            const mock = [];
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
        } catch (e) { console.error(e); }
        finally { if (active) setLoading(false); }
    };
    fetchData();

    const interval = setInterval(async () => {
        try {
            const devs = await apiClient.getDeviceStates();
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();
            if (active) {
                setDevices((prev: any) => ({
                    ...devs,
                    sensorAmbiente: { temperature: sensorsData.temperature, humidity: sensorsData.humidity, isEstimate: sensorsData.isEstimate }
                }));
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

  // Status based on crop steering
  const getVpdStatusFromStage = () => {
    const vpd = currentVpd;
    if (vpd < targets.vpd.min - 0.2) return { label: 'Crítico Bajo', color: 'error', icon: <TrendingDown size={16} /> };
    if (vpd < targets.vpd.min) return { label: 'Bajo para etapa', color: 'warning', icon: <TrendingDown size={16} /> };
    if (vpd <= targets.vpd.max) return { label: 'Óptimo', color: 'success', icon: <Target size={16} /> };
    if (vpd < targets.vpd.max + 0.2) return { label: 'Alto para etapa', color: 'warning', icon: <TrendingUp size={16} /> };
    return { label: 'Crítico Alto', color: 'error', icon: <TrendingUp size={16} /> };
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
      setDevices((prev: any) => ({ ...prev, [id]: !currentStatus }));
      try { await apiClient.controlDevice(id, !currentStatus ? 'on' : 'off'); }
      catch (e) { setDevices((prev: any) => ({ ...prev, [id]: currentStatus })); }
  };

  if (loading || !settings) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Clima y VPD</Typography>
        <Box className="loading-shimmer glass-panel" sx={{ height: 60, borderRadius: '16px', mb: 2 }} />
        <Box className="loading-shimmer glass-panel" sx={{ height: 400, borderRadius: '16px' }} />
      </Box>
    );
  }

  const vpdInfo = getVpdStatusFromStage();
  const stageLabel = currentStage.replace('_', ' ').toUpperCase();

  return (
    <Box sx={{ p: 2 }}>
      {/* Header with Glass Styling */}
      <Box className="glass-panel" sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        p: 2,
        borderRadius: '16px',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e'
          }}>
            <Wind size={28} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">Clima y VPD</Typography>
            <Typography variant="caption" color="text.secondary">
              Etapa: {stageLabel}
            </Typography>
          </Box>
        </Box>
        <Alert
          severity={vpdInfo.color as any}
          icon={vpdInfo.icon}
          sx={{ py: 0.5, alignItems: 'center', borderRadius: '12px' }}
        >
          VPD: <strong>{currentVpd.toFixed(2)} kPa</strong> | Target: {targets.vpd.min.toFixed(1)}-{targets.vpd.max.toFixed(1)} ({vpdInfo.label})
        </Alert>
      </Box>

      {/* Recommendations Banner */}
      {environmentStatus.overall !== 'optimal' && recommendations.length > 0 && (
        <Alert severity={environmentStatus.overall === 'danger' ? 'error' : 'warning'} sx={{ mb: 2 }}>
          💡 {recommendations[0]}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* LEFT: VPD Monitor with Stage Zones */}
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
                <CardHeader
                  title="Monitor D.P.V. (Presión de Vapor)"
                  subheader={`Zona óptima para ${stageLabel}: ${targets.vpd.min.toFixed(1)} - ${targets.vpd.max.toFixed(1)} kPa`}
                  titleTypographyProps={{ fontWeight: 'bold' }}
                />
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
                                    <stop offset="5%" stopColor="#FF9500" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#FF9500" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorHumEnv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="white" />
                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                            <YAxis
                              yAxisId="vpd"
                              domain={[0, 2.5]}
                              stroke="#34C759"
                              tick={{ fontSize: 10 }}
                              label={{ value: 'VPD (kPa)', angle: -90, position: 'insideLeft', fill: '#34C759', fontSize: 10 }}
                            />
                            <YAxis
                              yAxisId="temp"
                              orientation="right"
                              domain={[15, 35]}
                              stroke="#FF9500"
                              tick={{ fontSize: 10 }}
                              label={{ value: '°C / %', angle: 90, position: 'insideRight', fill: '#FF9500', fontSize: 10 }}
                            />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: 'rgba(28, 28, 30, 0.95)', borderRadius: '16px', border: 'none' }}
                              formatter={(value: any, name: string) => {
                                if (name === 'VPD') return [`${Number(value).toFixed(2)} kPa`, name];
                                if (name === 'Temp') return [`${Number(value).toFixed(1)}°C`, 'Temperatura'];
                                if (name === 'Hum') return [`${Number(value).toFixed(0)}%`, 'Humedad'];
                                return [value, name];
                              }}
                            />

                            {/* Optimal VPD Zone from Crop Steering */}
                            <ReferenceArea yAxisId="vpd" y1={targets.vpd.min} y2={targets.vpd.max} fill="#34C759" fillOpacity={0.1} />
                            <ReferenceLine yAxisId="vpd" y={targets.vpd.min} stroke="#34C759" strokeDasharray="3 3" />
                            <ReferenceLine yAxisId="vpd" y={targets.vpd.target} stroke="#34C759" strokeWidth={2} />
                            <ReferenceLine yAxisId="vpd" y={targets.vpd.max} stroke="#34C759" strokeDasharray="3 3" />

                            {/* Danger zones */}
                            <ReferenceArea yAxisId="vpd" y1={0} y2={0.4} fill="#FF3B30" fillOpacity={0.05} />
                            <ReferenceArea yAxisId="vpd" y1={1.8} y2={2.5} fill="#FF3B30" fillOpacity={0.05} />

                            {/* Data Lines */}
                            <Area yAxisId="vpd" type="monotone" dataKey="vpd" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorVpdEnv)" name="VPD" />
                            <Area yAxisId="temp" type="monotone" dataKey="temp" stroke="#FF9500" strokeWidth={2} fillOpacity={0.3} fill="url(#colorTempEnv)" name="Temp" />
                            <Area yAxisId="temp" type="monotone" dataKey="hum" stroke="#007AFF" strokeWidth={2} fillOpacity={0.3} fill="url(#colorHumEnv)" name="Hum" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Grid>

        {/* RIGHT: Controls with Stage Targets */}
        <Grid item xs={12} lg={4}>
            {/* Current Conditions vs Targets */}
            <Box className="glass-panel" sx={{
                mb: 2,
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader
                  title="Condiciones vs Targets"
                  subheader={`Etapa: ${stageLabel}`}
                  avatar={<Target size={20} />}
                  titleTypographyProps={{ fontWeight: 'bold' }}
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    {/* Temperature */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2"><Thermometer size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Temperatura</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {devices.sensorAmbiente?.temperature?.toFixed(1) || '--'}°C
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Target: {targets.temp.dayMin}-{targets.temp.dayMax}°C (día)
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.max(0, ((devices.sensorAmbiente?.temperature || 0) / targets.temp.dayMax) * 100))}
                        sx={{
                          mt: 0.5,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: environmentStatus.temperature === 'optimal' ? '#34C759' : environmentStatus.temperature === 'warning' ? '#FF9500' : '#FF3B30'
                          }
                        }}
                      />
                    </Box>

                    {/* Humidity */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2"><Droplet size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Humedad</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {devices.sensorAmbiente?.humidity?.toFixed(0) || '--'}%
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Target: {targets.humidity.dayMin}-{targets.humidity.dayMax}% (día)
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={devices.sensorAmbiente?.humidity || 0}
                        sx={{
                          mt: 0.5,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: environmentStatus.humidity === 'optimal' ? '#34C759' : environmentStatus.humidity === 'warning' ? '#FF9500' : '#FF3B30'
                          }
                        }}
                      />
                    </Box>

                    {/* DIF (Day/Night Differential) */}
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                      <Typography variant="caption" fontWeight="bold">Diferencial Día/Noche (DIF)</Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Recomendado: +{(targets.temp.dayMax - targets.temp.nightMax).toFixed(0)}°C durante el día
                      </Typography>
                    </Box>
                </CardContent>
            </Box>

            {/* VPD Gauge Mini */}
            <Box sx={{ mb: 2 }}>
              <VPDGauge size="small" showRecommendations={false} />
            </Box>

            {/* Device Controls */}
            <Box className="glass-panel" sx={{
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader title="Controles" avatar={<Wind />} titleTypographyProps={{ fontWeight: 'bold' }} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                   <Box sx={{ mb: 2 }}>
                     <DeviceSwitch name="Extractor" icon={<Fan />} isOn={devices.extractorControlador} onToggle={() => handleToggle('extractorControlador', devices.extractorControlador)} />
                   </Box>
                   <Box sx={{ mb: 2 }}>
                     <DeviceSwitch name="Humidificador" icon={<Droplet />} isOn={devices.humidifier} onToggle={() => handleToggle('humidifier', devices.humidifier)} />
                   </Box>
                   <Box sx={{ mb: 2 }}>
                     <DeviceSwitch name="Deshumidificador" icon={<Wind />} isOn={devices.deshumidificador} onToggle={() => handleToggle('deshumidificador', devices.deshumidificador)} />
                   </Box>
                   <Button variant="contained" fullWidth onClick={handleSave} disabled={saving} startIcon={<Save />}>
                       Guardar Configuración
                   </Button>
                </CardContent>
            </Box>
        </Grid>
      </Grid>

      {/* Historical Chart */}
      <Box sx={{ mt: 3 }}>
          <HistoryChart type="environment" title="Historial Climático" />
      </Box>
    </Box>
  );
};

export default Environment;
