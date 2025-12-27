/**
 * UnifiedAIPanel - Componente fusionado de AI Insights + Smart Notifications
 * Diseño Premium Glassmorphism con tarjetas interactivas
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Zap,
  Droplets,
  Thermometer,
  Wind,
  BrainCircuit,
  Activity,
  ShieldCheck,
  ShieldAlert,
  WifiOff,
  Check
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface AIItem {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  action?: { label: string; command: string };
  icon?: string;
  source: 'ai' | 'sensor';
  containerStyle?: React.CSSProperties;
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
  const [loading, setLoading] = useState(true); // Changed initial state to true
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  // Debug State
  const [debugMode, setDebugMode] = useState(false);
  const [tuyaDevices, setTuyaDevices] = useState<any[]>([]);

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
          title: insight.type === 'critical' ? 'Atención Requerida' : insight.type === 'warning' ? 'Sugerencia de Optimización' : 'Estado Óptimo',
          message: insight.message,
          action: insight.action ? { label: insight.action, command: insight.action } : undefined,
          source: 'ai',
        });
      });

      // Add sensor-based alerts
      if (sensors) {
        if (sensors.vpd !== null && sensors.vpd !== undefined) {
          if (sensors.vpd < 0.4) {
            combined.unshift({
                id: 'vpd-low', type: 'critical', title: 'Riesgo Fúngico',
                message: `VPD Crítico (${sensors.vpd.toFixed(2)} kPa). Aumentar temperatura o reducir humedad inmediatamente.`,
                action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' }, icon: 'wind', source: 'sensor'
            });
          } else if (sensors.vpd > 1.6) {
            combined.push({
                id: 'vpd-high', type: 'warning', title: 'Posible Estrés Hídrico',
                message: `VPD Alto (${sensors.vpd.toFixed(2)} kPa). Las plantas pueden cerrar estomas.`,
                action: { label: 'Activar Humidificador', command: 'toggle_device(humidifier, on)' }, icon: 'droplets', source: 'sensor'
            });
          }
        }

        if (sensors.temperature !== null && sensors.temperature > 30) {
            combined.unshift({
                id: 'temp-high', type: 'critical', title: 'Estrés Térmico',
                message: `Temperatura en ${sensors.temperature.toFixed(1)}°C. Riesgo de degradación de terpenos.`,
                action: { label: 'Enfriar Ahora', command: 'toggle_device(extractorControlador, on)' }, icon: 'thermometer', source: 'sensor'
            });
        }

            combined.push({
                id: 'substrate-dry', type: 'info', title: 'Riego Necesario',
                message: `Humedad de sustrato al ${sensors.substrateHumidity.toFixed(0)}%.`,
                action: { label: 'Iniciar Riego (30s)', command: 'set_irrigation(30)' }, icon: 'droplets', source: 'sensor'
            });

        // All good fallback
        if (combined.length === 0) {
            combined.push({
                id: 'all-good', type: 'success', title: 'Sistemas Nominales',
                message: 'Todos los parámetros biológicos dentro de rangos óptimos. Crecimiento estable.', source: 'sensor',
                icon: 'check'
            });
        }
      } else {
          // Offline / Error state
          combined.push({
              id: 'connection-loss',
              type: 'critical',
              title: 'Sin Conexión',
              message: 'Se perdió la comunicación con los sensores. Revisa tu red o el controlador.',
              action: { label: 'Reconectar', command: 'RETRY_FETCH' },
              containerStyle: { opacity: 0.8 },
              icon: 'wifi-off',
              source: 'sensor'
          });
      }

      setItems(combined);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);

      // Fetch devices for diagnostics (ONCE or low freq)
      try {
           const devRes = await apiClient.getTuyaDevices();
           if (devRes && devRes.devices) {
               setTuyaDevices(devRes.devices);
           }
      } catch (e) { console.warn('Device fetch failed', e); }
    }
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      // Enforce 60s minimum to avoid 429 Rate Limits
      const safeInterval = Math.max(refreshInterval, 60000);
      const interval = setInterval(fetchData, safeInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleManualRefresh = () => {
    fetchData();
  };

  const executeAction = async (item: AIItem) => {
    if (!item.action) return;

    // Handle local retry action
    if (item.action.command === 'RETRY_FETCH') {
        fetchData();
        return;
    }

    setExecuting(item.id);
    try {
      // Parse command for direct execution
      if (item.action.command.startsWith('set_irrigation(')) {
        // format: set_irrigation(30)
        const match = item.action.command.match(/set_irrigation\((\d+)\)/);
        if (match) {
           const seconds = parseInt(match[1]);
           // Convert seconds to ml based on default pump rate (70ml/min)
           // 30s = 0.5 min * 70 = 35ml
           const volumeMl = (seconds / 60) * 70;

           // Use dedicated irrigation endpoint which is more robust
           await apiClient.request('/api/irrigation/trigger', {
              method: 'POST',
              body: JSON.stringify({ shotSize: Math.round(volumeMl), phase: 'manual' })
           });
        }
      } else if (item.action.command.startsWith('toggle_device(')) {
        // format: toggle_device(deviceId, on)
        const match = item.action.command.match(/toggle_device\(([^,]+),\s*(on|off)\)/);
        if (match) {
            const [_, deviceId, state] = match;
            await apiClient.controlDevice(deviceId.trim(), state as 'on' | 'off');
        } else {
             // Fallback for simple toggle without state
             const simpleMatch = item.action.command.match(/toggle_device\(([^)]+)\)/);
             if (simpleMatch) {
                 await apiClient.toggleDevice(simpleMatch[1].trim() as any);
             }
        }
      } else {
        // Fallback to AI Chat
        await apiClient.sendChatMessageV2(item.action.command);
      }

      setTimeout(fetchData, 2000);
    } catch (error: any) {
      console.error('Error executing action:', error);
      if (error && (error.status === 429 || (error.message && error.message.includes('429')))) {
         alert('⚠️ Servidor Saturado (429). Por favor espera 5 minutos antes de intentar activar la bomba nuevamente.');
      }
    } finally {
      // Optional: Show error toast
      setExecuting(null);
    }
  };

  const getTheme = (type: string) => {
    switch (type) {
      case 'critical': return {
          color: '#ffffff', // White text on saturated bg
          bg: 'linear-gradient(135deg, rgba(185, 28, 28, 0.95) 0%, rgba(153, 27, 27, 0.95) 100%)', // Strong Red
          border: 'rgba(252, 165, 165, 0.5)',
          icon: ShieldAlert
      };
      case 'warning': return {
          color: '#ffffff',
          bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.95) 0%, rgba(180, 83, 9, 0.95) 100%)', // Strong Amber
          border: 'rgba(253, 186, 116, 0.5)',
          icon: AlertTriangle
      };
      case 'success': return {
          color: '#ffffff',
          bg: 'linear-gradient(135deg, rgba(21, 128, 61, 0.95) 0%, rgba(22, 101, 52, 0.95) 100%)', // Strong Green
          border: 'rgba(134, 239, 172, 0.5)',
          icon: ShieldCheck
      };
      default: return {
          // Info / Irrigation (Blue)
          color: '#ffffff',
          bg: 'linear-gradient(135deg, rgba(29, 78, 216, 0.95) 0%, rgba(30, 64, 175, 0.95) 100%)', // Strong Blue
          border: 'rgba(147, 197, 253, 0.5)',
          icon: Sparkles
      };
    }
  };

  // Stats
  const criticalCount = items.filter(i => i.type === 'critical').length;
  const warningCount = items.filter(i => i.type === 'warning').length;
  // Score formula: 100 - (critical * 20) - (warning * 10)
  const healthScore = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 10));

  return (
    <Box sx={{
        gridColumn: 'span 4',
        width: '100%',
        position: 'relative',
        zIndex: 5
    }}>
      {/* Visual Header */}
      <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2,
          p: 2, borderRadius: '16px',
          background: 'linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.1) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)'
      }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                  p: 1.5, borderRadius: '12px', bgcolor: 'rgba(6,182,212,0.2)',
                  boxShadow: '0 0 15px rgba(6,182,212,0.3)'
              }}>
                  <BrainCircuit size={24} className="text-cyan-400" />
              </Box>
              <Box>
                  <Typography variant="h6" fontWeight={700} color="white" sx={{ letterSpacing: 0.5 }}>
                      CEREBRO CENTRAL
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
                      <Typography variant="caption" color="text.secondary">
                        Sistemas IA Online • {lastUpdate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                  </Box>
              </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Health Circular Indicator */}
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress
                    variant="determinate" value={100} size={50} thickness={4}
                    sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate" value={healthScore} size={50} thickness={4}
                    sx={{
                        color: healthScore > 80 ? '#22c55e' : healthScore > 50 ? '#f59e0b' : '#ef4444',
                        filter: 'drop-shadow(0 0 4px currentColor)'
                    }}
                  />
                  <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Activity size={12} color={healthScore > 80 ? '#22c55e' : healthScore > 50 ? '#f59e0b' : '#ef4444'} />
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem', color: 'white' }}>{healthScore}%</Typography>
                  </Box>
              </Box>

              <Tooltip title="Actualizar Análisis">
                <IconButton onClick={handleManualRefresh} disabled={loading} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </IconButton>
              </Tooltip>
              <IconButton
                 size="small"
                 sx={{ color: debugMode ? '#22d3ee' : 'rgba(255,255,255,0.3)' }}
                 onClick={() => setDebugMode(!debugMode)}
              >
                 <Activity size={18} />
              </IconButton>
          </Box>
      </Box>

      {/* DEBUG DEVICE LIST */}
       <Collapse in={debugMode}>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, maxHeight: 200, overflowY: 'auto' }}>
              <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1 }}>Dispositivos Detectados (Diagnóstico)</Typography>
              {tuyaDevices.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#666' }}>No se encontraron dispositivos o error de carga.</Typography>
              ) : (
                  tuyaDevices.map(d => (
                      <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Box>
                              <Typography variant="caption" display="block" sx={{ color: 'white', fontWeight: 600 }}>{d.name}</Typography>
                              <Typography variant="caption" display="block" sx={{ color: '#666', fontSize: '0.65rem' }}>ID: {d.id} | Status: {d.status}</Typography>
                          </Box>
                          <Button
                              size="small"
                              variant="outlined"
                              sx={{ minWidth: 60, py: 0.2, fontSize: '0.65rem', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                              onClick={() => {
                                  if (confirm(`¿Toggle ${d.name}?`)) {
                                      apiClient.controlDevice(d.id, 'on').catch(err => alert(err.message));
                                      setTimeout(() => apiClient.controlDevice(d.id, 'off'), 5000); // 5s test pulse
                                  }
                              }}
                          >
                              TEST 5s
                          </Button>
                      </Box>
                  ))
              )}
          </Box>
       </Collapse>

      {/* Cards Scroll Container */}
      <Box sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1,
          px: 0.5,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }
      }}>
          {loading && items.length === 0 ? (
              [1,2,3].map(i => (
                  <Box key={i} sx={{ minWidth: 260, height: 160, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.03)' }} />
              ))
          ) : (
              items.map((item) => {
                  const theme = getTheme(item.type);
                  // Use specific icon if available, otherwise theme icon
                  const Icon = item.icon === 'wind' ? Wind :
                               item.icon === 'droplets' ? Droplets :
                               item.icon === 'thermometer' ? Thermometer :
                               item.icon === 'wifi-off' ? WifiOff :
                               item.icon === 'check' ? Check :
                               theme.icon;

                  return (
                    <Box
                        key={item.id}
                        sx={{
                            minWidth: 300,
                            maxWidth: 340,
                            p: 3, // More padding
                            borderRadius: '24px',
                            background: theme.bg,
                            border: `1px solid ${theme.border}`,
                            backdropFilter: 'blur(20px)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-4px) scale(1.02)',
                                boxShadow: `0 20px 40px -10px ${theme.color}30`,
                                border: `1px solid ${theme.color}80`
                            }
                        }}
                    >
                        {/* Status Line */}
                        <Box sx={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '3px',
                            bgcolor: theme.color, boxShadow: `0 0 10px ${theme.color}`
                        }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, mt: 1 }}>
                            <Box sx={{
                                p: 1, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.2)', color: 'white' // White icon on dark bg
                            }}>
                                <Icon size={24} />
                            </Box>
                            {item.source === 'ai' && (
                                <Chip label="AI INSIGHT" size="small" sx={{
                                    height: 20, fontSize: '0.6rem', fontWeight: 800,
                                    bgcolor: 'rgba(6,182,212,0.2)', color: '#22d3ee', letterSpacing: 1
                                }} />
                            )}
                        </Box>

                        <Typography variant="h6" fontWeight={800} color="white" gutterBottom sx={{ lineHeight: 1.2 }}>
                            {item.title}
                        </Typography>

                        <Typography variant="body2" color="rgba(255,255,255,0.9)" sx={{
                            mb: 2,
                            fontSize: '0.9rem',
                            lineHeight: 1.5
                        }}>
                            {item.message}
                        </Typography>

                        {item.action && (
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={executing === item.id ? <CircularProgress size={14} color="inherit" /> : <Zap size={14} />}
                                onClick={() => executeAction(item)}
                                disabled={executing === item.id}
                                sx={{
                                    borderColor: theme.border,
                                    color: theme.color,
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    textOverflow: 'clip', // Allow text to show full
                                    whiteSpace: 'normal', // Allow wrap
                                    overflow: 'visible',
                                    height: 'auto',
                                    py: 1,
                                    px: 2,
                                    lineHeight: 1.2,
                                    boxShadow: `0 4px 10px rgba(0,0,0,0.2)`,
                                    bgcolor: 'rgba(255,255,255,0.15)', // Light button bg
                                    '&:hover': {
                                        borderColor: 'white',
                                        bgcolor: 'rgba(255,255,255,0.25)',
                                        boxShadow: `0 0 15px rgba(255,255,255,0.3)`
                                    }
                                }}
                            >
                                {item.action.label}
                            </Button>
                        )}
                    </Box>
                  );
              })
          )}
      </Box>
    </Box>
  );
};

export default UnifiedAIPanel;
