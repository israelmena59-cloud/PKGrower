/**
 * Stage Dashboard Component
 * Shows current vs target comparison for crop steering parameters
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Thermometer,
  Droplets,
  Sun,
  Leaf,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface StageData {
  stage: {
    id: string;
    name: string;
    startDate: string | null;
    daysInStage: number;
  };
  current: {
    temperature: number;
    humidity: number;
    vpd: number;
    vwc: number;
    dli: number;
  };
  targets: {
    temperature: { day: number; night: number };
    humidity: { day: number; night: number };
    vpd: { min: number; max: number; target: number };
    vwc: { min: number; target: number; max: number };
    dryback: { min: number; max: number };
    ec: { input: number; substrate: number };
    light: { ppfd: number; dli: number; hours: number };
  };
  status: {
    vpdStatus: 'optimal' | 'warning';
    tempStatus: 'optimal' | 'warning';
    vwcStatus: 'optimal' | 'warning';
  };
}

interface Recommendation {
  shouldIrrigate: boolean;
  phase: string;
  reason: string;
  suggestedPercentage: number;
  nextIrrigationIn: number | null;
}

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  current: number | string;
  target: string;
  status: 'optimal' | 'warning' | 'danger';
  unit: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ icon, label, current, target, status, unit }) => {
  const statusColor = status === 'optimal' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
  const StatusIcon = status === 'optimal' ? CheckCircle : AlertTriangle;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ color: 'text.secondary', mr: 2 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">Target: {target}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" fontWeight={600}>{current}{unit}</Typography>
        <StatusIcon size={18} color={statusColor} />
      </Box>
    </Box>
  );
};

const StageDashboard: React.FC = () => {
  const [data, setData] = useState<StageData | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');
  const [saving, setSaving] = useState(false);

  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://34.67.217.13:3000';

  const fetchData = async () => {
    try {
      const [statusRes, recoRes, stagesRes] = await Promise.all([
        fetch(`${API_URL}/api/crop-steering/status`),
        fetch(`${API_URL}/api/crop-steering/recommendation`),
        fetch(`${API_URL}/api/crop-steering/stages`)
      ]);

      const statusData = await statusRes.json();
      const recoData = await recoRes.json();
      const stagesData = await stagesRes.json();

      if (statusData.success) {
        // Transform /status response into UI format
        // Fetch latest sensor data for current values
        const sensorRes = await fetch(`${API_URL}/api/sensors/latest`);
        const sensorData = await sensorRes.json();

        // Map stage ID to display name
        const stageNames: Record<string, string> = {
          'veg_early': 'Vegetativo Temprano',
          'veg_late': 'Vegetativo Tardío',
          'transition': 'Transición',
          'flower_early': 'Floración Temprana',
          'flower_mid': 'Floración Media',
          'flower_late': 'Floración Tardía',
          'ripening': 'Maduración'
        };

        const safeData = {
          ...statusData,
          stage: {
            id: statusData.stage || 'veg_early',
            name: stageNames[statusData.stage] || statusData.direction || 'Vegetativo',
            daysInStage: statusData.daysInCycle || 0
          },
          current: {
            temperature: sensorData.temperature || 0,
            humidity: sensorData.humidity || 0,
            vpd: sensorData.vpd || 0,
            vwc: statusData.currentVWC || sensorData.substrateHumidity || 0,
            dli: 0
          },
          targets: {
            temperature: { day: 26, night: 22 },
            humidity: { day: 55, night: 65 },
            vpd: { min: 0.8, max: 1.2, target: 1.0 },
            vwc: { min: 40, target: statusData.targetVWC || 55, max: 70 },
            dryback: { min: 5, max: 15 },
            ec: { input: 1.8, substrate: 2.2 },
            light: { ppfd: 800, dli: 45, hours: 12 }
          },
          status: {
            vpdStatus: (sensorData.vpd >= 0.8 && sensorData.vpd <= 1.2) ? 'optimal' : 'warning',
            tempStatus: (sensorData.temperature >= 22 && sensorData.temperature <= 28) ? 'optimal' : 'warning',
            vwcStatus: ((statusData.currentVWC || 0) >= 40) ? 'optimal' : 'warning'
          }
        };
        setData(safeData);
        setSelectedStage(statusData.stage || 'veg_early');
      }
      if (recoData.success && recoData.recommendation) setRecommendation(recoData.recommendation);
      if (stagesData.success && stagesData.stages) setStages(stagesData.stages);
    } catch (e) {
      console.error('Error fetching crop steering data:', e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleStageChange = async (newStage: string) => {
    console.log('[StageDashboard] Changing stage to:', newStage);
    console.log('[StageDashboard] API URL:', API_URL);
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/crop-steering/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      console.log('[StageDashboard] Response status:', res.status);
      const data = await res.json();
      console.log('[StageDashboard] Response data:', data);
      if (res.ok && data.success) {
        setSelectedStage(newStage);
        await fetchData();
      } else {
        console.error('[StageDashboard] Stage change failed:', data);
      }
    } catch (e) {
      console.error('[StageDashboard] Error setting stage:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando estado de cultivo...</Typography>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Error cargando datos</Typography>
      </Card>
    );
  }

  const getVWCStatus = (): 'optimal' | 'warning' | 'danger' => {
    if (data.current.vwc >= data.targets.vwc.min && data.current.vwc <= data.targets.vwc.max) return 'optimal';
    if (data.current.vwc < data.targets.vwc.min - 10 || data.current.vwc > data.targets.vwc.max + 10) return 'danger';
    return 'warning';
  };

  const getVPDStatus = (): 'optimal' | 'warning' | 'danger' => {
    if (data.current.vpd >= data.targets.vpd.min && data.current.vpd <= data.targets.vpd.max) return 'optimal';
    if (data.current.vpd < data.targets.vpd.min - 0.3 || data.current.vpd > data.targets.vpd.max + 0.3) return 'danger';
    return 'warning';
  };

  return (
    <Card sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Centro de Control</Typography>
          <Typography variant="body2" color="text.secondary">
            Día {data?.stage?.daysInStage || 0} en {data?.stage?.name || 'Cargando...'}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Etapa</InputLabel>
          <Select
            value={selectedStage}
            label="Etapa"
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={saving}
          >
            {stages.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Recommendation Banner */}
      {recommendation && (
        <Box sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: recommendation.shouldIrrigate ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
          border: '1px solid',
          borderColor: recommendation.shouldIrrigate ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {recommendation.shouldIrrigate ? (
              <Droplets color="#22c55e" size={24} />
            ) : (
              <Clock color="#6b7280" size={24} />
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {recommendation.shouldIrrigate
                  ? `Regar ahora (${recommendation.phase.toUpperCase()}) - ${recommendation.suggestedPercentage}%`
                  : 'Monitoreo'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {recommendation.reason}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Metrics Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Ambiente</Typography>
          <MetricRow
            icon={<Thermometer size={20} />}
            label="Temperatura"
            current={data.current.temperature}
            target={`${data.targets.temperature.night}-${data.targets.temperature.day}°C`}
            status={data.status.tempStatus}
            unit="°C"
          />
          <MetricRow
            icon={<Droplets size={20} />}
            label="Humedad"
            current={data.current.humidity}
            target={`${data.targets.humidity.night}-${data.targets.humidity.day}%`}
            status={data.status.vpdStatus === 'optimal' ? 'optimal' : 'warning'}
            unit="%"
          />
          <MetricRow
            icon={<TrendingUp size={20} />}
            label="VPD"
            current={data.current.vpd}
            target={`${data.targets.vpd.min}-${data.targets.vpd.max} kPa`}
            status={getVPDStatus()}
            unit=" kPa"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Sustrato</Typography>
          <MetricRow
            icon={<Leaf size={20} />}
            label="VWC"
            current={data.current.vwc}
            target={`${data.targets.vwc.min}-${data.targets.vwc.max}%`}
            status={getVWCStatus()}
            unit="%"
          />
          <MetricRow
            icon={<Sun size={20} />}
            label="DLI Estimado"
            current={data.current.dli}
            target={`${data.targets.light.dli} mol/m²/día`}
            status={Math.abs(data.current.dli - data.targets.light.dli) < 5 ? 'optimal' : 'warning'}
            unit=" mol"
          />
          <Box sx={{ py: 1.5 }}>
            <Typography variant="body2" fontWeight={500}>Dryback Target</Typography>
            <Typography variant="caption" color="text.secondary">
              {data.targets.dryback.min}-{data.targets.dryback.max}% para esta etapa
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* EC Targets */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Objetivos EC</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">EC Input</Typography>
            <Typography variant="h6">{data.targets.ec.input} mS/cm</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">EC Sustrato</Typography>
            <Typography variant="h6">{data.targets.ec.substrate} mS/cm</Typography>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
};

export default StageDashboard;
