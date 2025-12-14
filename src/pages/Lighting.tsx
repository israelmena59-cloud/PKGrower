/**
 * Lighting Page - Integrated with Crop Steering
 * DLI Calculator, Stage-based PPFD recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, Switch, FormControlLabel, Button, TextField, Divider, Chip, Slider, Alert, LinearProgress } from '@mui/material';
import { Lightbulb, Clock, Save, Sun, Moon, Zap, Info, Leaf, Target, Calculator } from 'lucide-react';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import { apiClient } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';
import { GROWTH_STAGES } from '../config/cropSteeringConfig';

interface LightingSettings {
    enabled: boolean;
    mode: 'manual' | 'schedule';
    photoperiod: string;
    onTime: string;
    offTime: string;
    emerson: boolean;
    emersonOffset: number;
    devices: string[];
    ppfd?: number; // Current PPFD reading
}

// PPFD recommendations per stage from PDFs
const PPFD_RECOMMENDATIONS = {
  clone: { min: 100, max: 200, dli: { min: 5, max: 10 } },
  veg_early: { min: 200, max: 400, dli: { min: 15, max: 25 } },
  veg_late: { min: 400, max: 600, dli: { min: 25, max: 40 } },
  flower_transition: { min: 500, max: 700, dli: { min: 30, max: 45 } },
  flower_early: { min: 600, max: 800, dli: { min: 35, max: 50 } },
  flower_mid: { min: 700, max: 1000, dli: { min: 40, max: 55 } },
  flower_late: { min: 800, max: 1200, dli: { min: 40, max: 55 } },
  flush: { min: 600, max: 800, dli: { min: 30, max: 45 } }
};

const Lighting: React.FC = () => {
  const [settings, setSettings] = useState<LightingSettings | null>(null);
  const [devices, setDevices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [ppfdInput, setPpfdInput] = useState(600);

  // Crop Steering Integration
  const { currentStage, settings: cropSettings } = useCropSteering();

  const stageRecommendation = PPFD_RECOMMENDATIONS[currentStage as keyof typeof PPFD_RECOMMENDATIONS] || PPFD_RECOMMENDATIONS.veg_early;

  // Calculate light hours from settings
  const lightHours = useMemo(() => {
    if (!settings) return 18;
    const [onH, onM] = (settings.onTime || '06:00').split(':').map(Number);
    const [offH, offM] = (settings.offTime || '00:00').split(':').map(Number);
    let hours = offH - onH + (offM - onM) / 60;
    if (hours <= 0) hours += 24;
    return hours;
  }, [settings]);

  // DLI Calculation
  const calculateDLI = (ppfd: number, hoursLight: number) => {
    return (ppfd * hoursLight * 3600) / 1000000;
  };

  const currentDLI = calculateDLI(ppfdInput, lightHours);
  const dliStatus = currentDLI >= stageRecommendation.dli.min && currentDLI <= stageRecommendation.dli.max
    ? 'optimal'
    : currentDLI < stageRecommendation.dli.min ? 'low' : 'high';

  // Fetch initial data
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const data = await apiClient.getSettings();
        if (active && data && data.lighting) {
            setSettings(data.lighting);
            if (data.lighting.ppfd) setPpfdInput(data.lighting.ppfd);
        }
        const devs = await apiClient.getDeviceStates();
        if (active) setDevices(devs);
      } catch (err) {
        console.error("Error loading lighting data", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(async () => {
         try {
            const devs = await apiClient.getDeviceStates();
            if (active) setDevices(devs);
         } catch(e) {}
    }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
       await apiClient.saveSettings({ lighting: { ...settings, ppfd: ppfdInput } });
       setSuccessMsg('Configuración guardada');
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

  const handleToggleDevice = async (key: string) => {
      const currentState = devices?.[key] || false;
      const action = currentState ? 'off' : 'on';
      await apiClient.controlDevice(key, action);
      setDevices((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading || !settings) return <Box sx={{ p: 4 }}><Typography>Cargando configuración...</Typography></Box>;

  const stageLabel = currentStage.replace('_', ' ').toUpperCase();

  return (
    <Box sx={{ p: 2, maxWidth: 1600, mx: 'auto' }}>
      {/* Header with Stage Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
            <Typography variant="h4" fontWeight="bold">Control de Iluminación</Typography>
            <Typography variant="body2" color="text.secondary">Gestión de espectro, fotoperiodos y DLI</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip icon={<Leaf size={14} />} label={`Etapa: ${stageLabel}`} size="small" sx={{ bgcolor: 'rgba(52, 199, 89, 0.2)', color: '#34C759' }} />
          {successMsg && <Chip label={successMsg} color="success" />}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* DLI Calculator Panel */}
        <Grid item xs={12} lg={4}>
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
                  title="Calculadora DLI"
                  subheader="Daily Light Integral"
                  avatar={<Calculator color="#f59e0b" />}
                  titleTypographyProps={{ fontWeight: 'bold' }}
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    {/* PPFD Input */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>PPFD Actual (µmol/m²/s)</Typography>
                      <Slider
                        value={ppfdInput}
                        onChange={(_, v) => setPpfdInput(v as number)}
                        min={100}
                        max={1500}
                        step={50}
                        valueLabelDisplay="on"
                        sx={{
                          color: ppfdInput >= stageRecommendation.min && ppfdInput <= stageRecommendation.max ? '#34C759' : '#FF9500'
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Recomendado para {stageLabel}: {stageRecommendation.min}-{stageRecommendation.max} µmol/m²/s
                      </Typography>
                    </Box>

                    {/* DLI Result */}
                    <Box sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: dliStatus === 'optimal' ? 'rgba(52, 199, 89, 0.1)' : dliStatus === 'low' ? 'rgba(255, 149, 0, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                      border: `1px solid ${dliStatus === 'optimal' ? '#34C759' : dliStatus === 'low' ? '#FF9500' : '#FF3B30'}40`,
                      textAlign: 'center',
                      mb: 2
                    }}>
                      <Typography variant="h3" fontWeight="bold" sx={{
                        color: dliStatus === 'optimal' ? '#34C759' : dliStatus === 'low' ? '#FF9500' : '#FF3B30'
                      }}>
                        {currentDLI.toFixed(1)}
                      </Typography>
                      <Typography variant="body2">mol/m²/día (DLI)</Typography>
                    </Box>

                    {/* DLI Progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Min: {stageRecommendation.dli.min}</Typography>
                        <Typography variant="caption">Target: {((stageRecommendation.dli.min + stageRecommendation.dli.max) / 2).toFixed(0)}</Typography>
                        <Typography variant="caption">Max: {stageRecommendation.dli.max}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (currentDLI / stageRecommendation.dli.max) * 100)}
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)' }}
                      />
                    </Box>

                    {/* Light Hours Info */}
                    <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                      <strong>{lightHours.toFixed(1)}h</strong> de luz × <strong>{ppfdInput}</strong> PPFD = <strong>{currentDLI.toFixed(1)}</strong> DLI
                    </Alert>
                </CardContent>
            </Box>

            {/* Device Management */}
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
                  title="Dispositivos de Luz"
                  avatar={<Lightbulb color="#f59e0b" />}
                  titleTypographyProps={{ fontWeight: 'bold' }}
                  action={
                    <Button size="small" variant="outlined" startIcon={<Zap size={14} />}>
                      + Agregar
                    </Button>
                  }
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    <Grid container spacing={1}>
                        {['luzPanel1', 'luzPanel2', 'luzPanel3', 'luzPanel4'].map((key, idx) => (
                          <Grid item xs={6} key={key}>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              borderRadius: 1,
                              bgcolor: devices[key] ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Lightbulb size={16} color={devices[key] ? '#f59e0b' : '#666'} />
                                <Typography variant="body2">Panel {idx + 1}</Typography>
                              </Box>
                              <Switch
                                size="small"
                                checked={devices[key] || false}
                                onChange={() => handleToggleDevice(key)}
                                color="warning"
                              />
                            </Box>
                          </Grid>
                        ))}
                        <Grid item xs={12}>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: devices.controladorLuzRoja ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Sun size={16} color={devices.controladorLuzRoja ? '#ef4444' : '#666'} />
                              <Typography variant="body2">Luz Roja (Emerson)</Typography>
                            </Box>
                            <Switch
                              size="small"
                              checked={devices.controladorLuzRoja || false}
                              onChange={() => handleToggleDevice('controladorLuzRoja')}
                              color="error"
                            />
                          </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Box>
        </Grid>

        {/* Schedule & Emerson */}
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
                            label={settings.enabled ? "Activado" : "Desactivado"}
                        />
                    }
                />
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <CardContent>
                    {/* Stage-Based Recommendations */}
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Recomendación para {stageLabel}:</strong><br/>
                        PPFD: {stageRecommendation.min}-{stageRecommendation.max} µmol/m²/s |
                        DLI: {stageRecommendation.dli.min}-{stageRecommendation.dli.max} mol/m²/día |
                        Horas: {currentStage.includes('flower') ? '12' : '18'}h
                      </Typography>
                    </Alert>

                    {/* Presets */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Presets de Cultivo</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Button
                                    variant={settings.photoperiod === '18/6' ? 'contained' : 'outlined'}
                                    fullWidth size="large" color="success"
                                    onClick={() => applyPreset('veg')}
                                    startIcon={<Sun />}
                                    sx={{ py: 2, borderRadius: 2 }}
                                >
                                    Vegetativo (18/6) - DLI 20-35
                                </Button>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Button
                                    variant={settings.photoperiod === '12/12' ? 'contained' : 'outlined'}
                                    fullWidth size="large" color="secondary"
                                    onClick={() => applyPreset('flower')}
                                    startIcon={<Moon />}
                                    sx={{ py: 2, borderRadius: 2 }}
                                >
                                    Floración (12/12) - DLI 40-60
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={4}>
                        {/* Schedule */}
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

                        {/* Emerson Effect */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6">Efecto Emerson</Typography>
                                <Switch checked={settings.emerson} onChange={(e) => setSettings({...settings, emerson: e.target.checked})} color="error" />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                              Luz far-red al final del ciclo mejora eficiencia fotosintética hasta 30%
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
                            <Typography variant="caption">Offset: {settings.emersonOffset} minutos antes/después</Typography>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave} disabled={saving} sx={{ px: 4, borderRadius: 2 }}>
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
