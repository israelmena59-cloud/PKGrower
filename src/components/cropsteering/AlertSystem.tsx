/**
 * Crop Steering Alert System
 * Contextual alerts based on environmental conditions and crop steering parameters
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Collapse, Chip, Button, Snackbar, Alert as MuiAlert } from '@mui/material';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Droplets,
  Gauge,
  Wind
} from 'lucide-react';
import { useCropSteering } from '../../context/CropSteeringContext';
import { ALERT_THRESHOLDS, AlertThreshold } from '../../config/cropSteeringConfig';

// ==================== TYPES ====================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface CropSteeringAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  targetValue?: string;
  action?: string;
  timestamp: Date;
  dismissed: boolean;
  autoResolve?: boolean;
}

// ==================== ALERT CONTEXT ====================

interface AlertContextType {
  alerts: CropSteeringAlert[];
  addAlert: (alert: Omit<CropSteeringAlert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
}

const AlertContext = React.createContext<AlertContextType | null>(null);

export const useAlerts = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
};

// ==================== ALERT PROVIDER ====================

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<CropSteeringAlert[]>([]);

  const addAlert = useCallback((alert: Omit<CropSteeringAlert, 'id' | 'timestamp' | 'dismissed'>) => {
    const id = `${alert.metric || 'alert'}_${Date.now()}`;

    // Check for duplicate (same metric within last 5 minutes)
    setAlerts(prev => {
      const recent = prev.find(a =>
        a.metric === alert.metric &&
        !a.dismissed &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000
      );

      if (recent) return prev; // Don't add duplicate

      const newAlert: CropSteeringAlert = {
        ...alert,
        id,
        timestamp: new Date(),
        dismissed: false
      };

      return [newAlert, ...prev.slice(0, 49)]; // Keep last 50
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, dismissed: true } : a
    ));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, dismissAlert, clearAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

// ==================== ALERT EVALUATOR ====================

export const useAlertEvaluator = () => {
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

  const [alerts, setAlerts] = useState<CropSteeringAlert[]>([]);

  const evaluateConditions = useCallback(() => {
    const newAlerts: CropSteeringAlert[] = [];
    const targets = {
      vpd: getTargetVPD(),
      temp: getTargetTemp(),
      humidity: getTargetHumidity(),
      vwc: getTargetVWC()
    };

    // VPD Alerts
    if (currentVPD < 0.4) {
      newAlerts.push({
        id: 'vpd_critical_low',
        severity: 'critical',
        title: 'VPD Crítico - Riesgo de Moho',
        message: 'El VPD está muy bajo, aumentando el riesgo de enfermedades fúngicas.',
        metric: 'vpd',
        currentValue: currentVPD,
        targetValue: `${targets.vpd.min} - ${targets.vpd.max} kPa`,
        action: 'Reducir humedad, aumentar ventilación',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (currentVPD < targets.vpd.min) {
      newAlerts.push({
        id: 'vpd_low',
        severity: 'warning',
        title: 'VPD Bajo',
        message: 'El VPD está por debajo del rango óptimo para esta etapa.',
        metric: 'vpd',
        currentValue: currentVPD,
        targetValue: `${targets.vpd.min} - ${targets.vpd.max} kPa`,
        action: 'Reducir humedad o aumentar temperatura',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (currentVPD > 1.8) {
      newAlerts.push({
        id: 'vpd_critical_high',
        severity: 'critical',
        title: 'VPD Crítico - Estrés Hídrico',
        message: 'El VPD es muy alto, las plantas sufren estrés hídrico severo.',
        metric: 'vpd',
        currentValue: currentVPD,
        targetValue: `${targets.vpd.min} - ${targets.vpd.max} kPa`,
        action: 'Aumentar humedad inmediatamente',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (currentVPD > targets.vpd.max) {
      newAlerts.push({
        id: 'vpd_high',
        severity: 'warning',
        title: 'VPD Alto',
        message: 'El VPD está por encima del rango óptimo.',
        metric: 'vpd',
        currentValue: currentVPD,
        targetValue: `${targets.vpd.min} - ${targets.vpd.max} kPa`,
        action: 'Aumentar humedad o reducir temperatura',
        timestamp: new Date(),
        dismissed: false
      });
    }

    // Temperature Alerts
    if (conditions.temperature > 32) {
      newAlerts.push({
        id: 'temp_critical_high',
        severity: 'critical',
        title: 'Temperatura Crítica',
        message: 'La temperatura es demasiado alta para las plantas.',
        metric: 'temperature',
        currentValue: conditions.temperature,
        targetValue: `${targets.temp.dayMin} - ${targets.temp.dayMax}°C`,
        action: 'Activar enfriamiento, reducir luz',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (conditions.temperature < 15) {
      newAlerts.push({
        id: 'temp_critical_low',
        severity: 'critical',
        title: 'Temperatura Demasiado Baja',
        message: 'El crecimiento está detenido por frío.',
        metric: 'temperature',
        currentValue: conditions.temperature,
        targetValue: `${targets.temp.dayMin} - ${targets.temp.dayMax}°C`,
        action: 'Activar calefacción',
        timestamp: new Date(),
        dismissed: false
      });
    }

    // VWC Alerts
    if (conditions.vwc < 15) {
      newAlerts.push({
        id: 'vwc_critical',
        severity: 'critical',
        title: 'Sustrato Seco',
        message: 'El sustrato está críticamente seco.',
        metric: 'vwc',
        currentValue: conditions.vwc,
        targetValue: `${targets.vwc.min} - ${targets.vwc.max}%`,
        action: 'Regar inmediatamente',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (conditions.vwc < targets.vwc.min) {
      newAlerts.push({
        id: 'vwc_low',
        severity: 'warning',
        title: 'VWC Bajo',
        message: 'El contenido de agua del sustrato está bajo.',
        metric: 'vwc',
        currentValue: conditions.vwc,
        targetValue: `${targets.vwc.min} - ${targets.vwc.max}%`,
        action: 'Considerar riego',
        timestamp: new Date(),
        dismissed: false
      });
    }

    // All good
    if (newAlerts.length === 0 && environmentStatus.overall === 'optimal') {
      newAlerts.push({
        id: 'all_optimal',
        severity: 'success',
        title: 'Condiciones Óptimas',
        message: 'Todos los parámetros están dentro del rango ideal.',
        timestamp: new Date(),
        dismissed: false,
        autoResolve: true
      });
    }

    setAlerts(newAlerts);
  }, [conditions, currentVPD, environmentStatus, getTargetVPD, getTargetTemp, getTargetHumidity, getTargetVWC]);

  // Evaluate every 30 seconds
  useEffect(() => {
    evaluateConditions();
    const interval = setInterval(evaluateConditions, 30000);
    return () => clearInterval(interval);
  }, [evaluateConditions]);

  return alerts;
};

// ==================== ALERT COMPONENTS ====================

interface AlertCardProps {
  alert: CropSteeringAlert;
  onDismiss?: () => void;
  compact?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onDismiss, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);

  const severityConfig = {
    critical: {
      color: '#FF3B30',
      bgColor: 'rgba(255, 59, 48, 0.1)',
      icon: <AlertCircle size={20} />
    },
    warning: {
      color: '#FF9500',
      bgColor: 'rgba(255, 149, 0, 0.1)',
      icon: <AlertTriangle size={20} />
    },
    info: {
      color: '#007AFF',
      bgColor: 'rgba(0, 122, 255, 0.1)',
      icon: <Info size={20} />
    },
    success: {
      color: '#34C759',
      bgColor: 'rgba(52, 199, 89, 0.1)',
      icon: <CheckCircle size={20} />
    }
  };

  const config = severityConfig[alert.severity];

  const metricIcons: Record<string, React.ReactNode> = {
    vpd: <Gauge size={14} />,
    temperature: <Thermometer size={14} />,
    humidity: <Droplets size={14} />,
    vwc: <Wind size={14} />
  };

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: '8px',
          bgcolor: config.bgColor,
          border: `1px solid ${config.color}30`
        }}
      >
        <Box sx={{ color: config.color }}>{config.icon}</Box>
        <Typography variant="caption" sx={{ flex: 1, color: config.color }}>
          {alert.title}
        </Typography>
        {onDismiss && (
          <IconButton size="small" onClick={onDismiss}>
            <X size={14} />
          </IconButton>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '12px',
        bgcolor: config.bgColor,
        border: `1px solid ${config.color}30`,
        mb: 1.5
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ color: config.color, mt: 0.5 }}>{config.icon}</Box>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: config.color }}>
              {alert.title}
            </Typography>
            {alert.metric && (
              <Chip
                icon={metricIcons[alert.metric] || undefined}
                label={alert.metric.toUpperCase()}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {alert.message}
          </Typography>

          {/* Values */}
          {alert.currentValue !== undefined && (
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Actual</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: config.color }}>
                  {alert.currentValue.toFixed(2)}
                </Typography>
              </Box>
              {alert.targetValue && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Objetivo</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {alert.targetValue}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Action */}
          {alert.action && (
            <Box
              sx={{
                p: 1,
                borderRadius: '8px',
                bgcolor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                💡 {alert.action}
              </Typography>
            </Box>
          )}
        </Box>

        {onDismiss && (
          <IconButton size="small" onClick={onDismiss}>
            <X size={16} />
          </IconButton>
        )}
      </Box>

      {/* Timestamp */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'right',
          color: 'text.disabled',
          mt: 1
        }}
      >
        {alert.timestamp.toLocaleTimeString()}
      </Typography>
    </Box>
  );
};

