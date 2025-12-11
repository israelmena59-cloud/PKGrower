// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import SensorCard from '../components/dashboard/SensorCard';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';
import { SoilSensorsGrid } from '../components/dashboard/SoilSensorsGrid';
import { CameraControl } from '../components/camera/CameraControl';
import { HumidifierExtractorControl } from '../components/environment/HumidifierExtractorControl';
import { Thermometer, Droplet, Wind, Lightbulb, Fan, Droplets, Settings, RefreshCw, Sprout, Leaf, Activity, Router } from 'lucide-react'; // Added Router
import { Card, CardHeader, CardContent, Typography, Grid, Box, IconButton, ToggleButton, ToggleButtonGroup, Chip, Paper } from '@mui/material';
import { apiClient, type SensorData, type DeviceStates } from '../api/client'
import ConfigModal from '../components/dashboard/ConfigModal';
import { SoilChart } from '../components/dashboard/SoilChart';
import { CropSteeringPanel } from '../components/dashboard/CropSteeringPanel';
import AICopilotWidget from '../components/dashboard/AICopilotWidget';
import { VPDStageChart } from '../components/dashboard/VPDStageChart';

const Dashboard: React.FC = () => {
  const [latestSensors, setLatestSensors] = useState<SensorData | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<DeviceStates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [phase, setPhase] = useState<'vegetative' | 'generative'>('vegetative');
  const [timeOfDay, setTimeOfDay] = useState('Día');

  // NEW STATE
  const [deviceMeta, setDeviceMeta] = useState<any[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    setTimeOfDay(hour >= 6 && hour < 18 ? 'Día' : 'Noche');
  }, []);

  const handlePhaseChange = (
    event: React.MouseEvent<HTMLElement>,
    newPhase: 'vegetative' | 'generative',
  ) => {
    if (newPhase !== null) setPhase(newPhase);
  };

  // NEW FUNCTION
  const fetchMeta = async () => {
       try {
           const res = await fetch('http://localhost:3000/api/devices/list');
           if (res.ok) {
               const json = await res.json();
               setDeviceMeta(json);
           }
       } catch (e) {
           console.error("Meta fetch error", e);
       }
  };

  const fetchData = async () => {
    try {
      let latestSensorsData: SensorData | null = null;
      let historyData: SensorData[] = [];
      let devicesData: Partial<DeviceStates> = {};

      try { latestSensorsData = await apiClient.getLatestSensors(); } catch(e) { console.warn('Diff sensors', e); }
      try { historyData = await apiClient.getSensorHistory(); } catch(e) { console.warn('Diff history', e); }
      try { devicesData = await apiClient.getDeviceStates(); } catch(e) { console.warn('Diff devices', e); }

      setLatestSensors(latestSensorsData || { temperature: 0, humidity: 0, substrateHumidity: 0, vpd: 0 } as any);
      setSensorHistory(historyData || []);
      setDevices((devicesData || {}) as DeviceStates);
      setError(null);
    } catch (globalError) {
      console.error("Critical failure fetching data:", globalError);
      setError(null);
    }
  };

  const handleRefresh = async () => {
      setRefreshing(true);
      try {
          await apiClient.refreshDevices();
          await fetchData();
      } catch (e) {
          console.error('Refresh failed', e);
      } finally {
          setTimeout(() => setRefreshing(false), 800);
      }
  };

  useEffect(() => {
    fetchData();
    fetchMeta(); // NEW
    const interval = setInterval(() => {
        fetchData();
        if (Math.random() > 0.8) fetchMeta(); // Occasional refresh
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (deviceId: keyof DeviceStates) => {
      const currentState = devices?.[deviceId] || false;
      const action = currentState ? 'off' : 'on';
      await apiClient.controlDevice(deviceId as string, action);
      setDevices(prev => prev ? ({ ...prev, [deviceId]: !currentState }) : null);
      fetchData();
  };

  if (!devices) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><RefreshCw className="animate-spin" size={40} /></Box>
  }

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', p: 1, '& > *': { mb: 3 } }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 'var(--squircle-radius)', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2 }}>SYSTEM STATUS: ACTIVE</Typography>
            <Typography variant="h3" fontWeight="900" sx={{ background: 'linear-gradient(45deg, #fff 30%, #a5f3fc 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -1 }}>PKGrower 3.0</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Chip icon={<Activity size={14} />} label="Online" color="success" size="small" variant="outlined" sx={{ color: '#4ade80',  borderColor: '#4ade80' }} />
                <Chip icon={phase === 'vegetative' ? <Sprout size={14}/> : <Leaf size={14}/>} label={`${phase === 'vegetative' ? 'Vegetativa' : 'Floración'}`} color={phase === 'vegetative' ? 'primary' : 'secondary'} size="small" variant="filled" />
            </Box>
        </Box>
        <Box sx={{ zIndex: 1, display: 'flex', gap: 1 }}>
            <IconButton onClick={handleRefresh} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}><RefreshCw className={refreshing ? "animate-spin" : ""} /></IconButton>
            <IconButton onClick={() => setIsConfigOpen(true)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}><Settings /></IconButton>
        </Box>
      </Paper>

      <ConfigModal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={3}><SensorCard icon={<Thermometer />} name="Temp. Aire" value={latestSensors?.temperature ?? '--'} unit="°C" color="#ef4444" description="Temperatura óptima: 22-26°C." /></Grid>
        <Grid item xs={12} md={6} lg={3}><SensorCard icon={<Droplet />} name="Humedad" value={latestSensors?.humidity ?? '--'} unit="%" color="#3b82f6" description="Humedad Relativa." /></Grid>
        <Grid item xs={12} md={6} lg={3}><SensorCard icon={<Wind />} name="D.P.V." value={latestSensors?.vpd ?? '--'} unit="kPa" color="#8b5cf6" description="Déficit de Presión de Vapor." /></Grid>
        <Grid item xs={12} md={6} lg={3}><SensorCard icon={<Droplets />} name="Sustrato" value={latestSensors?.substrateHumidity ?? '--'} unit="%" color="#f59e0b" description="Humedad volumétrica prom." /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4} sx={{ display: 'flex' }}><Box sx={{ width: '100%' }}><AICopilotWidget sensors={latestSensors} phase={phase} /></Box></Grid>
        <Grid item xs={12} lg={8}><VPDStageChart data={sensorHistory} /></Grid>
      </Grid>

      <HumidifierExtractorControl />

      <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <SoilSensorsGrid />
                  <Card sx={{ borderRadius: 'var(--squircle-radius)', overflow: 'hidden', bgcolor: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Typography variant="h6" fontWeight="bold" color="white">Análisis de Historial</Typography>
                        <ToggleButtonGroup value={phase} exclusive onChange={handlePhaseChange} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                            <ToggleButton value="vegetative" sx={{ color: 'white' }}>Vegetativo</ToggleButton>
                            <ToggleButton value="generative" sx={{ color: 'white' }}>Generativo</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <CardContent>
                        <SoilChart data={sensorHistory} phase={phase} />
                        <Box sx={{ mt: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}><HistoryChart type="substrate" title="Sustrato (Humedad)" targets={{ vwc: 45, dryback: 15 }} data={sensorHistory} /></Grid>
                                <Grid item xs={12} md={6}><HistoryChart type="environment" title="Ambiente (Temp/Hum/VPD)" data={sensorHistory} /></Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                  </Card>
              </Box>
          </Grid>

          <Grid item xs={12} lg={4}>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: 'fit-content' }}>
                    <Box sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}><CameraControl /></Box>
                    <CropSteeringPanel phase={phase} currentVWC={latestSensors?.substrateHumidity ?? 0} />

                    <Card sx={{ borderRadius: 'var(--squircle-radius)', bgcolor: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', flexGrow: 0, height: 'auto' }}>
                        <CardHeader title="Actuadores" subheader="Control Manual Directo" titleTypographyProps={{ color: 'white', fontWeight: 'bold' }} subheaderTypographyProps={{ color: 'rgba(255,255,255,0.5)' }} />
                        <CardContent>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block', fontWeight: 'bold' }}>ILUMINACIÓN</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6} md={3}><DeviceSwitch icon={<Lightbulb />} name="Panel 1" isOn={devices.luzPanel1 || false} onToggle={() => handleToggle('luzPanel1')} /></Grid>
                                <Grid item xs={6} md={3}><DeviceSwitch icon={<Lightbulb />} name="Panel 2" isOn={devices.luzPanel2 || false} onToggle={() => handleToggle('luzPanel2')} /></Grid>
                                <Grid item xs={6} md={3}><DeviceSwitch icon={<Lightbulb />} name="Panel 4" isOn={devices.luzPanel4 || false} onToggle={() => handleToggle('luzPanel4')} /></Grid>
                                <Grid item xs={12}><DeviceSwitch icon={<Lightbulb sx={{ color: '#ef4444' }} />} name="Luz Roja (Emerson)" isOn={devices.controladorLuzRoja || false} onToggle={() => handleToggle('controladorLuzRoja')} /></Grid>
                            </Grid>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block', fontWeight: 'bold' }}>RIEGO & CLIMA</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}><DeviceSwitch icon={<Fan />} name="Extractor" isOn={devices.extractorControlador || false} onToggle={() => handleToggle('extractorControlador')} /></Grid>
                                <Grid item xs={6}><DeviceSwitch icon={<Droplets />} name="Bomba" isOn={devices.bombaControlador || false} onToggle={() => handleToggle('bombaControlador')} /></Grid>
                                <Grid item xs={12}><DeviceSwitch icon={<Droplet />} name="Humidificador" isOn={devices.humidifier || false} onToggle={() => handleToggle('humidifier')} /></Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* DYNAMIC DEVICES (Meross / Others) */}
                    {devices && Object.keys(devices).filter(key =>
                        !['luzPanel1', 'luzPanel2', 'luzPanel3', 'luzPanel4', 'controladorLuzRoja',
                          'extractorControlador', 'bombaControlador', 'humidifier', 'camera'].includes(key)
                    ).length > 0 && (
                        <Card sx={{ borderRadius: 'var(--squircle-radius)', bgcolor: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)', flexGrow: 0, height: 'auto' }}>
                            <CardHeader
                                title="Detectados"
                                subheader="Tuya & Meross (Configurables)"
                                titleTypographyProps={{ color: 'white', fontWeight: 'bold' }}
                                subheaderTypographyProps={{ color: 'rgba(255,255,255,0.5)' }}
                                action={
                                    <IconButton onClick={() => setIsConfigOpen(true)} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                        <Settings size={16} />
                                    </IconButton>
                                }
                            />
                            <CardContent>
                                <Grid container spacing={2}>
                                    {Object.keys(devices).filter(key =>
                                        !['luzPanel1', 'luzPanel2', 'luzPanel3', 'luzPanel4', 'controladorLuzRoja',
                                          'extractorControlador', 'bombaControlador', 'humidifier', 'camera'].includes(key)
                                    ).map(key => {
                                        const meta = deviceMeta.find(d => d.key === key || d.id === key);
                                        const name = meta ? meta.name : (key.length > 15 ? key.substring(0, 12) + '...' : key);
                                        const icon = meta?.type === 'light' ? <Lightbulb /> : (meta?.type === 'fan' ? <Fan /> : (meta?.type === 'pump' ? <Droplets /> : <Router size={20}/>));

                                        return (
                                            <Grid item xs={6} key={key}>
                                                <DeviceSwitch
                                                    icon={icon}
                                                    name={name}
                                                    isOn={devices[key]}
                                                    onToggle={() => handleToggle(key)}
                                                />
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}
               </Box>
          </Grid>
      </Grid>
    </Box>
  );
};

const InfoIcon = () => <Activity size={20} />;

export default Dashboard;
