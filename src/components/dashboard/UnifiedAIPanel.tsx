/**
 * UnifiedAIPanel - Componente fusionado de AI Insights + Smart Notifications
 * Reemplaza AIInsightsWidget y SmartNotifications en un solo componente horizontal
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Sparkles,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle,
  Zap,
  Droplets,
  Thermometer,
  Wind,
  Lightbulb,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface AIItem {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info' | 'insight';
  title: string;
  message: string;
  action?: { label: string; command: string };
  icon?: string;
  source: 'ai' | 'sensor';
}

interface UnifiedAIPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const UnifiedAIPanel: React.FC<UnifiedAIPanelProps> = ({
  autoRefresh = true,
  refreshInterval = 60000,
}) => {
  const [items, setItems] = useState<AIItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch combined data from AI insights and sensors
  const fetchData = async () => {
    setLoading(true);
    try {
      const [insightsData, sensors] = await Promise.all([
        apiClient.getAIInsights().catch(() => ({ insights: [] })),
        apiClient.getLatestSensors().catch(() => null),
      ]);

      const combined: AIItem[] = [];

      // Add AI insights
      insightsData.insights?.forEach((insight: any, index: number) => {
        combined.push({
          id: `insight-${index}`,
          type: insight.type === 'critical' ? 'critical' : insight.type === 'warning' ? 'warning' : 'success',
          title: insight.type === 'critical' ? '⚠️ Crítico' : insight.type === 'warning' ? '💡 Sugerencia' : '✅ Óptimo',
          message: insight.message,
          action: insight.action ? { label: insight.action, command: insight.action } : undefined,
          source: 'ai',
        });
      });

      // Add sensor-based alerts (only if anomalies)
      if (sensors) {
        if (sensors.vpd !== null && sensors.vpd !== undefined) {
          if (sensors.vpd < 0.4) {
            combined.push({
              id: 'vpd-low',
              type: 'critical',
              title: 'VPD Crítico',
              message: `VPD: ${sensors.vpd.toFixed(2)} kPa - Riesgo de hongos`,
              action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' },
              icon: 'wind',
              source: 'sensor',
            });
          } else if (sensors.vpd > 1.6) {
            combined.push({
              id: 'vpd-high',
              type: 'warning',
              title: 'VPD Alto',
              message: `VPD: ${sensors.vpd.toFixed(2)} kPa - Estrés posible`,
              action: { label: 'Activar Humidificador', command: 'toggle_device(humidifier, on)' },
              icon: 'droplets',
              source: 'sensor',
            });
          }
        }

        if (sensors.temperature !== null && sensors.temperature > 30) {
          combined.push({
            id: 'temp-high',
            type: 'critical',
            title: 'Temp. Alta',
            message: `${sensors.temperature.toFixed(1)}°C - Activar ventilación`,
            action: { label: 'Enfriar', command: 'toggle_device(extractorControlador, on)' },
            icon: 'thermometer',
            source: 'sensor',
          });
        }

        if (sensors.substrateHumidity !== null && sensors.substrateHumidity < 30) {
          combined.push({
            id: 'substrate-dry',
            type: 'warning',
            title: 'Sustrato Seco',
            message: `${sensors.substrateHumidity.toFixed(0)}% - Necesita riego`,
            action: { label: 'Regar', command: 'set_irrigation(30)' },
            icon: 'droplets',
            source: 'sensor',
          });
        }

        // All good message
        if (combined.filter(i => i.source === 'sensor').length === 0 && combined.length === 0) {
          combined.push({
            id: 'all-good',
            type: 'success',
            title: 'Todo en Orden',
            message: 'Parámetros dentro de rangos óptimos 🌱',
            source: 'sensor',
          });
        }
      }

      setItems(combined);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching AI data:', error);
      setItems([{ id: 'error', type: 'warning', title: 'Error', message: 'No se pudieron cargar datos', source: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Execute action
  const executeAction = async (item: AIItem) => {
    if (!item.action) return;
    setExecuting(item.id);
    try {
      await apiClient.sendChatMessageV2(item.action.command);
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setExecuting(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'success': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  const getTypeIcon = (type: string, icon?: string) => {
    const size = 16;
    if (icon === 'droplets') return <Droplets size={size} />;
    if (icon === 'thermometer') return <Thermometer size={size} />;
    if (icon === 'wind') return <Wind size={size} />;

    switch (type) {
      case 'critical': return <AlertTriangle size={size} />;
      case 'warning': return <Lightbulb size={size} />;
      case 'success': return <CheckCircle size={size} />;
      default: return <Sparkles size={size} />;
    }
  };

  // Summary stats
  const criticalCount = items.filter(i => i.type === 'critical').length;
  const warningCount = items.filter(i => i.type === 'warning').length;
  const healthScore = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));

  return (
    <Box
      className="glass-panel"
      sx={{
        p: 2,
        borderRadius: 'var(--squircle-radius)',
        bgcolor: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: 'var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        gridColumn: 'span 4',
        width: '100%',
      }}
    >
      {/* Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Sparkles size={22} className="text-cyan-400 animate-pulse" />
          <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
            Centro de Control IA
          </Typography>
          {lastUpdate && (
            <Chip
              size="small"
              label={lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              sx={{ fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Health Score */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Salud:
            </Typography>
            <Box sx={{ width: 80 }}>
              <LinearProgress
                variant="determinate"
                value={healthScore}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: healthScore > 70 ? '#22c55e' : healthScore > 40 ? '#f59e0b' : '#ef4444',
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
            <Typography variant="caption" fontWeight="bold" sx={{ color: 'white' }}>
              {healthScore}%
            </Typography>
          </Box>

          {/* Counters */}
          {criticalCount > 0 && (
            <Chip
              icon={<AlertTriangle size={12} />}
              label={criticalCount}
              size="small"
              sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.7rem' }}
            />
          )}
          {warningCount > 0 && (
            <Chip
              icon={<Lightbulb size={12} />}
              label={warningCount}
              size="small"
              sx={{ bgcolor: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.7rem' }}
            />
          )}

          <Tooltip title="Actualizar">
            <IconButton
              size="small"
              onClick={fetchData}
              disabled={loading}
              sx={{ color: 'white' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Items Row */}
      {loading && items.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} sx={{ color: 'cyan' }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
          }}
        >
          {items.length === 0 ? (
            <Box sx={{ flex: 1, textAlign: 'center', py: 2, color: 'rgba(255,255,255,0.5)' }}>
              <TrendingUp size={32} />
              <Typography variant="body2" mt={1}>Analizando...</Typography>
            </Box>
          ) : (
            items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  minWidth: 200,
                  maxWidth: 280,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: `${getTypeColor(item.type)}15`,
                  border: `1px solid ${getTypeColor(item.type)}40`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: `${getTypeColor(item.type)}25`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: getTypeColor(item.type) }}>
                    {getTypeIcon(item.type, item.icon)}
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    sx={{ color: getTypeColor(item.type) }}
                  >
                    {item.title}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.8rem',
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  {item.message}
                </Typography>

                {item.action && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={executing === item.id ? <CircularProgress size={12} /> : <Zap size={12} />}
                    onClick={() => executeAction(item)}
                    disabled={executing === item.id}
                    sx={{
                      bgcolor: getTypeColor(item.type),
                      fontSize: '0.7rem',
                      py: 0.5,
                      '&:hover': { bgcolor: getTypeColor(item.type), filter: 'brightness(1.1)' },
                    }}
                  >
                    {item.action.label}
                  </Button>
                )}
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};

export default UnifiedAIPanel;
