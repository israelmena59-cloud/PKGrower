import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, TextField, Divider, Alert, CircularProgress } from '@mui/material';
import { Droplet, Settings, Activity } from 'lucide-react';
import { SoilChart } from '../components/dashboard/SoilChart';
import { CropSteeringPanel } from '../components/dashboard/CropSteeringPanel';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import { apiClient } from '../api/client';
import { SensorData } from '../api/client';

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
    const fetchData = async () => {
        try {
            // 1. Settings
            const setRes = await fetch('http://localhost:3000/api/settings');
            const setData = await setRes.json();
            setSettings(setData.irrigation);

            // 2. Devices
            const devs = await apiClient.getDeviceStates();
            setDevices(devs);

            // 3. History (Reusing dashboard endpoint logic or new one?)
            // Dashboard uses App.tsx state or local? Dashboard has its own polling.
            // We need a shared history endpoint or just fetch latest 50.
            // For now, let's look at /api/sensors/history (needs to exist or use /latest workaround)
            // Wait, standard Pattern: Poll /api/device/refresh to fill backend array, then...
            // Actually, backend has 'sensorHistory' in memory but no endpoint to GET it fully?
            // checking backend... 'GET /api/sensors/history' is missing! Dashboard graph was building local history?
            // No, SoilChart uses 'data' prop.
            // I will assume for now we start fresh or need to implement history endpoint.
            // Let's implement a quick poller that builds local history for the session.

        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();

    // Polling Loop
    const interval = setInterval(async () => {
        const devs = await apiClient.getDeviceStates();
        setDevices(devs);

        // Fetch sensor data
        try {
            const res = await fetch('http://localhost:3000/api/sensors/soil');
            const soilData = await res.json();
            // Calculate avg
            let avg = 0;
            let count = 0;
            soilData.forEach((s: any) => { if (s.humidity) { avg += s.humidity; count++; } });
            const vwc = count > 0 ? avg / count : 0;
            setLatestVWC(vwc);

            // Mock History Add (In reality, backend should provide this)
            const newItem: SensorData = {
                timestamp: new Date().toLocaleTimeString(),
                temperature: 0, humidity: 0,
                substrateHumidity: vwc,
                sh1: soilData.find((s:any)=>s.key==='sensorSustrato1')?.humidity || 0,
                sh2: soilData.find((s:any)=>s.key==='sensorSustrato2')?.humidity || 0,
                sh3: soilData.find((s:any)=>s.key==='sensorSustrato3')?.humidity || 0,
                vpd: 0
            };
            setSensorHistory(prev => [...prev.slice(-30), newItem]); // Keep last 30 points
            setSensorHistory(prev => [...prev.slice(-30), newItem]); // Keep last 30 points
        } catch(e) {}
    }, 10000); // Optimized to 10s for Tunnel performance
    return () => clearInterval(interval);
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
      await fetch('http://localhost:3000/api/settings', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ irrigation: settings })
      });
  };

  const handleShot = async (pct: number) => {
      if (pulsing) return;
      setPulsing(true);
      try {
          await fetch('http://localhost:3000/api/irrigation/shot', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ percentage: pct })
          });
      } catch (e) {
          console.error(e);
      } finally {
          setTimeout(() => setPulsing(false), 2000); // Cooldown visual
      }
  };

  if (loading || !settings) return <Box sx={{ p: 4 }}><CircularProgress /></Box>;

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
    </Box>
  );
};

export default Irrigation;
