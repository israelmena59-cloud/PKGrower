/**
 * SmartTooltip - AI-enhanced tooltips that provide contextual help
 * Shows intelligent suggestions based on the current state
 */

import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipProps,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface SmartTooltipProps extends Omit<TooltipProps, 'title'> {
  /** Static content to show */
  title: string;
  /** Context for AI suggestions */
  context?: {
    metric?: string;
    value?: number;
    unit?: string;
    target?: { min: number; max: number };
    stage?: string;
  };
  /** Show AI-enhanced content */
  enableAI?: boolean;
}

// AI suggestion generator based on context
const getAISuggestion = (context: SmartTooltipProps['context']): {
  type: 'success' | 'warning' | 'info';
  message: string;
} | null => {
  if (!context) return null;

  const { metric, value, target, stage } = context;

  // VPD suggestions
  if (metric === 'vpd' && value !== undefined) {
    if (target && value < target.min) {
      return {
        type: 'warning',
        message: `VPD bajo (${value.toFixed(2)}). Reduce humedad o aumenta temperatura para alcanzar ${target.min}-${target.max} kPa.`
      };
    }
    if (target && value > target.max) {
      return {
        type: 'warning',
        message: `VPD alto (${value.toFixed(2)}). Aumenta humedad para reducir estrés en plantas.`
      };
    }
    return {
      type: 'success',
      message: `VPD óptimo (${value.toFixed(2)} kPa). Condiciones ideales para ${stage || 'crecimiento'}.`
    };
  }

  // Temperature suggestions
  if (metric === 'temperature' && value !== undefined) {
    if (value > 30) {
      return {
        type: 'warning',
        message: `Temperatura alta (${value}°C). Activa ventilación o reduce intensidad lumínica.`
      };
    }
    if (value < 18) {
      return {
        type: 'warning',
        message: `Temperatura baja (${value}°C). Las plantas crecerán más lento.`
      };
    }
    return {
      type: 'success',
      message: `Temperatura ideal (${value}°C) para fotosíntesis óptima.`
    };
  }

  // Humidity suggestions
  if (metric === 'humidity' && value !== undefined) {
    const stage_low = stage?.includes('flower') ? 45 : 55;
    const stage_high = stage?.includes('flower') ? 55 : 70;

    if (value < stage_low) {
      return {
        type: 'info',
        message: `Humedad baja (${value}%). Considera activar humidificador.`
      };
    }
    if (value > stage_high) {
      return {
        type: 'warning',
        message: `Humedad alta (${value}%). Riesgo de hongos. Aumenta ventilación.`
      };
    }
    return {
      type: 'success',
      message: `Humedad correcta (${value}%) para la etapa actual.`
    };
  }

  // Substrate/VWC suggestions
  if ((metric === 'vwc' || metric === 'substrate') && value !== undefined) {
    if (value < 30) {
      return {
        type: 'warning',
        message: `Sustrato seco (${value}%). Las plantas necesitan riego pronto.`
      };
    }
    if (value > 75) {
      return {
        type: 'info',
        message: `Sustrato muy húmedo (${value}%). Espera para el próximo riego.`
      };
    }
    return {
      type: 'success',
      message: `Humedad del sustrato correcta (${value}%).`
    };
  }

  return null;
};

const SmartTooltip: React.FC<SmartTooltipProps> = ({
  title,
  context,
  enableAI = true,
  children,
  ...props
}) => {
  const aiSuggestion = enableAI && context ? getAISuggestion(context) : null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} color="#22c55e" />;
      case 'warning': return <AlertTriangle size={14} color="#f59e0b" />;
      default: return <Lightbulb size={14} color="#3b82f6" />;
    }
  };

  const tooltipContent = (
    <Box sx={{ maxWidth: 280, p: 0.5 }}>
      {/* Main title */}
      <Typography variant="body2" fontWeight="bold" sx={{ mb: aiSuggestion ? 1 : 0 }}>
        {title}
      </Typography>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 1,
            mt: 1,
            borderRadius: 1,
            bgcolor: aiSuggestion.type === 'success'
              ? 'rgba(34, 197, 94, 0.15)'
              : aiSuggestion.type === 'warning'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${
              aiSuggestion.type === 'success'
                ? 'rgba(34, 197, 94, 0.3)'
                : aiSuggestion.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)'
            }`,
          }}
        >
          <Box sx={{ mt: 0.25 }}>{getIcon(aiSuggestion.type)}</Box>
          <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
            {aiSuggestion.message}
          </Typography>
        </Box>
      )}

      {/* AI Badge */}
      {enableAI && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Chip
            icon={<Sparkles size={10} />}
            label="AI"
            size="small"
            sx={{
              height: 16,
              fontSize: '0.6rem',
              bgcolor: 'rgba(6, 182, 212, 0.2)',
              color: '#22d3ee',
              '& .MuiChip-icon': { color: '#22d3ee' },
            }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Tooltip
      {...props}
      title={tooltipContent}
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            '& .MuiTooltip-arrow': {
              color: 'rgba(15, 23, 42, 0.95)',
            },
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
};

export default SmartTooltip;
