/**
 * LiveStatusIndicator - Real-time system status indicator
 * Shows connection status and key metrics in the sidebar
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import {
  Wifi,
  WifiOff,
  Thermometer,
  Droplet,
  Wind,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface SystemStatus {
  connected: boolean;
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
  vwc: number | null;
  lastUpdate: Date | null;
}

const LiveStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    connected: false,
    temperature: null,
    humidity: null,
    vpd: null,
    vwc: null,
    lastUpdate: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const sensors = await apiClient.getLatestSensors();
      if (sensors) {
        setStatus({
          connected: true,
          temperature: sensors.temperature,
          humidity: sensors.humidity,
          vpd: sensors.vpd,
          vwc: sensors.substrateHumidity,
          lastUpdate: new Date(),
        });
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, connected: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine VPD status
  const vpdStatus = status.vpd !== null
    ? status.vpd < 0.4 ? 'critical' : status.vpd > 1.6 ? 'warning' : 'optimal'
    : 'unknown';

  const getVpdColor = () => {
    switch (vpdStatus) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'optimal': return '#22c55e';
      default: return '#64748b';
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '12px',
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Connection Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {status.connected ? (
            <Wifi size={14} color="#22c55e" />
          ) : (
            <WifiOff size={14} color="#ef4444" />
          )}
          <Typography variant="caption" sx={{ color: status.connected ? '#22c55e' : '#ef4444' }}>
            {status.connected ? 'Conectado' : 'Sin conexión'}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: status.connected ? '#22c55e' : '#ef4444',
            boxShadow: status.connected
              ? '0 0 8px rgba(34, 197, 94, 0.5)'
              : '0 0 8px rgba(239, 68, 68, 0.5)',
            animation: status.connected ? 'pulse 2s infinite' : 'none',
          }}
        />
      </Box>

      {/* Quick Metrics */}
      {status.connected && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Tooltip title="Temperatura" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Thermometer size={12} color="#ef4444" />
              <Typography variant="caption" fontWeight="medium">
                {status.temperature?.toFixed(1) ?? '--'}°C
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Humedad" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Droplet size={12} color="#3b82f6" />
              <Typography variant="caption" fontWeight="medium">
                {status.humidity?.toFixed(0) ?? '--'}%
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="VPD" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Wind size={12} color={getVpdColor()} />
              <Typography variant="caption" fontWeight="medium" sx={{ color: getVpdColor() }}>
                {status.vpd?.toFixed(2) ?? '--'} kPa
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title="VWC Sustrato" arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Activity size={12} color="#f59e0b" />
              <Typography variant="caption" fontWeight="medium">
                {status.vwc?.toFixed(0) ?? '--'}%
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* VPD Alert */}
      {status.connected && vpdStatus !== 'optimal' && vpdStatus !== 'unknown' && (
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            borderRadius: '8px',
            bgcolor: vpdStatus === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${vpdStatus === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <AlertCircle size={12} color={vpdStatus === 'critical' ? '#ef4444' : '#f59e0b'} />
          <Typography variant="caption" sx={{ color: vpdStatus === 'critical' ? '#ef4444' : '#f59e0b' }}>
            VPD {vpdStatus === 'critical' ? 'crítico' : 'fuera de rango'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LiveStatusIndicator;
