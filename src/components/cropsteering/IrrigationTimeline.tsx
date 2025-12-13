/**
 * Irrigation Timeline Component
 * Visual timeline showing irrigation phases P1-P5 with current position
 */

import React, { useMemo } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Sun, Moon, Droplets, Clock, Zap } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { IRRIGATION_PHASES } from '../../config/cropSteeringConfig';
import { IrrigationPhaseId } from '../../utils/cropSteeringCalculations';

interface IrrigationTimelineProps {
  showDetails?: boolean;
}

const IrrigationTimeline: React.FC<IrrigationTimelineProps> = ({
  showDetails = true
}) => {
  const {
    currentPhase,
    settings,
    conditions,
    currentStage
  } = useCropSteering();

  const { lightsOnHour, lightsOffHour } = settings;

  // Calculate time-based positions
  const timelineData = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const lightsOnMinutes = lightsOnHour * 60;
    const lightsOffMinutes = lightsOffHour * 60;

    // Calculate light period duration
    const lightDuration = lightsOnMinutes < lightsOffMinutes
      ? lightsOffMinutes - lightsOnMinutes
      : (24 * 60) - lightsOnMinutes + lightsOffMinutes;

    const darkDuration = 24 * 60 - lightDuration;

    // Calculate current position in the day (0-100%)
    let dayProgress = 0;
    if (lightsOnMinutes < lightsOffMinutes) {
      if (currentMinutes >= lightsOnMinutes && currentMinutes < lightsOffMinutes) {
        dayProgress = ((currentMinutes - lightsOnMinutes) / lightDuration) * (lightDuration / (24 * 60)) * 100;
      } else if (currentMinutes >= lightsOffMinutes) {
        dayProgress = (lightDuration / (24 * 60)) * 100 +
          ((currentMinutes - lightsOffMinutes) / darkDuration) * (darkDuration / (24 * 60)) * 100;
      } else {
        dayProgress = (lightDuration / (24 * 60)) * 100 +
          ((currentMinutes + (24 * 60 - lightsOffMinutes)) / darkDuration) * (darkDuration / (24 * 60)) * 100;
      }
    }

    // Phase widths (approximate)
    const lightPercent = (lightDuration / (24 * 60)) * 100;
    const darkPercent = 100 - lightPercent;

    return {
      lightDuration,
      darkDuration,
      lightPercent,
      darkPercent,
      currentPosition: dayProgress,
      lightsOnTime: `${String(lightsOnHour).padStart(2, '0')}:00`,
      lightsOffTime: `${String(lightsOffHour).padStart(2, '0')}:00`
    };
  }, [lightsOnHour, lightsOffHour]);

  // Phase colors and info
  const phaseInfo: Record<IrrigationPhaseId, { color: string; icon: React.ReactNode; description: string }> = {
    P1: {
      color: '#22c55e',
      icon: <Zap size={14} />,
      description: 'Primer riego - Rehidratación del sustrato'
    },
    P2: {
      color: '#3b82f6',
      icon: <Droplets size={14} />,
      description: 'Fase vegetativa - Riegos frecuentes'
    },
    P3: {
      color: '#f97316',
      icon: <Droplets size={14} />,
      description: 'Fase generativa - Permitir dryback'
    },
    P4: {
      color: '#a855f7',
      icon: <Zap size={14} />,
      description: 'Último riego - Antes de luces apagadas'
    },
    P5: {
      color: '#6b7280',
      icon: <Moon size={14} />,
      description: 'Período nocturno - Sin riego'
    }
  };

  const currentPhaseInfo = phaseInfo[currentPhase];
  const currentPhaseData = IRRIGATION_PHASES.find(p => p.id === currentPhase);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={18} />
          <Typography variant="subtitle2" fontWeight="bold">
            Fases de Riego
          </Typography>
        </Box>

        <Chip
          icon={currentPhaseInfo.icon as any}
          label={`${currentPhase} - ${currentPhaseData?.nameEs}`}
          size="small"
          sx={{
            bgcolor: `${currentPhaseInfo.color}20`,
            color: currentPhaseInfo.color,
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: currentPhaseInfo.color }
          }}
        />
      </Box>

      {/* Timeline bar */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Background bar */}
        <Box
          sx={{
            height: 40,
            borderRadius: '12px',
            display: 'flex',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Light period (P1 + P2 + P3 + P4) */}
          <Box
            sx={{
              width: `${timelineData.lightPercent}%`,
              display: 'flex',
              position: 'relative'
            }}
          >
            {/* P1 */}
            <Tooltip title="P1: Primer Riego">
              <Box
                sx={{
                  width: '10%',
                  bgcolor: currentPhase === 'P1' ? phaseInfo.P1.color : `${phaseInfo.P1.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                  P1
                </Typography>
              </Box>
            </Tooltip>

            {/* P2 */}
            <Tooltip title="P2: Fase Vegetativa">
              <Box
                sx={{
                  width: '35%',
                  bgcolor: currentPhase === 'P2' ? phaseInfo.P2.color : `${phaseInfo.P2.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                  P2
                </Typography>
              </Box>
            </Tooltip>

            {/* P3 */}
            <Tooltip title="P3: Fase Generativa">
              <Box
                sx={{
                  width: '40%',
                  bgcolor: currentPhase === 'P3' ? phaseInfo.P3.color : `${phaseInfo.P3.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                  P3
                </Typography>
              </Box>
            </Tooltip>

            {/* P4 */}
            <Tooltip title="P4: Último Riego">
              <Box
                sx={{
                  width: '15%',
                  bgcolor: currentPhase === 'P4' ? phaseInfo.P4.color : `${phaseInfo.P4.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                  P4
                </Typography>
              </Box>
            </Tooltip>

            {/* Sun icon */}
            <Box
              sx={{
                position: 'absolute',
                top: -10,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: '#fbbf24',
                borderRadius: '50%',
                p: 0.5,
                display: 'flex'
              }}
            >
              <Sun size={12} />
            </Box>
          </Box>

          {/* Dark period (P5) */}
          <Tooltip title="P5: Período Nocturno">
            <Box
              sx={{
                width: `${timelineData.darkPercent}%`,
                bgcolor: currentPhase === 'P5' ? phaseInfo.P5.color : `${phaseInfo.P5.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.6rem' }}>
                P5
              </Typography>

              {/* Moon icon */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#6366f1',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex'
                }}
              >
                <Moon size={12} />
              </Box>
            </Box>
          </Tooltip>
        </Box>

        {/* Current position indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: `${timelineData.currentPosition}%`,
            height: '100%',
            width: 3,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        />

        {/* Time labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            🌅 {timelineData.lightsOnTime}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            🌙 {timelineData.lightsOffTime}
          </Typography>
        </Box>
      </Box>

      {/* Current phase details */}
      {showDetails && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: `${currentPhaseInfo.color}10`,
            border: `1px solid ${currentPhaseInfo.color}30`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {currentPhaseInfo.icon}
            <Typography variant="body2" fontWeight="bold" sx={{ color: currentPhaseInfo.color }}>
              {currentPhaseData?.nameEs}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {currentPhaseInfo.description}
          </Typography>

          {/* Dryback info if in P5 */}
          {currentPhase === 'P5' && (
            <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dryback actual</Typography>
                <Typography variant="body2" fontWeight="bold">{conditions.dryback.toFixed(1)}%</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>VWC actual</Typography>
                <Typography variant="body2" fontWeight="bold">{conditions.vwc.toFixed(0)}%</Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default IrrigationTimeline;
