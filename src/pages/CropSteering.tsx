/**
 * Crop Steering Page
 * Unified hub for crop steering, automation, alerts, and irrigation
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Alert, Button, TextField, Switch, FormControlLabel, Tabs, Tab, CardHeader, CardContent, Divider, CircularProgress } from '@mui/material';
import { Leaf, Settings, RefreshCw, Save, Zap, Bell, Droplet, Activity, Beaker, Calendar } from 'lucide-react';
import {
  VPDGauge,
  StageSelector,
  EnvironmentStatusCard,
  IrrigationTimeline,
  AutomationPanel,
  AlertList,
  StageDashboard
} from '../components/cropsteering';
import NutrientTracker from '../components/cropsteering/NutrientTracker';
import CultivationCalendar from '../components/cropsteering/CultivationCalendar';
import { useCropSteering } from '../context/CropSteeringContext';
import { API_BASE_URL, apiClient } from '../api/client';
import { DEFAULT_AUTOMATION_RULES, AutomationRule } from '../utils/automationEngine';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

const CropSteering: React.FC = () => {
  const {
    settings,
    updateSettings,
    conditions,
    updateConditions,
    recommendations,
    environmentStatus,
    saveSettings,
    loadSettings
  } = useCropSteering();

  const [activeTab, setActiveTab] = useState(0);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(DEFAULT_AUTOMATION_RULES);

  // Irrigation state
  const [devices, setDevices] = useState<any>({});
  const [pulsing, setPulsing] = useState(false);
  const [pumpRate, setPumpRate] = useState(60);
  const [irrigationEvents, setIrrigationEvents] = useState<any[]>([]);

  // Fetch sensor data and update conditions
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sensors/latest`);
        if (response.ok) {
          const data = await response.json();
          updateConditions({
            temperature: data.temperature || 25,
            humidity: data.humidity || 60,
            vwc: data.substrateHumidity || 50
          });
        }
      } catch (e) {
        console.error('Error fetching sensor data:', e);
      }
    };

    fetchSensorData();
    loadDevices();
    const interval = setInterval(() => {
      fetchSensorData();
      loadDevices();
    }, 10000);
    return () => clearInterval(interval);
  }, [updateConditions]);

  const loadDevices = async () => {
    try {
      const devs = await apiClient.getDeviceStates();
      setDevices(devs);
    } catch (e) {}
  };

  // Load settings and rules on mount
  useEffect(() => {
    loadSettings();
    loadAutomationRules();
    loadIrrigationEvents();
  }, []);

  const loadIrrigationEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiClient.request<any>(`/api/irrigation/events?date=${today}`);
      if (res?.events) setIrrigationEvents(res.events);
    } catch (e) {
      console.error('Error loading irrigation events:', e);
    }
  };

  const loadAutomationRules = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/automation/rules`);
      if (response.ok) {
        const data = await response.json();
        if (data.rules && data.rules.length > 0) {
          setAutomationRules(data.rules);
        }
      }
    } catch (e) {
      console.error('Error loading automation rules:', e);
    }
  };

  const handleRuleToggle = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`${API_BASE_URL}/api/automation/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      setAutomationRules(prev => prev.map(r =>
        r.id === ruleId ? { ...r, enabled } : r
      ));
    } catch (e) {
      console.error('Error toggling rule:', e);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      alert('Configuración guardada correctamente');
    } catch (e) {
      alert('Error al guardar configuración');
    }
  };

  // Irrigation handlers
  const handleShot = async (pct: number) => {
    if (pulsing) return;
    setPulsing(true);
    try {
      const volumeMl = settings.potSizeLiters * 10 * pct;
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);
      console.log(`[SHOT] ${pct}% -> ${volumeMl}ml -> ${durationMs}ms`);
      await apiClient.pulseDevice('bombaControlador', durationMs);
    } catch (e) {
      console.error('Shot failed:', e);
    } finally {
      setTimeout(() => setPulsing(false), 2000);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Leaf size={28} />
          <Typography variant="h4" fontWeight="bold">
            Crop Steering
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw size={16} />}
            onClick={() => { loadSettings(); loadAutomationRules(); }}
          >
            Recargar
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Save size={16} />}
            onClick={handleSaveSettings}
          >
            Guardar
          </Button>
        </Box>
      </Box>

      {/* Overall status alert */}
      {environmentStatus.overall === 'danger' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Condiciones Críticas</strong> - {recommendations[0]}
        </Alert>
      )}
      {environmentStatus.overall === 'warning' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Atención</strong> - {recommendations[0]}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="inherit"
        >
          <Tab label="Monitoreo" icon={<Leaf size={16} />} iconPosition="start" />
          <Tab label="Riego" icon={<Droplet size={16} />} iconPosition="start" />
          <Tab label="Automatización" icon={<Zap size={16} />} iconPosition="start" />
          <Tab label="Alertas" icon={<Bell size={16} />} iconPosition="start" />
          <Tab label="Configuración" icon={<Settings size={16} />} iconPosition="start" />
          <Tab label="Nutrientes" icon={<Beaker size={16} />} iconPosition="start" />
          <Tab label="Calendario" icon={<Calendar size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Monitoring */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Box sx={{ mb: 3 }}>
              <StageDashboard />
            </Box>
            <Box sx={{ mb: 3 }}>
              <EnvironmentStatusCard showTargets={true} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <StageSelector compact={false} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <IrrigationTimeline showDetails={true} />
            </Box>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Box sx={{ mb: 3 }}>
              <VPDGauge size="large" showRecommendations={true} />
            </Box>

            {/* Quick Recommendations */}
            {recommendations.length > 0 && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                  💡 Recomendaciones
                </Typography>
                {recommendations.map((rec, i) => (
                  <Typography key={i} variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    • {rec}
                  </Typography>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 1: Irrigation */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <HistoryChart
              type="substrate"
              title="📊 Monitor Principal de Riego"
              irrigationEvents={irrigationEvents}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            {/* Pump Control - P1-P6 Shots */}
            <Box className="glass-panel" sx={{ mb: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <CardHeader title="Shots de Riego" subheader="P1-P6 según Crop Steering" avatar={<Droplet />} titleTypographyProps={{ fontWeight: 'bold' }} />
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <CardContent>
                {/* P1-P6 Grid */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {[
                    { label: 'P1', pct: 1, color: '#22c55e', desc: 'Micro' },
                    { label: 'P2', pct: 2, color: '#3b82f6', desc: 'Suave' },
                    { label: 'P3', pct: 3, color: '#8b5cf6', desc: 'Normal' },
                    { label: 'P4', pct: 4, color: '#f59e0b', desc: 'Medio' },
                    { label: 'P5', pct: 5, color: '#ef4444', desc: 'Alto' },
                    { label: 'P6', pct: 6, color: '#ec4899', desc: 'Máximo' }
                  ].map(({ label, pct, color, desc }) => (
                    <Grid item xs={4} key={label}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={pulsing}
                        onClick={() => handleShot(pct)}
                        sx={{
                          py: 1.5,
                          background: `linear-gradient(135deg, ${color}dd 0%, ${color}99 100%)`,
                          '&:hover': { background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` },
                          flexDirection: 'column',
                          gap: 0
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">{label}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>{(settings.potSizeLiters * 10 * pct).toFixed(0)}ml</Typography>
                      </Button>
                    </Grid>
                  ))}
                </Grid>

                {/* Quick P3 Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  disabled={pulsing}
                  onClick={() => handleShot(3)}
                  startIcon={pulsing ? <CircularProgress size={16} /> : <Droplet />}
                  sx={{ mb: 2, py: 1.5, borderColor: '#8b5cf6', color: '#8b5cf6' }}
                >
                  {pulsing ? 'Regando...' : 'Quick P3 Shot'}
                </Button>

                <DeviceSwitch icon={<Activity />} name="Bomba Manual" isOn={devices.bombaControlador} onToggle={async () => { await apiClient.toggleDevice('bombaControlador'); loadDevices(); }} />
              </CardContent>
            </Box>

            {/* Calibration */}
            <Box className="glass-panel" sx={{ borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <CardHeader title="Calibración" subheader="Parámetros de riego" titleTypographyProps={{ fontWeight: 'bold' }} />
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="Maceta (L)" type="number" fullWidth size="small" value={settings.potSizeLiters} onChange={(e) => updateSettings({ potSizeLiters: parseFloat(e.target.value) || 3.8 })} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Flujo (ml/min)" type="number" fullWidth size="small" value={pumpRate} onChange={(e) => setPumpRate(parseFloat(e.target.value) || 60)} />
                  </Grid>
                </Grid>
                <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
                  1% = {(settings.potSizeLiters * 10).toFixed(0)}ml = {((settings.potSizeLiters * 10) / pumpRate * 60).toFixed(1)}s
                </Alert>
              </CardContent>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Automation */}
      <TabPanel value={activeTab} index={2}>
        <AutomationPanel
          enabled={automationEnabled}
          onEnabledChange={setAutomationEnabled}
          rules={automationRules}
          onRuleToggle={handleRuleToggle}
        />
      </TabPanel>

      {/* Tab 3: Alerts */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔔 Alertas del Sistema</Typography>
          <AlertList maxAlerts={10} />
        </Box>
      </TabPanel>

      {/* Tab 4: Settings */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Configuración General
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabled}
                    onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  />
                }
                label="Crop Steering Activo"
                sx={{ mb: 2, display: 'block' }}
              />

              <TextField
                label="Fecha Inicio Cultivo"
                type="date"
                fullWidth
                size="small"
                value={settings.growStartDate || ''}
                onChange={(e) => updateSettings({ growStartDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoStageProgression}
                    onChange={(e) => updateSettings({ autoStageProgression: e.target.checked })}
                  />
                }
                label="Progresión Automática de Etapa"
                sx={{ mb: 2, display: 'block' }}
              />

              <TextField
                label="Tamaño Maceta"
                type="number"
                fullWidth
                size="small"
                value={settings.potSizeLiters}
                onChange={(e) => updateSettings({ potSizeLiters: parseFloat(e.target.value) || 3.8 })}
                inputProps={{ min: 0.5, max: 50, step: 0.5 }}
                helperText="Litros"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                Horario de Iluminación
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Luces ON"
                    type="number"
                    fullWidth
                    size="small"
                    value={settings.lightsOnHour}
                    onChange={(e) => updateSettings({ lightsOnHour: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 23 }}
                    helperText="Hora (0-23)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Luces OFF"
                    type="number"
                    fullWidth
                    size="small"
                    value={settings.lightsOffHour}
                    onChange={(e) => updateSettings({ lightsOffHour: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 23 }}
                    helperText="Hora (0-23)"
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 5: Nutrientes */}
      <TabPanel value={activeTab} index={5}>
        <NutrientTracker />
      </TabPanel>

      {/* Tab 6: Calendario */}
      <TabPanel value={activeTab} index={6}>
        <CultivationCalendar />
      </TabPanel>
    </Box>
  );
};

export default CropSteering;

