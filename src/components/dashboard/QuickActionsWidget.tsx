/**
 * Quick Actions Widget for Dashboard
 * Fast irrigation shots and phase control
 */

import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Chip, CircularProgress } from '@mui/material';
import { Droplet, Clock, Zap } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { apiClient } from '../../api/client';

const QuickActionsWidget: React.FC = () => {
  const { settings, currentStage } = useCropSteering();
  const [pulsing, setPulsing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Calculate shot volume based on pot size
  const getVolume = (pct: number) => (settings.potSizeLiters * 10 * pct).toFixed(0);

  const handleQuickShot = async (pct: number) => {
    if (pulsing) return;
    setPulsing(true);
    try {
      const volumeMl = settings.potSizeLiters * 10 * pct;
      const pumpRate = 60; // ml/min default
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);

      await apiClient.pulseDevice('bombaControlador', durationMs);
      setLastAction(`${pct}% shot (${volumeMl.toFixed(0)}ml)`);
      setTimeout(() => setLastAction(null), 5000);
    } catch (e) {
      console.error('Quick shot failed:', e);
    } finally {
      setTimeout(() => setPulsing(false), 2000);
    }
  };

  // Current phase indicator
  const now = new Date();
  const hour = now.getHours();
  const lightsOn = settings.lightsOnHour || 6;
  const lightsOff = settings.lightsOffHour || 18;
  const isDay = hour >= lightsOn && hour < lightsOff;

  let currentPhase = 'P5';
  if (isDay) {
    const hoursIntoDay = hour - lightsOn;
    const totalDayHours = lightsOff - lightsOn;
    if (hoursIntoDay < 2) currentPhase = 'P1';
    else if (hoursIntoDay < totalDayHours * 0.4) currentPhase = 'P2';
    else if (hoursIntoDay < totalDayHours * 0.7) currentPhase = 'P3';
    else currentPhase = 'P4';
  }

  const phaseDescriptions: Record<string, string> = {
    'P1': 'Primer riego',
    'P2': 'Fase vegetativa',
    'P3': 'Fase generativa',
    'P4': 'Último riego',
    'P5': 'Período nocturno'
  };

  return (
    <Box sx={{
      p: 2,
      borderRadius: '16px',
      bgcolor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={18} color="#FF9500" />
          <Typography variant="subtitle2" fontWeight="bold">Acciones Rápidas</Typography>
        </Box>
        <Chip
          size="small"
          icon={<Clock size={12} />}
          label={`${currentPhase} - ${phaseDescriptions[currentPhase]}`}
          sx={{
            bgcolor: isDay ? 'rgba(255, 149, 0, 0.2)' : 'rgba(100, 100, 255, 0.2)',
            color: isDay ? '#FF9500' : '#6464FF',
            fontSize: '0.65rem'
          }}
        />
      </Box>

      {/* Quick Shot Buttons */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[1, 2, 3, 5].map((pct) => (
          <Grid item xs={3} key={pct}>
            <Button
              fullWidth
              variant="contained"
              size="small"
              disabled={pulsing}
              onClick={() => handleQuickShot(pct)}
              sx={{
                py: 1.5,
                fontSize: '0.75rem',
                bgcolor: 'rgba(0, 122, 255, 0.8)',
                '&:hover': { bgcolor: 'rgba(0, 122, 255, 1)' }
              }}
            >
              {pulsing ? <CircularProgress size={16} color="inherit" /> : `${pct}%`}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Volume Info */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
        {settings.potSizeLiters}L maceta → 1% = {getVolume(1)}ml
      </Typography>

      {/* Last Action */}
      {lastAction && (
        <Box sx={{
          p: 1,
          borderRadius: '8px',
          bgcolor: 'rgba(52, 199, 89, 0.15)',
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{ color: '#34C759' }}>
            ✓ {lastAction}
          </Typography>
        </Box>
      )}

      {/* Phase Recommendation */}
      {currentPhase === 'P1' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 P1: Primer riego del día. Recomendado 3-5% para activar metabolismo.
        </Typography>
      )}
      {currentPhase === 'P4' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 P4: Último riego. Mantener VWC para el período nocturno.
        </Typography>
      )}
      {currentPhase === 'P5' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          🌙 P5: Período nocturno. Evitar riego para permitir dryback.
        </Typography>
      )}
    </Box>
  );
};

export default QuickActionsWidget;