// ==================== ALERT LIST ====================

interface AlertListProps {
  maxAlerts?: number;
  showDismissed?: boolean;
}

export const AlertList: React.FC<AlertListProps> = ({
  maxAlerts = 5,
  showDismissed = false
}) => {
  const alerts = useAlertEvaluator();

  const visibleAlerts = alerts
    .filter(a => showDismissed || !a.dismissed)
    .slice(0, maxAlerts);

  if (visibleAlerts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
        <CheckCircle size={32} style={{ opacity: 0.5 }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          No hay alertas activas
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {visibleAlerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
        />
      ))}
    </Box>
  );
};

// ==================== TOAST NOTIFICATIONS ====================

export const AlertToast: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<CropSteeringAlert | null>(null);
  const alerts = useAlertEvaluator();

  useEffect(() => {
    const criticalAlert = alerts.find(a => a.severity === 'critical' && !a.dismissed);
    if (criticalAlert && criticalAlert.id !== currentAlert?.id) {
      setCurrentAlert(criticalAlert);
      setOpen(true);
    }
  }, [alerts, currentAlert?.id]);

  const handleClose = () => {
    setOpen(false);
  };

  if (!currentAlert) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MuiAlert
        severity="error"
        onClose={handleClose}
        sx={{
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {currentAlert.title}
        </Typography>
        <Typography variant="caption">
          {currentAlert.action}
        </Typography>
      </MuiAlert>
    </Snackbar>
  );
};

export default AlertList;
