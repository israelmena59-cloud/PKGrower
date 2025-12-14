/**
 * Crop Steering Widget for Dashboard
 * Compact display of current crop steering status
 */

import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Leaf, Droplet, Thermometer, Wind, Target, Calendar, TrendingUp } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';

interface CropSteeringWidgetProps {
  compact?: boolean;
}

const CropSteeringWidget: React.FC<CropSteeringWidgetProps> = ({ compact = false }) => {
  const {
    settings,
    currentStage,
    conditions,
    environmentStatus,
    getTargetVPD,
    currentVPD,
    recommendations
  } = useCropSteering();

  const vpd = currentVPD;
  const targets = getTargetVPD();
  const stageLabel = currentStage.replace(/_/g, ' ').toUpperCase();

  // Calculate days in grow
  const daysInGrow = settings.growStartDate
    ? Math.floor((Date.now() - new Date(settings.growStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // VPD progress (0-100 scale where 50 is target)
  const vpdProgress = Math.min(100, Math.max(0, (vpd / targets.max) * 100));

  // Status colors
  const statusColors = {
    optimal: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30'
  };

  const overallColor = statusColors[environmentStatus.overall] || statusColors.optimal;

  if (compact) {
    return (
      <Box sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'rgba(255,255,255,0.03)',
        border: `1px solid ${overallColor}40`,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Box sx={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          bgcolor: `${overallColor}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Leaf size={24} color={overallColor} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight="bold">{stageLabel}</Typography>
          <Typography variant="caption" color="text.secondary">
            VPD: {vpd.toFixed(2)} | Día {daysInGrow}
          </Typography>
        </Box>
        <Box sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: overallColor,
          boxShadow: `0 0 8px ${overallColor}80`
        }} />
      </Box>
    );
  }

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
          <Leaf size={18} color="#34C759" />
          <Typography variant="subtitle2" fontWeight="bold">Crop Steering</Typography>
        </Box>
        <Chip
          size="small"
          label={stageLabel}
          sx={{
            bgcolor: 'rgba(52, 199, 89, 0.2)',
            color: '#34C759',
            fontSize: '0.7rem'
          }}
        />
      </Box>

      {/* Days Counter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Calendar size={14} color="rgba(255,255,255,0.5)" />
        <Typography variant="caption" color="text.secondary">
          Día <strong>{daysInGrow}</strong> de cultivo
        </Typography>
      </Box>

      {/* VPD Display */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption">VPD</Typography>
          <Typography variant="caption" fontWeight="bold" sx={{ color: statusColors[environmentStatus.vpd] }}>
            {vpd.toFixed(2)} kPa
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={vpdProgress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: statusColors[environmentStatus.vpd] || '#34C759'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Target: {targets.min.toFixed(1)} - {targets.max.toFixed(1)}
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
        <Box sx={{
          p: 1,
          borderRadius: '8px',
          bgcolor: 'rgba(255,255,255,0.02)',
          textAlign: 'center'
        }}>
          <Thermometer size={14} style={{ marginBottom: 2 }} color={statusColors[environmentStatus.temperature]} />
          <Typography variant="caption" sx={{ display: 'block' }}>
            {conditions.temperature?.toFixed(1) || '--'}°C
          </Typography>
        </Box>
        <Box sx={{
          p: 1,
          borderRadius: '8px',
          bgcolor: 'rgba(255,255,255,0.02)',
          textAlign: 'center'
        }}>
          <Droplet size={14} style={{ marginBottom: 2 }} color={statusColors[environmentStatus.humidity]} />
          <Typography variant="caption" sx={{ display: 'block' }}>
            {conditions.humidity?.toFixed(0) || '--'}%
          </Typography>
        </Box>
      </Box>

      {/* Health Indicator */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: '8px',
        bgcolor: `${overallColor}15`,
        border: `1px solid ${overallColor}30`
      }}>
        <Box sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: overallColor,
          boxShadow: `0 0 6px ${overallColor}`
        }} />
        <Typography variant="caption" fontWeight="bold" sx={{ color: overallColor }}>
          {environmentStatus.overall === 'optimal' ? 'Condiciones Óptimas' :
           environmentStatus.overall === 'warning' ? 'Requiere Atención' : 'Condiciones Críticas'}
        </Typography>
      </Box>

      {/* Quick Recommendation */}
      {recommendations.length > 0 && environmentStatus.overall !== 'optimal' && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            💡 {recommendations[0]}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CropSteeringWidget;
