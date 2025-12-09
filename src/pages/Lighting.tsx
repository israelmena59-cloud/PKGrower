import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, Switch, FormControlLabel, Button, TextField, Divider, Chip, Slider } from '@mui/material';
import { Lightbulb, Clock, Save, Sun, Moon, Zap, Info } from 'lucide-react';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import { apiClient } from '../api/client';

interface LightingSettings {
    enabled: boolean;
    mode: 'manual' | 'schedule';
    photoperiod: string;
    onTime: string;
    offTime: string;
    emerson: boolean;
    emersonOffset: number; // Minutes
    devices: string[];
}

const Lighting: React.FC = () => {
  const [settings, setSettings] = useState<LightingSettings | null>(null);
  const [devices, setDevices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use relative path for Cloud compatibility (or apiClient base)
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`);
        const data = await res.json();
        setSettings(data.lighting);

        const devs = await apiClient.getDeviceStates();
        setDevices(devs);
      } catch (err) {
        console.error("Error loading lighting data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(async () => {
         const devs = await apiClient.getDeviceStates();
         setDevices(devs);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
       await fetch(`${import.meta.env.VITE_API_URL}/api/settings`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ lighting: settings })
       });
       setSuccessMsg('Configuración guardada correctamente');
       setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
        console.error("Error saving", err);
    } finally {
        setSaving(false);
    }
  };

  const applyPreset = (preset: 'veg' | 'flower') => {
      if (!settings) return;
      if (preset === 'veg') {
          setSettings({ ...settings, photoperiod: '18/6', onTime: '06:00', offTime: '00:00' });
      } else {
          setSettings({ ...settings, photoperiod: '12/12', onTime: '08:00', offTime: '20:00' });
      }
  };

  const calculateEmersonRecommendation = () => {
      // Suggestion: Red Light ON 15 mins BEFORE Main, OFF 15 mins AFTER Main OFF
      if (!settings) return;
      // This is just a visual recommendation in this version, or prompts AI
      alert("Para Efecto Emerson óptimo: Configura Luz Roja para encender 15 minutos antes y apagar 15 minutos después del ciclo principal.");
  };

  // Robust Toggle Handler returning Promise for DeviceSwitch
  const handleToggleDevice = async (key: string) => {
      const currentState = devices?.[key] || false;
      const action = currentState ? 'off' : 'on';

      // Perform API call
      await apiClient.controlDevice(key, action);

      // Update local state (Optimistic)
      setDevices((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading || !settings) return <Box sx={{ p: 4 }}><Typography>Cargando configuración...</Typography></Box>;

  return (
    <Box sx={{ p: 2, maxWidth: 1600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Control de Iluminación</Typography>
            <Typography variant="body2" color="text.secondary">Gestión de espectro y fotoperiodos</Typography>
        </Box>
        {successMsg && <Chip label={successMsg} color="success" />}
      </Box>

      <Grid container spacing={3}>
        {/* --- MANUAL CONTROL --- */}
        <Grid item xs={12} lg={4}>
            <Box className="glass-panel" sx={{
                height: '100%',
                p: 0,
                borderRadius: 'var(--squircle-radius)',
                bgcolor: 'var(--glass-bg)',
                backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}>
                <CardHeader title="Actuadores Manuales" subheader="Control directo de paneles" avatar={<Zap color="#f59e0b" />} titleTypographyProps={{ fontWeight: 'bold' }} />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><DeviceSwitch icon={<Lightbulb />} name="Panel 1 (Der A)" isOn={devices.luzPanel1} onToggle={() => handleToggleDevice('luzPanel1')} /></Grid>
                        <Grid item xs={12} sm={6}><DeviceSwitch icon={<Lightbulb />} name="Panel 2 (Der B)" isOn={devices.luzPanel2} onToggle={() => handleToggleDevice('luzPanel2')} /></Grid>
                        <Grid item xs={12} sm={6}><DeviceSwitch icon={<Lightbulb />} name="Panel 3 (Izq A)" isOn={devices.luzPanel3} onToggle={() => handleToggleDevice('luzPanel3')} /></Grid>
                        <Grid item xs={12} sm={6}><DeviceSwitch icon={<Lightbulb />} name="Panel 4 (Izq B)" isOn={devices.luzPanel4} onToggle={() => handleToggleDevice('luzPanel4')} /></Grid>
                        <Grid item xs={12}><DeviceSwitch icon={<Sun color={devices.controladorLuzRoja ? "#ef4444" : "gray"} />} name="Luz Roja (Emerson)" isOn={devices.controladorLuzRoja} onToggle={() => handleToggleDevice('controladorLuzRoja')} /></Grid>
                    </Grid>
                </CardContent>
            </Box>
        </Grid>

        {/* --- AUTOMATION CONFIG --- */}
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
                    title="Programación Inteligente"
                    subheader="Fotoperiodo y Efecto Emerson"
                    titleTypographyProps={{ fontWeight: 'bold' }}
                    avatar={<Clock color="#3b82f6" />}
                    action={
                        <FormControlLabel
                            control={<Switch checked={settings.enabled} onChange={(e) => setSettings({...settings, enabled: e.target.checked})} />}
                            label={settings.enabled ? "Sistema Activado" : "Sistema Desactivado"}
                        />
                    }
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            Presets de Cultivo <Info size={16} opacity={0.5} />
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Button
                                    variant={settings.photoperiod === '18/6' ? 'contained' : 'outlined'}
                                    fullWidth
                                    size="large"
                                    color="success"
                                    onClick={() => applyPreset('veg')}
                                    startIcon={<Sun />}
                                    sx={{ py: 2, borderRadius: 2 }}
                                >
                                    Modo Vegetativo (18/6)
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Button
                                    variant={settings.photoperiod === '12/12' ? 'contained' : 'outlined'}
                                    fullWidth
                                    size="large"
                                    color="secondary"
                                    onClick={() => applyPreset('flower')}
                                    startIcon={<Moon />}
                                    sx={{ py: 2, borderRadius: 2 }}
                                >
                                    Modo Floración (12/12)
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Ciclo Principal</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Encendido (ON)"
                                        type="time"
                                        fullWidth
                                        value={settings.onTime}
                                        onChange={(e) => setSettings({...settings, onTime: e.target.value, mode: 'schedule'})}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Apagado (OFF)"
                                        type="time"
                                        fullWidth
                                        value={settings.offTime}
                                        onChange={(e) => setSettings({...settings, offTime: e.target.value, mode: 'schedule'})}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6">Efecto Emerson (Luz Roja)</Typography>
                                <Switch
                                    checked={settings.emerson}
                                    onChange={(e) => setSettings({...settings, emerson: e.target.checked})}
                                    color="error"
                                />
                            </Box>

                            <Box sx={{ px: 1 }}>
                                <Typography gutterBottom variant="body2" color="text.secondary">
                                    Desfase (Minutos antes/después del ciclo principal)
                                </Typography>
                                <Slider
                                    value={settings.emersonOffset}
                                    onChange={(_, val) => setSettings({...settings, emersonOffset: val as number})}
                                    valueLabelDisplay="auto"
                                    step={5}
                                    marks
                                    min={0}
                                    max={60}
                                    disabled={!settings.emerson}
                                    sx={{ color: '#ef4444' }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={calculateEmersonRecommendation}
                                        startIcon={<Info size={14} />}
                                    >
                                        Recomendación
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Save />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ px: 4, borderRadius: 2 }}
                        >
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </Box>
                </CardContent>
            </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Lighting;
