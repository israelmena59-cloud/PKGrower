/**
 * Environment Status Card
 * Shows current environmental conditions with status indicators
 */

import React from 'react';
import { Box, Typography, Grid, Tooltip } from '@mui/material';
import { Thermometer, Droplets, Wind, Gauge, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { GROWTH_STAGES } from '../../config/cropSteeringConfig';

interface EnvironmentStatusCardProps {
  showTargets?: boolean;
  compact?: boolean;
}

const EnvironmentStatusCard: React.FC<EnvironmentStatusCardProps> = ({
  showTargets = true,
  compact = false
}) => {
  const {
    conditions,
    currentVPD,
    currentStage,
    environmentStatus,
    getTargetVPD,
    getTargetTemp,
    getTargetHumidity,
    getTargetVWC
  } = useCropSteering();

  const stage = GROWTH_STAGES[currentStage];
  const targets = {
    vpd: getTargetVPD(),
    temp: getTargetTemp(),
    humidity: getTargetHumidity(),
    vwc: getTargetVWC()
  };

  // Status icon and color
  const getStatusIndicator = (status: 'optimal' | 'warning' | 'danger') => {
    switch (status) {
      case 'optimal':
        return { icon: <CheckCircle size={14} />, color: '#34C759', label: 'Óptimo' };
      case 'warning':
        return { icon: <AlertTriangle size={14} />, color: '#FF9500', label: 'Atención' };
      case 'danger':
        return { icon: <XCircle size={14} />, color: '#FF3B30', label: 'Crítico' };
    }
  };

  // Metric card component
  const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    target?: string;
    status: 'optimal' | 'warning' | 'danger';
  }> = ({ icon, label, value, unit, target, status }) => {
    const statusInfo = getStatusIndicator(status);

    return (
      <Box
        sx={{
          p: compact ? 1.5 : 2,
          borderRadius: '16px',
          bgcolor: `${statusInfo.color}08`,
          border: `1px solid ${statusInfo.color}30`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Status dot */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: statusInfo.color,
            animation: status !== 'optimal' ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 }
            }
          }}
        />

        {/* Icon and label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: statusInfo.color }}>{icon}</Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>

        {/* Value */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight="bold"
            sx={{ color: statusInfo.color }}
          >
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {unit}
          </Typography>
        </Box>

        {/* Target range */}
        {showTargets && target && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Objetivo: {target}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: compact ? 1 : 2,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {!compact && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Condiciones Actuales
          </Typography>
          <Tooltip title={`Etapa: ${stage.nameEs}`}>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '20px',
                bgcolor: `${stage.color}20`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {getStatusIndicator(environmentStatus.overall).icon}
              <Typography variant="caption" sx={{ color: stage.color, fontWeight: 'bold' }}>
                {getStatusIndicator(environmentStatus.overall).label}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      )}

      <Grid container spacing={compact ? 1 : 2}>
        {/* VPD */}
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<Gauge size={18} />}
            label="VPD"
            value={currentVPD.toFixed(2)}
            unit="kPa"
            target={`${targets.vpd.min}-${targets.vpd.max}`}
            status={environmentStatus.vpd}
          />
        </Grid>

        {/* Temperature */}
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<Thermometer size={18} />}
            label="Temperatura"
            value={conditions.temperature.toFixed(1)}
            unit="°C"
            target={`${targets.temp.dayMin}-${targets.temp.dayMax}`}
            status={environmentStatus.temperature}
          />
        </Grid>

        {/* Humidity */}
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<Droplets size={18} />}
            label="Humedad"
            value={conditions.humidity.toFixed(0)}
            unit="%"
            target={`${targets.humidity.dayMin}-${targets.humidity.dayMax}`}
            status={environmentStatus.humidity}
          />
        </Grid>

        {/* VWC/Substrate */}
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<Wind size={18} />}
            label="VWC Sustrato"
            value={conditions.vwc.toFixed(0)}
            unit="%"
            target={`${targets.vwc.min}-${targets.vwc.max}`}
            status={environmentStatus.vwc}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default EnvironmentStatusCard;
