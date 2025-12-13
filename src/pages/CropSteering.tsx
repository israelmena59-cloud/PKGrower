/**
 * Crop Steering Page
 * Dedicated page for crop steering management with all related components
 */

import React, { useEffect } from 'react';
import { Box, Typography, Grid, Alert, Button, TextField, Switch, FormControlLabel } from '@mui/material';
import { Leaf, Settings, RefreshCw, Save } from 'lucide-react';
import {
  VPDGauge,
  StageSelector,
  EnvironmentStatusCard,
  IrrigationTimeline
} from '../components/cropsteering';
import { useCropSteering } from '../context/CropSteeringContext';
import { API_BASE_URL } from '../api/client';

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

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Leaf size={28} />
          <Typography variant="h4" fontWeight="bold">
            Crop Steering
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={() => loadSettings()}
          >
            Recargar
          </Button>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSaveSettings}
          >
            Guardar
          </Button>
        </Box>
      </Box>

      {/* Overall status alert */}
      {environmentStatus.overall === 'danger' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Condiciones Críticas</strong> - {recommendations[0]}
        </Alert>
      )}
      {environmentStatus.overall === 'warning' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Atención</strong> - {recommendations[0]}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left column - Main displays */}
        <Grid item xs={12} lg={8}>
          {/* Environment Status */}
          <Box sx={{ mb: 3 }}>
            <EnvironmentStatusCard showTargets={true} />
          </Box>

          {/* Stage Selector */}
          <Box sx={{ mb: 3 }}>
            <StageSelector compact={false} />
          </Box>

          {/* Irrigation Timeline */}
          <Box sx={{ mb: 3 }}>
            <IrrigationTimeline showDetails={true} />
          </Box>
        </Grid>

        {/* Right column - Controls and VPD Gauge */}
        <Grid item xs={12} lg={4}>
          {/* VPD Gauge */}
          <Box sx={{ mb: 3 }}>
            <VPDGauge size="large" showRecommendations={true} />
          </Box>

          {/* Settings Panel */}
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Settings size={18} />
              <Typography variant="subtitle2" fontWeight="bold">
                Configuración Rápida
              </Typography>
            </Box>

            {/* Enable/Disable */}
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

            {/* Grow Start Date */}
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

            {/* Light Schedule */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
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

            {/* Pot Size */}
            <TextField
              label="Tamaño Maceta"
              type="number"
              fullWidth
              size="small"
              value={settings.potSizeLiters}
              onChange={(e) => updateSettings({ potSizeLiters: parseFloat(e.target.value) || 3.8 })}
              inputProps={{ min: 0.5, max: 50, step: 0.5 }}
              helperText="Litros"
              sx={{ mb: 2 }}
            />

            {/* Auto Stage Progression */}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoStageProgression}
                  onChange={(e) => updateSettings({ autoStageProgression: e.target.checked })}
                />
              }
              label="Progresión Automática de Etapa"
            />
          </Box>
        </Grid>
      </Grid>

      {/* Recommendations section */}
      {recommendations.length > 0 && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
            💡 Recomendaciones Actuales
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recommendations.map((rec, i) => (
              <Typography key={i} variant="body2" sx={{ color: 'text.secondary' }}>
                • {rec}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CropSteering;
