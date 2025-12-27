/**
 * Stage Dashboard Component
 * Premium AI-Enhanced Design with Dynamic Themes based on Crop Stage
 */

import React, { useState, useEffect } from 'react';
import { useRooms } from '../../context/RoomContext';
import {
  Card,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Grid
} from '@mui/material';
import {
  Thermometer,
  Droplets,
  Sun,
  Clock,
  Save,
  Sprout,
  Flower2,
  Zap,
  Wind,
  BrainCircuit
} from 'lucide-react';

// --- Types ---
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

// --- Dynamic Theme Helper ---
const getStageTheme = (stageId: string) => {
  if (stageId.includes('veg')) {
    return {
      gradient: 'linear-gradient(180deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0) 100%)',
      background: 'linear-gradient(180deg, #052e16 0%, #0a0a0a 100%)', // Deep Green to Black
      border: 'rgba(74, 222, 128, 0.3)',
      iconColor: '#4ade80', // Bright Green
      mainIcon: Sprout,
      accent: 'success.main',
      glow: '0 0 40px rgba(34,197,94,0.2)'
    };
  }
  if (stageId.includes('flower')) {
    return {
      gradient: 'linear-gradient(180deg, rgba(192,38,211,0.25) 0%, rgba(192,38,211,0) 100%)',
      background: 'linear-gradient(180deg, #2e052a 0%, #0a0a0a 100%)', // Deep Purple to Black
      border: 'rgba(232, 121, 249, 0.3)',
      iconColor: '#e879f9', // Bright Fuchsia
      mainIcon: Flower2,
      accent: 'secondary.main',
      glow: '0 0 40px rgba(192,38,211,0.2)'
    };
  }
  if (stageId === 'ripening') {
    return {
      gradient: 'linear-gradient(180deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0) 100%)',
      background: 'linear-gradient(180deg, #2e1c05 0%, #0a0a0a 100%)', // Deep Amber to Black
      border: 'rgba(251, 191, 36, 0.3)',
      iconColor: '#fbbf24', // Bright Amber
      mainIcon: Sun,
      accent: 'warning.main',
      glow: '0 0 40px rgba(245,158,11,0.2)'
    };
  }
  // Transition or Default
  return {
    gradient: 'linear-gradient(180deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0) 100%)',
    background: 'linear-gradient(180deg, #0f1c30 0%, #0a0a0a 100%)', // Deep Blue to Black
    border: 'rgba(96, 165, 250, 0.3)',
    iconColor: '#60a5fa', // Bright Blue
    mainIcon: Wind,
    accent: 'info.main',
    glow: '0 0 40px rgba(59,130,246,0.2)'
  };
};

const MetricCard = ({ label, value, unit, target, status, icon: Icon, theme }: any) => (
  <Box sx={{
    p: 2,
    borderRadius: '16px',
    bgcolor: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderColor: status === 'optimal' ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(255,255,255,0.05)' }
  }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label.toUpperCase()}</Typography>
      <Icon size={16} color={status === 'optimal' ? theme.iconColor : '#ef4444'} />
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
      <Typography variant="h5" fontWeight={700} color="white">
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{unit}</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto' }}>
      <Typography variant="caption" sx={{
        color: status === 'optimal' ? 'text.secondary' : 'error.main',
        bgcolor: status === 'optimal' ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.1)',
        px: 1, py: 0.5, borderRadius: '4px', width: '100%', textAlign: 'center'
      }}>
        Meta: {target}
      </Typography>
    </Box>
  </Box>
);

