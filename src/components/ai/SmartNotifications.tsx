import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Droplets,
  Thermometer,
  Sun,
  Wind,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  action?: { label: string; command: string };
  timestamp: string;
  read: boolean;
  icon?: string;
}

interface SmartNotificationsProps {
  maxVisible?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onActionExecuted?: (action: { label: string; command: string }) => void;
}

const SmartNotifications: React.FC<SmartNotificationsProps> = ({
  maxVisible = 5,
  autoRefresh = true,
  refreshInterval = 60000,
  onActionExecuted
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  // Fetch insights from AI and convert to notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const insightsData = await apiClient.getAIInsights();

      // Also fetch sensor data for additional context
      const sensors = await apiClient.getLatestSensors();

      const newNotifications: Notification[] = [];

      // Add AI insights as notifications
      insightsData.insights?.forEach((insight, index) => {
        newNotifications.push({
          id: `insight-${Date.now()}-${index}`,
          type: insight.type,
          title: getInsightTitle(insight.type),
          message: insight.message,
          action: insight.action ? { label: insight.action, command: insight.action } : undefined,
          timestamp: new Date().toISOString(),
          read: false,
          icon: getInsightIcon(insight.type)
        });
      });

      // Add sensor-based alerts
      if (sensors) {
        // VPD Alert
        if (sensors.vpd !== null && sensors.vpd !== undefined) {
          if (sensors.vpd < 0.4) {
            newNotifications.push({
              id: `vpd-low-${Date.now()}`,
              type: 'critical',
              title: 'VPD Crítico',
              message: `VPD muy bajo (${sensors.vpd} kPa). Riesgo de hongos. Reduce humedad o aumenta temperatura.`,
              action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' },
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'wind'
            });
          } else if (sensors.vpd > 1.6) {
            newNotifications.push({
              id: `vpd-high-${Date.now()}`,
              type: 'warning',
              title: 'VPD Alto',
              message: `VPD alto (${sensors.vpd} kPa). Las plantas pueden estresarse. Aumenta humedad.`,
              action: { label: 'Activar Humidificador', command: 'toggle_device(humidifier, on)' },
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'droplets'
            });
          }
        }

        // Temperature Alert
        if (sensors.temperature !== null && sensors.temperature !== undefined) {
          if (sensors.temperature > 30) {
            newNotifications.push({
              id: `temp-high-${Date.now()}`,
              type: 'critical',
              title: 'Temperatura Crítica',
              message: `Temperatura muy alta (${sensors.temperature}°C). Activa ventilación.`,
              action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' },
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'thermometer'
            });
          } else if (sensors.temperature < 18) {
            newNotifications.push({
              id: `temp-low-${Date.now()}`,
              type: 'warning',
              title: 'Temperatura Baja',
              message: `Temperatura baja (${sensors.temperature}°C). Las plantas crecen más lento.`,
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'thermometer'
            });
          }
        }

        // Substrate humidity
        if (sensors.substrateHumidity !== null && sensors.substrateHumidity !== undefined) {
          if (sensors.substrateHumidity < 30) {
            newNotifications.push({
              id: `substrate-dry-${Date.now()}`,
              type: 'warning',
              title: 'Sustrato Seco',
              message: `Humedad del sustrato baja (${sensors.substrateHumidity}%). Considera regar.`,
              action: { label: 'Iniciar Riego', command: 'set_irrigation(30)' },
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'droplets'
            });
          } else if (sensors.substrateHumidity > 80) {
            newNotifications.push({
              id: `substrate-wet-${Date.now()}`,
              type: 'info',
              title: 'Sustrato Húmedo',
              message: `Sustrato muy húmedo (${sensors.substrateHumidity}%). Espera antes del próximo riego.`,
              timestamp: new Date().toISOString(),
              read: false,
              icon: 'droplets'
            });
          }
        }

        // If all is well
        if (newNotifications.length === 0) {
          newNotifications.push({
            id: `all-good-${Date.now()}`,
            type: 'success',
            title: 'Todo en Orden',
            message: 'Los parámetros del cultivo están dentro de rangos óptimos. 🌱',
            timestamp: new Date().toISOString(),
            read: false,
            icon: 'check'
          });
        }
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchNotifications();

    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Execute action via AI
  const executeAction = async (notification: Notification) => {
    if (!notification.action) return;

    setExecuting(notification.id);
    try {
      // Send command to AI to execute
      const result = await apiClient.sendChatMessageV2(notification.action.command);

      // Mark as read
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );

      onActionExecuted?.(notification.action);

      // Refresh notifications
      setTimeout(fetchNotifications, 2000);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setExecuting(null);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const getInsightTitle = (type: string) => {
    switch (type) {
      case 'critical': return 'Alerta Crítica';
      case 'warning': return 'Advertencia';
      case 'success': return 'Estado Óptimo';
      default: return 'Información';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return 'alert';
      case 'warning': return 'warning';
      case 'success': return 'check';
      default: return 'info';
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

  const getIcon = (iconName?: string, type?: string) => {
    const color = getTypeColor(type || 'info');
    const size = 18;

    switch (iconName) {
      case 'droplets': return <Droplets size={size} color={color} />;
      case 'thermometer': return <Thermometer size={size} color={color} />;
      case 'sun': return <Sun size={size} color={color} />;
      case 'wind': return <Wind size={size} color={color} />;
      case 'check': return <CheckCircle size={size} color={color} />;
      case 'warning': return <AlertTriangle size={size} color={color} />;
      case 'alert': return <XCircle size={size} color={color} />;
      default: return <Sparkles size={size} color={color} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box className="glass-panel" sx={{
      borderRadius: 'var(--squircle-radius)',
      bgcolor: 'var(--glass-bg)',
      backdropFilter: 'var(--backdrop-blur)',
      border: 'var(--glass-border)',
      boxShadow: 'var(--glass-shadow)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Bell size={20} color="#a5f3fc" />
          </Badge>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
            Alertas Inteligentes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); fetchNotifications(); }} sx={{ color: 'white' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </IconButton>
          {expanded ? <ChevronUp size={18} color="white" /> : <ChevronDown size={18} color="white" />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
          </Box>
        ) : (
          <List dense sx={{ p: 0 }}>
            {notifications.slice(0, maxVisible).map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  opacity: notification.read ? 0.6 : 1,
                  borderLeft: `3px solid ${getTypeColor(notification.type)}`,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
                onClick={() => markAsRead(notification.id)}
              >
                <ListItemAvatar>
                  <Avatar sx={{
                    bgcolor: `${getTypeColor(notification.type)}20`,
                    width: 36, height: 36
                  }}>
                    {getIcon(notification.icon, notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                        {notification.message}
                      </Typography>
                      {notification.action && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={executing === notification.id ? <CircularProgress size={12} /> : <Zap size={12} />}
                          onClick={(e) => { e.stopPropagation(); executeAction(notification); }}
                          disabled={executing === notification.id}
                          sx={{
                            mt: 1, fontSize: '0.7rem', py: 0.25,
                            borderColor: getTypeColor(notification.type),
                            color: getTypeColor(notification.type),
                            '&:hover': { bgcolor: `${getTypeColor(notification.type)}20` }
                          }}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {notifications.length === 0 && !loading && (
          <Box sx={{ p: 3, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <CheckCircle size={32} />
            <Typography variant="body2" sx={{ mt: 1 }}>Sin alertas pendientes</Typography>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

export default SmartNotifications;
