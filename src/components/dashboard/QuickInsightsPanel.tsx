/**
 * QuickInsightsPanel - Actionable AI Insights
 * Shows real-time insights with action buttons
 */

import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Chip, IconButton, Collapse } from '@mui/material';
import { Lightbulb, ChevronDown, ChevronUp, Droplet, Thermometer, Wind, Zap, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { apiClient } from '../../api/client';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  icon: React.ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp?: Date;
}

interface QuickInsightsPanelProps {
  temperature?: number;
  humidity?: number;
  vpd?: number;
  vwc?: number;
  onAction?: (action: string) => void;
}

const QuickInsightsPanel: React.FC<QuickInsightsPanelProps> = ({
  temperature = 0,
  humidity = 0,
  vpd = 0,
  vwc = 0,
  onAction
}) => {
  const { currentStage, getTargetVPD, settings, daysFlower } = useCropSteering();
  const [expanded, setExpanded] = useState(true);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const executeIrrigation = async (percentage: number) => {
    setExecutingAction(`irrigation_${percentage}`);
    try {
      const volumeMl = (settings.potSizeLiters || 3.8) * 10 * percentage;
      const pumpRate = settings.pumpRateMlPerMin || 60;
      const durationMs = Math.round((volumeMl / pumpRate) * 60 * 1000);

      await apiClient.pulseDevice('bombaControlador', durationMs);
      onAction?.(`Riego P${percentage/2} ejecutado: ${volumeMl.toFixed(0)}ml`);
    } catch (e) {
      console.error('Irrigation failed:', e);
    } finally {
      setExecutingAction(null);
    }
  };

  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];
    const targetVPD = getTargetVPD();
    const isFlower = !!settings.flipDate;
    const targetVWC = isFlower ? 45 : 50;

    // VPD Analysis
    if (vpd >= targetVPD.min && vpd <= targetVPD.max) {
      result.push({
        id: 'vpd_ok',
        type: 'success',
        icon: <Wind size={16} />,
        message: `VPD estable en ${vpd.toFixed(2)} kPa - óptimo`
      });
    } else if (vpd < targetVPD.min) {
      result.push({
        id: 'vpd_low',
        type: 'warning',
        icon: <Wind size={16} />,
        message: `VPD bajo (${vpd.toFixed(2)}) - reducir humedad o subir temp`,
        action: {
          label: 'Activar extractor',
          onClick: () => apiClient.controlDevice('extractorControlador', 'on')
        }
      });
    } else {
      result.push({
        id: 'vpd_high',
        type: 'warning',
        icon: <Wind size={16} />,
        message: `VPD alto (${vpd.toFixed(2)}) - aumentar humedad`,
        action: {
          label: 'Activar humidificador',
          onClick: () => apiClient.controlDevice('humidifier', 'on')
        }
      });
    }

    // VWC Analysis
    if (vwc > 55) {
      result.push({
        id: 'vwc_high',
        type: 'info',
        icon: <Droplet size={16} />,
        message: `VWC alto (${vwc.toFixed(0)}%) - en fase de saturación P1`
      });
    } else if (vwc >= targetVWC - 5 && vwc <= targetVWC + 10) {
      result.push({
        id: 'vwc_ok',
        type: 'success',
        icon: <Droplet size={16} />,
        message: `VWC en ${vwc.toFixed(0)}% - rango ideal para ${isFlower ? 'floración' : 'vegetativo'}`
      });
    } else if (vwc < 35) {
      result.push({
        id: 'vwc_critical',
        type: 'warning',
        icon: <Droplet size={16} />,
        message: `⚠️ VWC crítico (${vwc.toFixed(0)}%) - regar ahora`,
        action: {
          label: 'Riego P2 (8%)',
          onClick: () => executeIrrigation(8)
        }
      });
    } else if (vwc < targetVWC) {
      const hoursUntilCritical = Math.round((vwc - 35) / 2);
      result.push({
        id: 'vwc_low',
        type: 'action',
        icon: <Droplet size={16} />,
        message: `VWC en ${vwc.toFixed(0)}% - riego sugerido en ~${hoursUntilCritical}h`,
        action: {
          label: 'Riego P1 (4%)',
          onClick: () => executeIrrigation(4)
        }
      });
    }

    // Temperature Analysis
    if (temperature > 28) {
      result.push({
        id: 'temp_high',
        type: 'warning',
        icon: <Thermometer size={16} />,
        message: `Temperatura alta (${temperature.toFixed(1)}°C) - ventilar`,
        action: {
          label: 'Encender extractor',
          onClick: () => apiClient.controlDevice('extractorControlador', 'on')
        }
      });
    } else if (temperature < 20) {
      result.push({
        id: 'temp_low',
        type: 'info',
        icon: <Thermometer size={16} />,
        message: `Temperatura baja (${temperature.toFixed(1)}°C) - monitorear`
      });
    }

    // Flower-specific insights
    if (isFlower && daysFlower > 0) {
      if (daysFlower >= 49 && daysFlower <= 56) {
        result.push({
          id: 'flush_reminder',
          type: 'info',
          icon: <Zap size={16} />,
          message: `Día ${daysFlower} de floración - considerar flush final`
        });
      } else if (daysFlower >= 35 && daysFlower <= 42) {
        result.push({
          id: 'bulk_phase',
          type: 'success',
          icon: <Zap size={16} />,
          message: `Día ${daysFlower} - fase de engorde máximo`
        });
      }
    }

    // Add timestamp to limit insights to 5
    return result.slice(0, 5).map(insight => ({
      ...insight,
      timestamp: new Date()
    }));
  }, [temperature, humidity, vpd, vwc, currentStage, getTargetVPD, settings, daysFlower]);

  const typeColors = {
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#22c55e' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6' },
    action: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6', text: '#8b5cf6' }
  };

  const typeIcons = {
    success: <CheckCircle size={14} />,
    warning: <AlertTriangle size={14} />,
    info: <Info size={14} />,
    action: <Zap size={14} />
  };

  return (
    <Box
      sx={{
        borderRadius: '20px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: 'var(--glass-border)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            p: 0.75,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.2))',
            color: '#f59e0b'
          }}>
            <Lightbulb size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              Insights de Hoy
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {insights.length} {insights.length === 1 ? 'observación' : 'observaciones'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </IconButton>
      </Box>

      {/* Insights List */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 1 }}>
          {insights.map((insight, idx) => (
            <Box
              key={insight.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                py: 1.5,
                borderBottom: idx < insights.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1 }}>
                <Box sx={{
                  color: typeColors[insight.type].text,
                  mt: 0.25
                }}>
                  {typeIcons[insight.type]}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  {insight.message}
                </Typography>
              </Box>

              {insight.action && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    insight.action?.onClick();
                  }}
                  disabled={executingAction === insight.id}
                  sx={{
                    borderRadius: '8px',
                    borderColor: typeColors[insight.type].border,
                    color: typeColors[insight.type].text,
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1.5,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      borderColor: typeColors[insight.type].text,
                      bgcolor: typeColors[insight.type].bg
                    }
                  }}
                >
                  {insight.action.label}
                </Button>
              )}
            </Box>
          ))}

          {insights.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
              <CheckCircle size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Typography variant="body2">Sin alertas - todo en orden</Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default QuickInsightsPanel;
