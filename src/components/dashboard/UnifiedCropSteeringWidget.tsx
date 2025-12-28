/**
 * Unified Crop Steering + Quick Actions Widget
 * Combines crop steering status with irrigation quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Grid, Chip, CircularProgress, LinearProgress, Divider } from '@mui/material';
import { Leaf, Droplet, Thermometer, Clock, Zap, Timer, Calendar } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { apiClient } from '../../api/client';

interface IrrigationEvent {
  timestamp: string;
  percentage: number;
  volumeMl: number;
  durationSec: number;
}

const UnifiedCropSteeringWidget: React.FC = () => {
  const {
    settings,
    currentStage,
    conditions,
    environmentStatus,
    getTargetVPD,
    currentVPD,
    recommendations
  } = useCropSteering();

  const [pulsing, setPulsing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [irrigationLog, setIrrigationLog] = useState<IrrigationEvent[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Crop Steering Data
  const vpd = currentVPD;
  const targets = getTargetVPD();
  const stageLabel = currentStage.replace(/_/g, ' ').toUpperCase();
  const daysInGrow = settings.growStartDate
    ? Math.floor((Date.now() - new Date(settings.growStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const vpdProgress = Math.min(100, Math.max(0, (vpd / targets.max) * 100));

  // Status colors
  const statusColors = {
    optimal: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30'
  };
  const overallColor = statusColors[environmentStatus.overall] || statusColors.optimal;

  // Quick Actions Logic
  const getVolume = (pct: number) => (settings.potSizeLiters * 10 * pct).toFixed(0);
  const pumpRate = settings.pumpRateMlPerMin || 60;

  // Phase Detection (3 periods)
  const now = new Date();
  const hour = now.getHours();
  const lightsOn = settings.lightsOnHour || 6;
  const lightsOff = settings.lightsOffHour || 18;
  const isDay = hour >= lightsOn && hour < lightsOff;

  let currentPhase = 'P3';
  let phaseColor = '#f59e0b';

  if (isDay) {
    const hoursIntoDay = hour - lightsOn;
    const totalDayHours = lightsOff - lightsOn;
    if (hoursIntoDay < 2) {
      currentPhase = 'P1';
      phaseColor = '#3b82f6';
    } else if (hoursIntoDay < totalDayHours * 0.7) {
      currentPhase = 'P2';
      phaseColor = '#22d3ee';
    } else {
      currentPhase = 'P3';
      phaseColor = '#f59e0b';
    }
  }

  const phaseDescriptions: Record<string, string> = {
    'P1': 'Saturación de campo',
    'P2': 'Mantenimiento',
    'P3': 'Dryback'
  };

  const handleQuickShot = async (pct: number) => {
    if (pulsing) return;
    setPulsing(true);

    try {
      const volumeMl = settings.potSizeLiters * 10 * pct;
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);
      const durationSec = Math.round(durationMs / 1000);

      setTotalDuration(durationSec);
      setCountdown(durationSec);

      await apiClient.pulseDevice('bombaControlador', durationMs);

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

      const event: IrrigationEvent = {
        timestamp: new Date().toLocaleTimeString(),
        percentage: pct,
        volumeMl: volumeMl,
        durationSec: durationSec
      };
      setIrrigationLog(prev => [event, ...prev.slice(0, 4)]);
      setLastAction(`${pct}% (${volumeMl.toFixed(0)}ml)`);

    } catch (e) {
      console.error('Quick shot failed:', e);
      setPulsing(false);
      setCountdown(0);
    }
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <Box sx={{
      p: 2,
      borderRadius: '16px',
      bgcolor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Header with Stage and Phase */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Leaf size={18} color="#34C759" />
          <Typography variant="subtitle2" fontWeight="bold">Crop Steering</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            size="small"
            label={stageLabel}
            sx={{
              bgcolor: 'rgba(52, 199, 89, 0.2)',
              color: '#34C759',
              fontSize: '0.65rem'
            }}
          />
          <Chip
            size="small"
            icon={<Clock size={10} />}
            label={currentPhase}
            sx={{
              bgcolor: `${phaseColor}25`,
              color: phaseColor,
              fontSize: '0.65rem',
              border: `1px solid ${phaseColor}40`
            }}
          />
        </Box>
      </Box>

      {/* Days and Environmental Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar size={14} color="rgba(255,255,255,0.5)" />
          <Typography variant="caption" color="text.secondary">
            Día <strong>{daysInGrow}</strong> de cultivo
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          bgcolor: `${overallColor}20`
        }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: overallColor }} />
          <Typography variant="caption" sx={{ color: overallColor, fontSize: '0.6rem' }}>
            {environmentStatus.overall === 'optimal' ? 'Óptimo' :
             environmentStatus.overall === 'warning' ? 'Atención' : 'Crítico'}
          </Typography>
        </Box>
      </Box>

      {/* Quick Stats Row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>VPD</Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: statusColors[environmentStatus.vpd] }}>
            {vpd.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <Thermometer size={12} color={statusColors[environmentStatus.temperature]} style={{ marginBottom: 2 }} />
          <Typography variant="body2" fontWeight="bold">{conditions.temperature?.toFixed(1) || '--'}°</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <Droplet size={12} color={statusColors[environmentStatus.humidity]} style={{ marginBottom: 2 }} />
          <Typography variant="body2" fontWeight="bold">{conditions.humidity?.toFixed(0) || '--'}%</Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>VWC</Typography>
          <Typography variant="body2" fontWeight="bold">{conditions.vwc?.toFixed(0) || '--'}%</Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Quick Actions Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Zap size={14} color="#FF9500" />
        <Typography variant="caption" fontWeight="bold">Acciones Rápidas</Typography>
      </Box>

      {/* Active Countdown Timer */}
      {pulsing && countdown > 0 && (
        <Box sx={{
          mb: 2,
          p: 1,
          borderRadius: '10px',
          bgcolor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.4)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Timer size={14} color="#22c55e" />
            <Typography variant="caption" fontWeight="bold" sx={{ color: '#22c55e' }}>REGANDO...</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#22c55e', ml: 'auto' }}>{countdown}s</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={((totalDuration - countdown) / totalDuration) * 100}
            sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(34, 197, 94, 0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#22c55e' } }}
          />
        </Box>
      )}

      {/* Quick Shot Buttons - 6 percentages */}
      <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
        {[
          { pct: 1, color: '#22c55e' },
          { pct: 2, color: '#3b82f6' },
          { pct: 3, color: '#8b5cf6' },
          { pct: 4, color: '#f59e0b' },
          { pct: 5, color: '#ef4444' },
          { pct: 6, color: '#ec4899' }
        ].map(({ pct, color }) => (
          <Grid item xs={2} key={pct}>
            <Button
              fullWidth
              variant="contained"
              size="small"
              disabled={pulsing}
              onClick={() => handleQuickShot(pct)}
              sx={{
                p: 0.5,
                minWidth: 0,
                background: `linear-gradient(135deg, ${color}dd 0%, ${color}99 100%)`,
                '&:hover': { background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` },
                flexDirection: 'column'
              }}
            >
              {pulsing ? <CircularProgress size={12} color="inherit" /> : (
                <>
                  <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>{pct}%</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.5rem' }}>{getVolume(pct)}ml</Typography>
                </>
              )}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Current Period Info Box */}
      <Box sx={{
        p: 1,
        borderRadius: '8px',
        bgcolor: `${phaseColor}15`,
        border: `1px solid ${phaseColor}30`,
        textAlign: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: phaseColor, boxShadow: `0 0 4px ${phaseColor}` }} />
          <Typography variant="caption" fontWeight="bold" sx={{ color: phaseColor }}>{currentPhase} - {phaseDescriptions[currentPhase]}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
          {currentPhase === 'P1' && '💧 Alcanzar saturación de campo'}
          {currentPhase === 'P2' && '🌱 Mantenimiento según etapa'}
          {currentPhase === 'P3' && '🌙 Reducir VWC gradualmente'}
        </Typography>
      </Box>

      {/* Last Action */}
      {lastAction && !pulsing && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: '#34C759' }}>
          ✓ Último: {lastAction}
        </Typography>
      )}

      {/* Recommendation */}
      {recommendations.length > 0 && environmentStatus.overall !== 'optimal' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: '0.6rem' }}>
          💡 {recommendations[0]}
        </Typography>
      )}
    </Box>
  );
};

export default UnifiedCropSteeringWidget;
