/**
 * AIContextPanel - Compact Contextual AI Insights
 * Shows page-specific AI suggestions in a compact format
 */

import React, { useMemo } from 'react';
import { Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import { Sparkles, ChevronRight, Droplet, Wind, Thermometer, Zap } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';

interface AIContextPanelProps {
  context: 'irrigation' | 'environment' | 'lighting' | 'nutrients';
  temperature?: number;
  humidity?: number;
  vpd?: number;
  vwc?: number;
  compact?: boolean;
}

const AIContextPanel: React.FC<AIContextPanelProps> = ({
  context,
  temperature = 0,
  humidity = 0,
  vpd = 0,
  vwc = 0,
  compact = false
}) => {
  const { currentStage, getTargetVPD, settings } = useCropSteering();

  const insight = useMemo(() => {
    const targetVPD = getTargetVPD();
    const isFlower = !!settings.flipDate;
    const targetVWC = isFlower ? 45 : 50;

    switch (context) {
      case 'irrigation': {
        if (vwc > 60) {
          return {
            icon: <Droplet size={16} />,
            message: 'Sustrato saturado. Esperar dryback antes del próximo riego.',
            suggestion: `VWC en ${vwc.toFixed(0)}% - objetivo: ${targetVWC}%`,
            type: 'info' as const
          };
        }
        if (vwc < 35) {
          return {
            icon: <Droplet size={16} />,
            message: '⚠️ VWC crítico. Regar inmediatamente con P2 (8%).',
            suggestion: 'Evitar estrés hídrico prolongado',
            type: 'warning' as const
          };
        }
        if (vwc < targetVWC) {
          const timeEstimate = Math.round((vwc - 35) * 6);
          return {
            icon: <Droplet size={16} />,
            message: `Próximo riego sugerido en ~${timeEstimate > 60 ? Math.round(timeEstimate/60) + 'h' : timeEstimate + 'min'}`,
            suggestion: `VWC actual: ${vwc.toFixed(0)}% → objetivo: ${targetVWC}%`,
            type: 'action' as const
          };
        }
        return {
          icon: <Droplet size={16} />,
          message: 'VWC en rango óptimo. Monitorear dryback.',
          suggestion: `${vwc.toFixed(0)}% - mantenimiento P2`,
          type: 'success' as const
        };
      }

      case 'environment': {
        if (vpd < targetVPD.min) {
          return {
            icon: <Wind size={16} />,
            message: `VPD bajo (${vpd.toFixed(2)} kPa). Considera reducir humedad o subir temp.`,
            suggestion: 'Activar extractor para equilibrar',
            type: 'warning' as const
          };
        }
        if (vpd > targetVPD.max) {
          return {
            icon: <Wind size={16} />,
            message: `VPD alto (${vpd.toFixed(2)} kPa). Aumentar humedad ambiente.`,
            suggestion: 'Rango objetivo: ' + targetVPD.min.toFixed(2) + '-' + targetVPD.max.toFixed(2) + ' kPa',
            type: 'warning' as const
          };
        }
        return {
          icon: <Wind size={16} />,
          message: `VPD óptimo en ${vpd.toFixed(2)} kPa para ${isFlower ? 'floración' : 'vegetativo'}.`,
          suggestion: 'Condiciones ideales - mantener',
          type: 'success' as const
        };
      }

      case 'lighting': {
        const hour = new Date().getHours();
        const lightsOnHour = parseInt(settings.lightsOnTime?.split(':')[0] || '6');
        const lightsOffHour = parseInt(settings.lightsOffTime?.split(':')[0] || '0');
        const isLightsOn = hour >= lightsOnHour && (lightsOffHour === 0 || hour < lightsOffHour);

        if (isLightsOn) {
          return {
            icon: <Zap size={16} />,
            message: 'Período de luz activo. DLI acumulando.',
            suggestion: `Temp. actual: ${temperature.toFixed(1)}°C - monitorear`,
            type: 'info' as const
          };
        }
        return {
          icon: <Zap size={16} />,
          message: 'Período nocturno. Luces apagadas.',
          suggestion: `Temp. nocturna: ${temperature.toFixed(1)}°C`,
          type: 'info' as const
        };
      }

      case 'nutrients': {
        const ec = 2.5; // Placeholder - would come from real sensor
        return {
          icon: <Sparkles size={16} />,
          message: isFlower
            ? 'Floración: Aumentar P-K, reducir N gradualmente.'
            : 'Vegetativo: Mantener balance N-P-K alto en nitrógeno.',
          suggestion: `EC sugerida: ${isFlower ? '1.8-2.4' : '1.2-1.8'} mS/cm`,
          type: 'info' as const
        };
      }

      default:
        return {
          icon: <Sparkles size={16} />,
          message: 'Analizando condiciones...',
          suggestion: '',
          type: 'info' as const
        };
    }
  }, [context, temperature, humidity, vpd, vwc, currentStage, getTargetVPD, settings]);

  const typeColors = {
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
    action: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' }
  };

  const colors = typeColors[insight.type];

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          borderRadius: '12px',
          background: colors.bg,
          border: `1px solid ${colors.border}`
        }}
      >
        <Box sx={{ color: colors.text }}>{insight.icon}</Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
          {insight.message}
        </Typography>
        <Chip
          label="AI"
          size="small"
          sx={{
            bgcolor: 'rgba(139, 92, 246, 0.2)',
            color: '#a855f7',
            fontSize: '0.6rem',
            height: 20
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{
          p: 0.5,
          borderRadius: '8px',
          bgcolor: colors.border,
          color: colors.text,
          display: 'flex'
        }}>
          <Sparkles size={14} />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Sugerencia IA
        </Typography>
        <Chip
          label="En vivo"
          size="small"
          sx={{
            ml: 'auto',
            bgcolor: 'rgba(34, 197, 94, 0.2)',
            color: '#22c55e',
            fontSize: '0.55rem',
            height: 18,
            animation: 'pulse-green 2s infinite'
          }}
        />
      </Box>

      {/* Main message */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ color: colors.text, mt: 0.25 }}>
          {insight.icon}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, mb: 0.5 }}>
            {insight.message}
          </Typography>
          {insight.suggestion && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {insight.suggestion}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AIContextPanel;
