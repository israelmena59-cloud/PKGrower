
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, CardHeader, CardContent, CircularProgress, Alert, Divider, TextField, Button } from '@mui/material';
import { Droplet, Activity, Settings } from 'lucide-react'; // Check icons used
import { SoilChart } from '../components/dashboard/SoilChart';
import { CropSteeringPanel } from '../components/dashboard/CropSteeringPanel';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';
import { apiClient } from '../api/client';

interface SensorData {
    timestamp: string;
    temperature: number;
    humidity: number;
    substrateHumidity: number;
    sh1: number;
    sh2: number;
    sh3: number;
    vpd: number;
}

interface IrrigationSettings {
    enabled: boolean;
    mode: 'manual' | 'auto';
    potSize: number;
    pumpRate: number;
    targetVWC: number;
    drybackTarget: number;
}

const Irrigation: React.FC = () => {
  // Data State
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [latestVWC, setLatestVWC] = useState(0);
  const [phase, setPhase] = useState<'vegetative' | 'generative'>('vegetative');
  const [devices, setDevices] = useState<any>({});

  // Config State
  const [settings, setSettings] = useState<IrrigationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulsing, setPulsing] = useState(false);

  // Load Data
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
        try {
            // 1. Settings
            const setData = await apiClient.getSettings();
            if (active && setData && setData.irrigation) setSettings(setData.irrigation);

            // 2. Devices
            const devs = await apiClient.getDeviceStates();
            if (active) setDevices(devs);

            // 3. History (Immediate Load)
            const hist = await apiClient.getHistoryRange('day');
            const processedHist = hist.map((h: any) => ({
                ...h,
                dp: h.temperature - ((100 - h.humidity) / 5)
            }));
            if (active) setSensorHistory(processedHist);
            if (processedHist.length > 0) setLatestVWC(processedHist[processedHist.length - 1].substrateHumidity || 0);

        } catch (e) { console.error(e); } finally { if (active) setLoading(false); }
    };
    fetchData();

    // Polling Loop for Real Data
    const interval = setInterval(async () => {
        try {
            const devs = await apiClient.getDeviceStates();
            if (active) setDevices(devs);

            // Fetch Real History from Backend (which now logs T/H/Soil properly)
            const hist = await apiClient.getHistoryRange('day');

            // Process History for Dew Point if backend doesn't send it, or just use backend's
            const processedHist = hist.map((h: any) => ({
                ...h,
                // Calculate DP if missing. DP = T - (100-RH)/5 (Approximation) or Magnus formula
                dp: h.temperature - ((100 - h.humidity) / 5)
            }));

            if (active) setSensorHistory(processedHist);

            // Update Latest VWC from last history point
            if (processedHist.length > 0) {
                const last = processedHist[processedHist.length - 1];
                setLatestVWC(last.substrateHumidity || 0);
            }

        } catch(e) { console.error("Poll error", e); }
    }, 10000); // Optimized to 10s
    return () => { active = false; clearInterval(interval); };
  }, []);

  const handleSettingsChange = (field: keyof IrrigationSettings, value: any) => {
      if (settings) {
          const newSettings = { ...settings, [field]: value };
          setSettings(newSettings);
          // Auto save debounce could be added here
      }
  };

  const saveSettings = async () => {
      if (!settings) return;
      await apiClient.saveSettings({ irrigation: settings });
  };

  const handleShot = async (pct: number) => {
      if (pulsing) return;
      setPulsing(true);
      try {
          await apiClient.request('/api/irrigation/shot', {
              method: 'POST',
              body: JSON.stringify({ percentage: pct })
          });
      } catch (e) {
          console.error(e);
      } finally {
          setTimeout(() => setPulsing(false), 2000); // Cooldown visual
      }
  };

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  if (!settings) return (
      <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
              No se pudo cargar la configuración de Riego.
              <br/>
              Verifica que el Backend esté corriendo y que la conexión HTTPS sea segura.
          </Alert>
          <Button variant="outlined" onClick={() => window.location.reload()}>Reintentar</Button>
      </Box>
  );

  // Calc Pump Time 1%
  const volume1Pct = settings.potSize * 10; // 1% of X Liters * 1000ml / 100 = X * 10
  const time1Pct = volume1Pct / settings.pumpRate;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold">Riego y Sustrato</Typography>
          <Box>
              <Button
                variant={phase === 'vegetative' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setPhase('vegetative')}
                sx={{ mr: 1 }}
              >
                  Vegetativo
              </Button>
              <Button
                variant={phase === 'generative' ? 'contained' : 'outlined'}
                color="secondary"
                onClick={() => setPhase('generative')}
              >
                  Generativo
              </Button>
          </Box>
      </Box>

      <Grid container spacing={3}>
          {/* LEFT: Charts & Strategy */}
          <Grid item xs={12} lg={8}>
              <Box sx={{ mb: 3 }}>
                <SoilChart data={sensorHistory} phase={phase} />
              </Box>
              <CropSteeringPanel phase={phase} currentVWC={latestVWC} />

              {/* IRRIGATION LOG */}
              <Box className="glass-panel" sx={{
                  mt: 3,
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'hidden'
              }}>
                  <CardHeader title="Bitácora de Riego & Runoff" subheader="Registra mediciones para análisis de IA" />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <CardContent>
                      <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Entrada (Riego)</Typography>
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                  <TextField label="pH Entrada" size="small" type="number" fullWidth />
                                  <TextField label="EC Entrada" size="small" type="number" fullWidth />
                              </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Salida (Runoff)</Typography>
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                  <TextField label="pH Runoff" size="small" type="number" fullWidth />
                                  <TextField label="EC Runoff" size="small" type="number" fullWidth />
                              </Box>
                          </Grid>
                          <Grid item xs={12}>
                               <TextField label="Volumen Riego (L) - Opcional" size="small" type="number" fullWidth sx={{ mb: 2 }} />
                               <Button variant="contained" color="primary" fullWidth>
                                   Guardar Registro
                               </Button>
                          </Grid>
                      </Grid>
                  </CardContent>
              </Box>
          </Grid>

          {/* RIGHT: Controls */}
          <Grid item xs={12} lg={4}>
              <Box className="glass-panel" sx={{
                  mb: 3,
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'hidden'
              }}>
                  <CardHeader title="Control de Bomba" subheader="Ejecución manual de disparos (Shots)" avatar={<Droplet />} titleTypographyProps={{ fontWeight: 'bold' }} />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <CardContent>
                      <Grid container spacing={1} sx={{ mb: 3 }}>
                          {[1, 2, 3, 5].map((pct) => (
                              <Grid item xs={6} key={pct}>
                                  <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={pulsing}
                                    onClick={() => handleShot(pct)}
                                    sx={{ py: 2, fontSize: '1.rem' }}
                                  >
                                      {pct}% Shot
                                  </Button>
                              </Grid>
                          ))}
                      </Grid>

                      <DeviceSwitch
                        icon={<Activity />}
                        name="Bomba Manual"
                        isOn={devices.bombaControlador}
                        onToggle={async () => { await apiClient.toggleDevice('bombaControlador'); }}
                      />
                  </CardContent>
              </Box>

              <Box className="glass-panel" sx={{
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'hidden'
              }}>
                  <CardHeader
                    title="Calibración"
                    subheader="Configura tu sistema"
                    titleTypographyProps={{ fontWeight: 'bold' }}
                    action={<Button size="small" onClick={saveSettings} startIcon={<Settings />}>Guardar</Button>}
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }}  />
                  <CardContent>
                      <Grid container spacing={2}>
                          <Grid item xs={6}>
                              <TextField
                                label="Volumen Maceta (L)"
                                type="number"
                                fullWidth
                                value={settings.potSize}
                                onChange={(e) => handleSettingsChange('potSize', parseFloat(e.target.value))}
                              />
                          </Grid>
                          <Grid item xs={6}>
                              <TextField
                                label="Flujo Bomba (ml/s)"
                                type="number"
                                fullWidth
                                value={settings.pumpRate}
                                onChange={(e) => handleSettingsChange('pumpRate', parseFloat(e.target.value))}
                              />
                          </Grid>
                      </Grid>

                      <Alert severity="info" sx={{ mt: 2 }}>
                          Calculado: <strong>1% ({volume1Pct}ml)</strong> = <strong>{time1Pct.toFixed(1)} segundos</strong> de bombeo.
                      </Alert>
                  </CardContent>
              </Box>
          </Grid>
      </Grid>


      {/* HISTORICAL CHART */}
      <Box sx={{ mt: 3 }}>
          <HistoryChart
              type="substrate"
              title="Historial Sustrato"
              targets={{
                  vwc: settings?.targetVWC || 60,
                  dryback: settings?.drybackTarget || 20
              }}
          />
      </Box>
    </Box>
  );
};

export default Irrigation;
