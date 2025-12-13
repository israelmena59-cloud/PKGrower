/**
 * VPD Gauge Component
 * Animated gauge showing current VPD with color zones based on growth stage
 */

import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { GROWTH_STAGES } from '../../config/cropSteeringConfig';

interface VPDGaugeProps {
  size?: 'small' | 'medium' | 'large';
  showRecommendations?: boolean;
}

const VPDGauge: React.FC<VPDGaugeProps> = ({
  size = 'medium',
  showRecommendations = true
}) => {
  const {
    currentVPD,
    currentStage,
    environmentStatus,
    recommendations,
    getTargetVPD
  } = useCropSteering();

  const stage = GROWTH_STAGES[currentStage];
  const targetVPD = getTargetVPD();

  // Calculate gauge dimensions based on size
  const dimensions = useMemo(() => {
    switch (size) {
      case 'small': return { width: 120, height: 80, strokeWidth: 8, fontSize: '1.2rem' };
      case 'large': return { width: 240, height: 160, strokeWidth: 16, fontSize: '2.5rem' };
      default: return { width: 180, height: 120, strokeWidth: 12, fontSize: '2rem' };
    }
  }, [size]);

  // VPD range for gauge (0.2 to 2.0)
  const vpdMin = 0.2;
  const vpdMax = 2.0;
  const vpdRange = vpdMax - vpdMin;

  // Calculate needle position (0-180 degrees)
  const needleAngle = useMemo(() => {
    const clampedVPD = Math.min(Math.max(currentVPD, vpdMin), vpdMax);
    return ((clampedVPD - vpdMin) / vpdRange) * 180;
  }, [currentVPD]);

  // Color based on status
  const statusColors = {
    optimal: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30'
  };

  const currentColor = statusColors[environmentStatus.vpd];

  // Trend indicator
  const getTrendIcon = () => {
    if (currentVPD > targetVPD.target + 0.1) {
      return <TrendingUp size={16} className="text-orange-500" />;
    } else if (currentVPD < targetVPD.target - 0.1) {
      return <TrendingDown size={16} className="text-blue-500" />;
    }
    return <Minus size={16} className="text-green-500" />;
  };

  // Status label
  const getStatusLabel = () => {
    if (currentVPD < 0.4) return 'Peligro Moho';
    if (currentVPD < 0.8) return 'Bajo';
    if (currentVPD < 1.4) return 'Óptimo';
    if (currentVPD < 1.8) return 'Alto';
    return 'Estrés';
  };

  // SVG arc drawing
  const createArc = (startAngle: number, endAngle: number, color: string, opacity: number = 1) => {
    const radius = (dimensions.width - dimensions.strokeWidth) / 2;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height;

    const startRad = (startAngle - 180) * (Math.PI / 180);
    const endRad = (endAngle - 180) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return (
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={dimensions.strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
      />
    );
  };

  // Calculate zone angles based on stage parameters
  const zoneAngles = useMemo(() => {
    const dangerLow = ((0.4 - vpdMin) / vpdRange) * 180;
    const warningLow = ((targetVPD.min - vpdMin) / vpdRange) * 180;
    const optimalHigh = ((targetVPD.max - vpdMin) / vpdRange) * 180;
    const warningHigh = ((1.6 - vpdMin) / vpdRange) * 180;

    return { dangerLow, warningLow, optimalHigh, warningHigh };
  }, [targetVPD, vpdMin, vpdRange]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {/* Stage indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Activity size={16} style={{ color: stage.color }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {stage.nameEs}
        </Typography>
      </Box>

      {/* Gauge SVG */}
      <Box sx={{ position: 'relative', width: dimensions.width, height: dimensions.height + 20 }}>
        <svg width={dimensions.width} height={dimensions.height + 20}>
          {/* Background arc */}
          {createArc(0, 180, 'rgba(255,255,255,0.1)')}

          {/* Danger zone (low) */}
          {createArc(0, zoneAngles.dangerLow, '#FF3B30', 0.6)}

          {/* Warning zone (low) */}
          {createArc(zoneAngles.dangerLow, zoneAngles.warningLow, '#FF9500', 0.6)}

          {/* Optimal zone */}
          {createArc(zoneAngles.warningLow, zoneAngles.optimalHigh, '#34C759', 0.8)}

          {/* Warning zone (high) */}
          {createArc(zoneAngles.optimalHigh, zoneAngles.warningHigh, '#FF9500', 0.6)}

          {/* Danger zone (high) */}
          {createArc(zoneAngles.warningHigh, 180, '#FF3B30', 0.6)}

          {/* Needle */}
          <g transform={`rotate(${needleAngle - 90}, ${dimensions.width / 2}, ${dimensions.height})`}>
            <line
              x1={dimensions.width / 2}
              y1={dimensions.height}
              x2={dimensions.width / 2}
              y2={dimensions.height - (dimensions.width / 2 - dimensions.strokeWidth - 10)}
              stroke={currentColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle
              cx={dimensions.width / 2}
              cy={dimensions.height}
              r={8}
              fill={currentColor}
            />
          </g>

          {/* Min/Max labels */}
          <text x="10" y={dimensions.height + 15} fill="rgba(255,255,255,0.5)" fontSize="10">
            0.4
          </text>
          <text x={dimensions.width - 25} y={dimensions.height + 15} fill="rgba(255,255,255,0.5)" fontSize="10">
            1.8
          </text>
        </svg>

        {/* Center value */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              fontSize: dimensions.fontSize,
              fontWeight: 'bold',
              color: currentColor,
              lineHeight: 1
            }}
          >
            {currentVPD.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            kPa
          </Typography>
        </Box>
      </Box>

      {/* Status chip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getStatusLabel()}
          size="small"
          sx={{
            bgcolor: `${currentColor}20`,
            color: currentColor,
            fontWeight: 'bold'
          }}
        />
        {getTrendIcon()}
      </Box>

      {/* Target range */}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Objetivo: {targetVPD.min} - {targetVPD.max} kPa
      </Typography>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && environmentStatus.vpd !== 'optimal' && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: '8px',
            bgcolor: `${currentColor}10`,
            border: `1px solid ${currentColor}30`,
            width: '100%'
          }}
        >
          <Typography variant="caption" sx={{ color: currentColor }}>
            💡 {recommendations[0]}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VPDGauge;
