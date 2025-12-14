/**
 * Crop Steering Page
 * Dedicated page for crop steering management with all related components
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Alert, Button, TextField, Switch, FormControlLabel, Tabs, Tab } from '@mui/material';
import { Leaf, Settings, RefreshCw, Save, Zap, Bell } from 'lucide-react';
import {
  VPDGauge,
  StageSelector,
  EnvironmentStatusCard,
  IrrigationTimeline,
  AutomationPanel,
  AlertList
} from '../components/cropsteering';
import { useCropSteering } from '../context/CropSteeringContext';
import { API_BASE_URL } from '../api/client';
import { DEFAULT_AUTOMATION_RULES, AutomationRule } from '../utils/automationEngine';

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
    const interval = setInterval(fetchSensorData, 10000);
    return () => clearInterval(interval);
  }, [updateConditions]);

  // Load settings and rules on mount
  useEffect(() => {
    loadSettings();
    loadAutomationRules();
  }, []);

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
          <Tab label="Automatización" icon={<Zap size={16} />} iconPosition="start" />
          <Tab label="Alertas" icon={<Bell size={16} />} iconPosition="start" />
          <Tab label="Configuración" icon={<Settings size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Monitoring */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
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

      {/* Tab 1: Automation */}
      <TabPanel value={activeTab} index={1}>
        <AutomationPanel
          enabled={automationEnabled}
          onEnabledChange={setAutomationEnabled}
          rules={automationRules}
          onRuleToggle={handleRuleToggle}
        />
      </TabPanel>

      {/* Tab 2: Alerts */}
      <TabPanel value={activeTab} index={2}>
        <Box
          sx={{
            p: 2,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            🔔 Alertas del Sistema
          </Typography>
          <AlertList maxAlerts={10} />
        </Box>
      </TabPanel>

      {/* Tab 3: Settings */}
      <TabPanel value={activeTab} index={3}>
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
    </Box>
  );
};

export default CropSteering;