const StageDashboard: React.FC = () => {
  const { activeRoom, updateRoom } = useRooms();
  const [data, setData] = useState<StageData | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');

  // New state for manual day override via long press or click (hidden feature)
  const [editingDay, setEditingDay] = useState(false);
  const [tempDay, setTempDay] = useState(0);

  const API_URL = (import.meta as any).env.VITE_API_URL;

  const fetchData = async () => {
    try {
      const [statusRes, recoRes] = await Promise.all([
        fetch(`${API_URL}/api/crop-steering/status`),
        fetch(`${API_URL}/api/crop-steering/recommendation`)
      ]);

      const statusData = await statusRes.json();
      const recoData = await recoRes.json();

      if (statusData.success) {
        const sensorRes = await fetch(`${API_URL}/api/sensors/latest`);
        const sensorData = await sensorRes.json();

        const stageNames: Record<string, string> = {
          'veg_early': 'Vegetativo Temprano',
          'veg_late': 'Vegetativo Tardío',
          'transition': 'Transición pre-flor',
          'flower_early': 'Floración Temprana',
          'flower_mid': 'Floración Media (Engorde)',
          'flower_late': 'Floración Tardía (Maduración)',
          'ripening': 'Lavado de Raíces'
        };

        let calculatedDays = statusData.daysInCycle || 0;
        const activeStageId = activeRoom?.currentStage || selectedStage || statusData.stage || 'veg_early';

        if (activeRoom) {
            const isFlower = activeStageId.includes('flower') || activeStageId === 'ripening' || activeStageId === 'transition';
            const relevantDate = isFlower
                ? (activeRoom.flipDate || activeRoom.growStartDate)
                : activeRoom.growStartDate;

            if (relevantDate) {
                const start = new Date(relevantDate);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - start.getTime());
                calculatedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        const safeData = {
          ...statusData,
          stage: {
            id: activeStageId,
            name: stageNames[activeStageId] || statusData.direction || 'Vegetativo',
            daysInStage: calculatedDays
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
            ec: { input: activeStageId.includes('flower') ? 2.4 : 1.8, substrate: activeStageId.includes('flower') ? 3.0 : 2.2 },
            light: { ppfd: 800, dli: 45, hours: 12 }
          },
          status: {
            vpdStatus: (sensorData.vpd >= 0.8 && sensorData.vpd <= 1.2) ? 'optimal' : 'warning',
            tempStatus: (sensorData.temperature >= 22 && sensorData.temperature <= 28) ? 'optimal' : 'warning',
            vwcStatus: ((statusData.currentVWC || 0) >= 40) ? 'optimal' : 'warning'
          }
        };
        setData(safeData);

        if (activeRoom?.currentStage && activeRoom.currentStage !== selectedStage) {
             setSelectedStage(activeRoom.currentStage);
        } else if (!selectedStage) {
             setSelectedStage(statusData.stage || 'veg_early');
        }
      }
      if (recoData.success && recoData.recommendation) setRecommendation(recoData.recommendation);
    } catch (e) {
      console.error('Error fetching crop steering data:', e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // Simplified handler for saving manual day override
  const handleDaySave = async () => {
    if (!activeRoom) return;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - tempDay);
    const dateString = startDate.toISOString().split('T')[0];

    const updates: any = {};
    const isFlower = selectedStage.includes('flower') || selectedStage === 'ripening';
    if (isFlower) updates.flipDate = dateString;
    else updates.growStartDate = dateString;

    await updateRoom(activeRoom.id, updates);
    setEditingDay(false);
    setTimeout(fetchData, 500);
  };

  if (loading) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', background: 'transparent', boxShadow: 'none' }}>
        <CircularProgress size={40} thickness={4} sx={{ color: 'rgba(255,255,255,0.3)' }} />
      </Card>
    );
  }

  if (!data) return null;

  const theme = getStageTheme(data.stage.id);
  const MainIcon = theme.mainIcon;

  return (
    <Card sx={{
      p: 0,
      borderRadius: '24px',
      overflow: 'hidden',
      background: theme.background,
      border: `1px solid ${theme.border}`,
      boxShadow: theme.glow,
      transition: 'all 0.5s ease-in-out'
    }}>
      {/* --- Dynamic Header --- */}
      <Box sx={{
        background: theme.gradient,
        p: 3,
        pt: 4,
        position: 'relative'
      }}>
        {/* Background Pattern */}
        <Box sx={{
            position: 'absolute', top: 0, right: 0, opacity: 0.1,
            transform: 'translate(20%, -20%) scale(2)'
        }}>
            <MainIcon size={200} />
        </Box>

        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
             <Box sx={{
                 display: 'flex', alignItems: 'center', gap: 1,
                 bgcolor: 'rgba(0,0,0,0.3)', px: 1.5, py: 0.5, borderRadius: '12px',
                 backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
             }}>
                 <BrainCircuit size={14} className="text-blue-400 animate-pulse" />
                 <Typography variant="caption" fontWeight={600} color="text.secondary">
                     IA ACTIVADA
                 </Typography>
             </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, position: 'relative', zIndex: 1 }}>
          <Box sx={{
              p: 1.5, borderRadius: '16px',
              bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <MainIcon size={32} color={theme.iconColor} />
          </Box>
          <Box>
            <Typography variant="overline" color="rgba(255,255,255,0.7)" letterSpacing={1.5}>
              ETAPA ACTUAL
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              {data.stage.name}
            </Typography>
          </Box>
        </Box>

        {/* Day Counter Big */}
        <Box sx={{ mt: 3, mb: 1, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
            {editingDay ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 1, borderRadius: '12px' }}>
                    <Typography>Día:</Typography>
                    <input
                        type="number"
                        value={tempDay}
                        onChange={e => setTempDay(Number(e.target.value))}
                        style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', width: '60px', fontWeight: 'bold' }}
                    />
                    <IconButton size="small" onClick={handleDaySave} sx={{ color: '#22c55e' }}><Save size={20}/></IconButton>
                </Box>
            ) : (
                <Box onClick={() => { setTempDay(data.stage.daysInStage); setEditingDay(true); }} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h1" fontWeight={900} sx={{ fontSize: '4.5rem', lineHeight: 1, color: '#fff' }}>
                        Día {data.stage.daysInStage}
                    </Typography>
                </Box>
            )}
            <Typography variant="h6" color="rgba(255,255,255,0.6)" sx={{ mb: 1 }}>del ciclo</Typography>
        </Box>

        {/* Progress Bar Visual (Fake for now based on typical 60 day flower) */}
        <Box sx={{ mt: 2, height: '4px', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <Box sx={{
                height: '100%',
                width: `${Math.min(100, (data.stage.daysInStage / (data.stage.id.includes('flower') ? 65 : 30)) * 100)}%`,
                bgcolor: theme.iconColor,
                boxShadow: `0 0 10px ${theme.iconColor}`
            }} />
        </Box>
      </Box>

      {/* --- Metrics Content --- */}
      <Box sx={{ p: 3, background: 'transparent' }}>

        {/* Recommendation Pill */}
        {recommendation && (
            <Box sx={{
                mb: 3, p: 2, borderRadius: '16px',
                bgcolor: recommendation.shouldIrrigate ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                border: '1px solid',
                borderColor: recommendation.shouldIrrigate ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: 2
            }}>
                 <Box sx={{
                     p: 1, borderRadius: '50%',
                     bgcolor: recommendation.shouldIrrigate ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'
                 }}>
                    {recommendation.shouldIrrigate ? <Droplets size={20} className="text-green-500" /> : <Clock size={20} className="text-gray-400" />}
                 </Box>
                 <Box>
                     <Typography variant="subtitle2" fontWeight={700} color="white">
                        {recommendation.shouldIrrigate ? 'RIEGO SUGERIDO' : 'MONITOREO ACTIVO'}
                     </Typography>
                     <Typography variant="body2" color="text.secondary">
                        {recommendation.reason}
                     </Typography>
                 </Box>
            </Box>
        )}

        <Grid container spacing={2}>
            {/* Quick Metrics */}
            <Grid item xs={6} md={3}>
                <MetricCard
                    label="Temperatura" value={data.current.temperature} unit="°C"
                    target={`${data.targets.temperature.night}-${data.targets.temperature.day}°`}
                    status={data.status.tempStatus} icon={Thermometer} theme={theme}
                />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard
                    label="VPD" value={data.current.vpd} unit="kPa"
                    target={`${data.targets.vpd.min}-${data.targets.vpd.max}`}
                    status={data.status.vpdStatus} icon={Wind} theme={theme}
                />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard
                    label="Humedad" value={data.current.humidity} unit="%"
                    target={`${data.targets.humidity.night}-${data.targets.humidity.day}%`}
                    status={'optimal'} icon={Droplets} theme={theme}
                />
            </Grid>
            <Grid item xs={6} md={3}>
                <MetricCard
                    label="EC Sustrato" value={data.targets.ec.substrate} unit="mS"
                    target="< 3.0"
                    status={'optimal'} icon={Zap} theme={theme}
                />
            </Grid>
        </Grid>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                Sincronizado con Sala Activa • {data.stage.name.toUpperCase()} • Actualizado hace instantes
            </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default StageDashboard;
