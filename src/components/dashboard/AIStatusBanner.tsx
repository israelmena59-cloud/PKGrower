/**
 * AIStatusBanner - Intelligent Status Banner
 * Shows cultivation status in natural language with AI-generated insights
 */

import React, { useMemo } from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Sparkles, TrendingUp, TrendingDown, Minus, Droplet, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';

interface AIStatusBannerProps {
  temperature?: number;
  humidity?: number;
  vpd?: number;
  vwc?: number;
}

const AIStatusBanner: React.FC<AIStatusBannerProps> = ({ temperature = 0, humidity = 0, vpd = 0, vwc = 0 }) => {
  const { currentStage, getTargetVPD, settings, daysVeg, daysFlower } = useCropSteering();

  const analysis = useMemo(() => {
    const targetVPD = getTargetVPD();
    const isFlower = !!settings.flipDate;
    const dayCount = isFlower ? daysFlower : daysVeg;

    // VPD Analysis
    let vpdStatus: 'optimal' | 'low' | 'high' = 'optimal';
    let vpdMessage = '';
    if (vpd < targetVPD.min) {
      vpdStatus = 'low';
      vpdMessage = `VPD bajo (${vpd.toFixed(2)} kPa) - considera reducir humedad`;
    } else if (vpd > targetVPD.max) {
      vpdStatus = 'high';
      vpdMessage = `VPD alto (${vpd.toFixed(2)} kPa) - considera aumentar humedad`;
    } else {
      vpdMessage = `VPD en ${vpd.toFixed(2)} kPa - óptimo para ${isFlower ? 'floración' : 'vegetativo'}`;
    }

    // VWC Analysis - Irrigation suggestion
    let irrigationSuggestion = '';
    let timeToIrrigation = 0;
    const targetVWC = isFlower ? 45 : 50;

    if (vwc > 60) {
      irrigationSuggestion = 'Sustrato saturado - no regar';
      timeToIrrigation = 180; // 3h estimate
    } else if (vwc > targetVWC) {
      timeToIrrigation = Math.round((vwc - targetVWC) * 6); // ~6 min per % VWC
      irrigationSuggestion = `Próximo riego en ~${timeToIrrigation > 60 ? Math.round(timeToIrrigation/60) + 'h' : timeToIrrigation + 'min'}`;
    } else if (vwc < 35) {
      irrigationSuggestion = '⚠️ VWC bajo - regar pronto';
      timeToIrrigation = 0;
    } else {
      irrigationSuggestion = 'VWC en rango - monitorear dryback';
      timeToIrrigation = 30;
    }

    // Overall status
    let overallStatus: 'excellent' | 'good' | 'attention' | 'warning' = 'good';
    let overallMessage = '';

    const issues = [];
    if (vpdStatus !== 'optimal') issues.push('VPD');
    if (vwc < 35 || vwc > 70) issues.push('VWC');
    if (temperature > 30 || temperature < 18) issues.push('Temp');

    if (issues.length === 0) {
      overallStatus = 'excellent';
      overallMessage = `Todo va excelente. Día ${dayCount} de ${isFlower ? 'floración' : 'vegetativo'} sin problemas.`;
    } else if (issues.length === 1) {
      overallStatus = 'attention';
      overallMessage = `Atención: ${issues[0]} fuera de rango. El resto está bien.`;
    } else {
      overallStatus = 'warning';
      overallMessage = `Revisar: ${issues.join(', ')} necesitan ajuste.`;
    }

    // Health score (0-100)
    let healthScore = 100;
    if (vpdStatus !== 'optimal') healthScore -= 20;
    if (vwc < 35 || vwc > 70) healthScore -= 25;
    if (temperature > 30 || temperature < 18) healthScore -= 20;
    if (humidity > 75 || humidity < 40) healthScore -= 15;
    healthScore = Math.max(0, healthScore);

    return {
      overallStatus,
      overallMessage,
      vpdStatus,
      vpdMessage,
      irrigationSuggestion,
      timeToIrrigation,
      healthScore,
      isFlower,
      dayCount
    };
  }, [temperature, humidity, vpd, vwc, currentStage, getTargetVPD, settings, daysVeg, daysFlower]);

  const statusColors = {
    excellent: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#22c55e', icon: CheckCircle },
    good: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6', icon: CheckCircle },
    attention: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b', icon: AlertTriangle },
    warning: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', icon: AlertTriangle }
  };

  const StatusIcon = statusColors[analysis.overallStatus].icon;

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '20px',
        background: statusColors[analysis.overallStatus].bg,
        border: `1px solid ${statusColors[analysis.overallStatus].border}`,
        backdropFilter: 'blur(10px)',
        mb: 3,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated gradient background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(90deg, transparent, ${statusColors[analysis.overallStatus].bg}, transparent)`,
          animation: 'shimmer 3s infinite',
          pointerEvents: 'none'
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        {/* Main Message */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box sx={{
              p: 0.75,
              borderRadius: '10px',
              bgcolor: statusColors[analysis.overallStatus].border,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} color={statusColors[analysis.overallStatus].text} />
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: statusColors[analysis.overallStatus].text,
                fontSize: '1.05rem'
              }}
            >
              {analysis.isFlower ? '🌸' : '🌿'} {analysis.overallMessage}
            </Typography>
          </Box>

          {/* Secondary info */}
          <Box sx={{ display: 'flex', gap: 3, ml: 5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {analysis.vpdStatus === 'optimal' ? (
                <Minus size={14} color="#22c55e" />
              ) : analysis.vpdStatus === 'high' ? (
                <TrendingUp size={14} color="#f59e0b" />
              ) : (
                <TrendingDown size={14} color="#3b82f6" />
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {analysis.vpdMessage}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Droplet size={14} color="#06b6d4" />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                VWC: {vwc.toFixed(0)}%
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Clock size={14} color="#8b5cf6" />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {analysis.irrigationSuggestion}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Health Score */}
        <Box sx={{ textAlign: 'center', minWidth: 70 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `conic-gradient(${statusColors[analysis.overallStatus].text} ${analysis.healthScore * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" fontWeight="bold" sx={{ color: statusColors[analysis.overallStatus].text }}>
                  {analysis.healthScore}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Salud
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AIStatusBanner;
