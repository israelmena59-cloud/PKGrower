/**
 * Crop Steering Page
 * Unified hub for crop steering, automation, alerts, and irrigation
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Alert, Button, Tabs, Tab } from '@mui/material';
import { Leaf, RefreshCw, Save, Bell } from 'lucide-react';
import {
  VPDGauge,
  StageSelector,
  EnvironmentStatusCard,
  AlertList,
  StageDashboard
} from '../components/cropsteering';
import { useCropSteering } from '../context/CropSteeringContext';
import { API_BASE_URL, apiClient } from '../api/client';

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
    updateConditions,
    recommendations,
    environmentStatus,
    saveSettings,
    loadSettings
  } = useCropSteering();

  const [activeTab, setActiveTab] = useState(0);

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
      const pumpRate = settings.pumpRateMlPerMin || 60;
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);
      console.log(`[SHOT] ${pct}% -> ${volumeMl}ml -> ${durationMs}ms`);
      await apiClient.pulseDevice('bombaControlador', durationMs);
      // Log event
      setIrrigationEvents(prev => [{
        timestamp: new Date().toISOString(),
        pct,
        volumeMl,
        durationMs
      }, ...prev.slice(0, 9)]);
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
          <Tab label="Alertas" icon={<Bell size={16} />} iconPosition="start" />
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

      {/* Tab 1: Alerts */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔔 Alertas del Sistema</Typography>
          <AlertList maxAlerts={10} />
        </Box>
      </TabPanel>

    </Box>
  );
};

export default CropSteering;

