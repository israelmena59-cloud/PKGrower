/**
 * Stage Selector Component
 * Visual selector for growth stages with progress indicator
 */

import React from 'react';
import { Box, Typography, Chip, LinearProgress, Tooltip } from '@mui/material';
import { Sprout, Leaf, Flower, Sun, Droplets } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { GROWTH_STAGES, GrowthStageId, getStagesArray } from '../../config/cropSteeringConfig';

interface StageSelectorProps {
  compact?: boolean;
  onStageChange?: (stageId: GrowthStageId) => void;
}

const StageSelector: React.FC<StageSelectorProps> = ({
  compact = false,
  onStageChange
}) => {
  const {
    currentStage,
    setCurrentStage,
    daysIntoGrow,
    daysIntoStage,
    daysRemainingInStage,
    settings
  } = useCropSteering();

  const stages = getStagesArray();
  const currentStageData = GROWTH_STAGES[currentStage];

  // Get icon for stage
  const getStageIcon = (stageId: GrowthStageId) => {
    switch (stageId) {
      case 'clone': return <Sprout size={16} />;
      case 'veg_early':
      case 'veg_late': return <Leaf size={16} />;
      case 'flower_transition':
      case 'flower_early':
      case 'flower_mid':
      case 'flower_late': return <Flower size={16} />;
      case 'flush': return <Droplets size={16} />;
      default: return <Sun size={16} />;
    }
  };

  // Stage progress percentage
  const stageProgress = currentStageData.durationDays > 0
    ? (daysIntoStage / currentStageData.durationDays) * 100
    : 0;

  const handleStageClick = (stageId: GrowthStageId) => {
    setCurrentStage(stageId);
    onStageChange?.(stageId);
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={getStageIcon(currentStage)}
          label={currentStageData.nameEs}
          sx={{
            bgcolor: `${currentStageData.color}20`,
            color: currentStageData.color,
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: currentStageData.color }
          }}
        />
        <Box sx={{ flex: 1, maxWidth: 150 }}>
          <LinearProgress
            variant="determinate"
            value={stageProgress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: currentStageData.color,
                borderRadius: 3
              }
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 60 }}>
          Día {daysIntoStage}/{currentStageData.durationDays}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          Etapa de Crecimiento
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Día {daysIntoGrow} del cultivo
        </Typography>
      </Box>

      {/* Stage timeline */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 2, overflowX: 'auto', pb: 1 }}>
        {stages.map((stage, index) => {
          const isActive = stage.id === currentStage;
          const isPast = stages.findIndex(s => s.id === currentStage) > index;

          return (
            <Tooltip
              key={stage.id}
              title={`${stage.nameEs} (${stage.durationDays} días)`}
              arrow
            >
              <Box
                onClick={() => handleStageClick(stage.id)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 1,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  bgcolor: isActive ? `${stage.color}20` : 'transparent',
                  border: isActive ? `2px solid ${stage.color}` : '2px solid transparent',
                  opacity: isPast ? 0.5 : 1,
                  '&:hover': {
                    bgcolor: `${stage.color}10`,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isActive ? stage.color : 'rgba(255,255,255,0.1)',
                    color: isActive ? 'white' : 'text.secondary'
                  }}
                >
                  {getStageIcon(stage.id)}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    color: isActive ? stage.color : 'text.secondary',
                    textAlign: 'center',
                    maxWidth: 50,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {stage.nameEs.split(' ')[0]}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Current stage details */}
      <Box
        sx={{
          p: 2,
          borderRadius: '12px',
          bgcolor: `${currentStageData.color}10`,
          border: `1px solid ${currentStageData.color}30`
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStageIcon(currentStage)}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: currentStageData.color }}>
              {currentStageData.nameEs}
            </Typography>
          </Box>
          <Chip
            label={`${daysRemainingInStage} días restantes`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
          />
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          {currentStageData.description}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={stageProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: currentStageData.color,
              borderRadius: 4
            }
          }}
        />

        {/* Key parameters */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>VPD</Typography>
            <Typography variant="body2" fontWeight="bold">
              {currentStageData.vpd.min}-{currentStageData.vpd.max}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Temp</Typography>
            <Typography variant="body2" fontWeight="bold">
              {currentStageData.temperature.dayMin}-{currentStageData.temperature.dayMax}°C
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Humedad</Typography>
            <Typography variant="body2" fontWeight="bold">
              {currentStageData.humidity.dayMin}-{currentStageData.humidity.dayMax}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>VWC</Typography>
            <Typography variant="body2" fontWeight="bold">
              {currentStageData.substrate.vwcMin}-{currentStageData.substrate.vwcMax}%
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default StageSelector;
