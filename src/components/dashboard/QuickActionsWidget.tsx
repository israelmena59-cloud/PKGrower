/**
 * Quick Actions Widget for Dashboard
 * Fast irrigation shots and phase control
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Grid, Chip, CircularProgress, LinearProgress } from '@mui/material';
import { Droplet, Clock, Zap, Timer } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { apiClient } from '../../api/client';

interface IrrigationEvent {
  timestamp: string;
  percentage: number;
  volumeMl: number;
  durationSec: number;
}

const QuickActionsWidget: React.FC = () => {
  const { settings } = useCropSteering();
  const [pulsing, setPulsing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0); // Countdown in seconds
  const [totalDuration, setTotalDuration] = useState<number>(0); // Total duration for progress
  const [irrigationLog, setIrrigationLog] = useState<IrrigationEvent[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate shot volume based on pot size
  const getVolume = (pct: number) => (settings.potSizeLiters * 10 * pct).toFixed(0);
  const pumpRate = settings.pumpRateMlPerMin || 60; // Use dynamic pump rate

  const handleQuickShot = async (pct: number) => {
    if (pulsing) return;
    setPulsing(true);

    try {
      const volumeMl = settings.potSizeLiters * 10 * pct;
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);
      const durationSec = Math.round(durationMs / 1000);

      // Start countdown
      setTotalDuration(durationSec);
      setCountdown(durationSec);

      // Execute pulse command
      await apiClient.pulseDevice('bombaControlador', durationMs);

      // Start countdown interval
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setPulsing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Log the irrigation event
      const event: IrrigationEvent = {
        timestamp: new Date().toLocaleTimeString(),
        percentage: pct,
        volumeMl: volumeMl,
        durationSec: durationSec
      };
      setIrrigationLog(prev => [event, ...prev.slice(0, 4)]); // Keep last 5 events

      setLastAction(`${pct}% shot (${volumeMl.toFixed(0)}ml) - ${durationSec}s`);

    } catch (e) {
      console.error('Quick shot failed:', e);
      setPulsing(false);
      setCountdown(0);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Current phase based on time of day (3 periods only)
  // P1: Primer riego hasta saturación de campo (blue)
  // P2: Eventos de mantenimiento (light blue/celeste)
  // P3: Dryback (yellow)
  const now = new Date();
  const hour = now.getHours();
  const lightsOn = settings.lightsOnHour || 6;
  const lightsOff = settings.lightsOffHour || 18;
  const isDay = hour >= lightsOn && hour < lightsOff;

  let currentPhase = 'P3'; // Default to dryback (night or late day)
  let phaseColor = '#f59e0b'; // Yellow

  if (isDay) {
    const hoursIntoDay = hour - lightsOn;
    const totalDayHours = lightsOff - lightsOn;
    if (hoursIntoDay < 2) {
      currentPhase = 'P1';
      phaseColor = '#3b82f6'; // Blue - Saturación
    } else if (hoursIntoDay < totalDayHours * 0.7) {
      currentPhase = 'P2';
      phaseColor = '#22d3ee'; // Celeste/Light blue - Mantenimiento
    } else {
      currentPhase = 'P3';
      phaseColor = '#f59e0b'; // Yellow - Dryback
    }
  }

  const phaseDescriptions: Record<string, string> = {
    'P1': 'Saturación de campo',
    'P2': 'Mantenimiento',
    'P3': 'Dryback'
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
            bgcolor: `${phaseColor}25`,
            color: phaseColor,
            fontSize: '0.65rem',
            border: `1px solid ${phaseColor}40`
          }}
        />
      </Box>

      {/* Active Countdown Timer */}
      {pulsing && countdown > 0 && (
        <Box sx={{
          mb: 2,
          p: 1.5,
          borderRadius: '12px',
          bgcolor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.4)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Timer size={16} color="#22c55e" />
            <Typography variant="caption" fontWeight="bold" sx={{ color: '#22c55e' }}>
              REGANDO...
            </Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#22c55e', ml: 'auto' }}>
              {countdown}s
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={((totalDuration - countdown) / totalDuration) * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(34, 197, 94, 0.2)',
              '& .MuiLinearProgress-bar': { bgcolor: '#22c55e' }
            }}
          />
        </Box>
      )}

      {/* Quick Shot Buttons - 3 Periods with specific colors */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[
          { label: 'P1', pct: 3, color: '#3b82f6', desc: 'Saturación' }, // Blue
          { label: 'P2', pct: 2, color: '#22d3ee', desc: 'Mantenimiento' }, // Light blue/Celeste
          { label: 'P3', pct: 1, color: '#f59e0b', desc: 'Dryback' } // Yellow
        ].map(({ label, pct, color, desc }) => (
          <Grid item xs={4} key={label}>
            <Button
              fullWidth
              variant="contained"
              size="small"
              disabled={pulsing}
              onClick={() => handleQuickShot(pct)}
              sx={{
                py: 1,
                background: `linear-gradient(135deg, ${color}dd 0%, ${color}99 100%)`,
                '&:hover': { background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` },
                flexDirection: 'column',
                gap: 0
              }}
            >
              {pulsing ? <CircularProgress size={14} color="inherit" /> : (
                <>
                  <Typography variant="body2" fontWeight="bold">{label}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.5rem' }}>
                    {desc}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.55rem' }}>
                    {getVolume(pct)}ml
                  </Typography>
                </>
              )}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Volume Info */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
        {settings.potSizeLiters}L maceta | Bomba: {pumpRate}ml/min
      </Typography>

      {/* Last Action */}
      {lastAction && !pulsing && (
        <Box sx={{
          p: 1,
          borderRadius: '8px',
          bgcolor: 'rgba(52, 199, 89, 0.15)',
          textAlign: 'center',
          mb: 1
        }}>
          <Typography variant="caption" sx={{ color: '#34C759' }}>
            ✓ {lastAction}
          </Typography>
        </Box>
      )}

      {/* Recent Irrigation Log */}
      {irrigationLog.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            📋 Historial reciente:
          </Typography>
          {irrigationLog.slice(0, 3).map((event, idx) => (
            <Typography key={idx} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
              {event.timestamp} — P{event.percentage} ({event.volumeMl}ml, {event.durationSec}s)
            </Typography>
          ))}
        </Box>
      )}

      {currentPhase === 'P1' && !pulsing && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 P1: Primer riego del día. Alcanzar saturación de campo (3-5%).
        </Typography>
      )}
      {currentPhase === 'P2' && !pulsing && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 P2: Eventos de mantenimiento según etapa (veg/flower). Mantener VWC óptimo.
        </Typography>
      )}
      {currentPhase === 'P3' && !pulsing && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          🌙 P3: Dryback. Reducir VWC gradualmente. Evitar riego excesivo.
        </Typography>
      )}
    </Box>
  );
};

export default QuickActionsWidget;
