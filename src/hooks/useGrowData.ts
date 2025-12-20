/**
 * useGrowData - Centralized Data Hook
 * Provides unified access to sensor data, device states, and cultivation metrics
 * across all pages with automatic polling and caching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, SensorData, DeviceStates } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';

interface GrowDataState {
  sensors: SensorData | null;
  history: SensorData[];
  devices: DeviceStates | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface HealthScore {
  overall: 'excellent' | 'good' | 'attention' | 'critical';
  score: number;
  factors: {
    vpd: { status: 'optimal' | 'warning' | 'critical'; value: number; target: [number, number] };
    vwc: { status: 'optimal' | 'warning' | 'critical'; value: number; target: [number, number] };
    temp: { status: 'optimal' | 'warning' | 'critical'; value: number; target: [number, number] };
    hum: { status: 'optimal' | 'warning' | 'critical'; value: number; target: [number, number] };
  };
  recommendation: string;
}

interface UseGrowDataReturn extends GrowDataState {
  health: HealthScore | null;
  refresh: () => Promise<void>;
  isFlower: boolean;
  dayCount: number;
  irrigationPhase: 'P1' | 'P2' | 'P3';
}

export const useGrowData = (pollInterval = 10000): UseGrowDataReturn => {
  const { settings, daysVeg, daysFlower, getTargetVPD, getTargetTemp, getTargetHumidity } = useCropSteering();

  const [state, setState] = useState<GrowDataState>({
    sensors: null,
    history: [],
    devices: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const isFlower = !!settings.flipDate;
  const dayCount = isFlower ? daysFlower : daysVeg;

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [sensors, history, devices] = await Promise.allSettled([
        apiClient.getLatestSensors(),
        apiClient.getSensorHistory(),
        apiClient.getDeviceStates()
      ]);

      setState(prev => ({
        ...prev,
        sensors: sensors.status === 'fulfilled' ? sensors.value : prev.sensors,
        history: history.status === 'fulfilled' ? history.value : prev.history,
        devices: devices.status === 'fulfilled' ? devices.value : prev.devices,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));
    } catch (e: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: e.message || 'Error fetching data'
      }));
    }
  }, []);

  // Public refresh function
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await fetchData();
  }, [fetchData]);

  // Poll data
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, pollInterval]);

  // Calculate health score
  const health = useMemo<HealthScore | null>(() => {
    if (!state.sensors) return null;

    const targetVPD = getTargetVPD();
    const targetTemp = getTargetTemp();
    const targetHum = getTargetHumidity();
    const targetVWC: [number, number] = isFlower ? [35, 55] : [40, 60];

    // Helper to get status
    const getStatus = (value: number, target: [number, number]): 'optimal' | 'warning' | 'critical' => {
      const [min, max] = target;
      const margin = (max - min) * 0.15;
      if (value >= min && value <= max) return 'optimal';
      if (value >= min - margin && value <= max + margin) return 'warning';
      return 'critical';
    };

    const factors = {
      vpd: {
        status: getStatus(state.sensors.vpd || 0, [targetVPD.min, targetVPD.max]),
        value: state.sensors.vpd || 0,
        target: [targetVPD.min, targetVPD.max] as [number, number]
      },
      vwc: {
        status: getStatus(state.sensors.substrateHumidity || 0, targetVWC),
        value: state.sensors.substrateHumidity || 0,
        target: targetVWC
      },
      temp: {
        status: getStatus(state.sensors.temperature || 0, [targetTemp.dayMin, targetTemp.dayMax]),
        value: state.sensors.temperature || 0,
        target: [targetTemp.dayMin, targetTemp.dayMax] as [number, number]
      },
      hum: {
        status: getStatus(state.sensors.humidity || 0, [targetHum.dayMin, targetHum.dayMax]),
        value: state.sensors.humidity || 0,
        target: [targetHum.dayMin, targetHum.dayMax] as [number, number]
      }
    };

    // Calculate score
    let score = 100;
    const criticalFactors: string[] = [];
    const warningFactors: string[] = [];

    Object.entries(factors).forEach(([key, data]) => {
      if (data.status === 'critical') {
        score -= 25;
        criticalFactors.push(key);
      } else if (data.status === 'warning') {
        score -= 10;
        warningFactors.push(key);
      }
    });

    score = Math.max(0, Math.min(100, score));

    // Determine overall status
    let overall: 'excellent' | 'good' | 'attention' | 'critical' = 'excellent';
    if (score < 50) overall = 'critical';
    else if (score < 70) overall = 'attention';
    else if (score < 90) overall = 'good';

    // Generate recommendation
    let recommendation = 'Todas las métricas están en rango óptimo.';
    if (criticalFactors.length > 0) {
      recommendation = `Atención urgente: ${criticalFactors.join(', ')} fuera de rango.`;
    } else if (warningFactors.length > 0) {
      recommendation = `Monitorear: ${warningFactors.join(', ')} cerca del límite.`;
    }

    return { overall, score, factors, recommendation };
  }, [state.sensors, getTargetVPD, getTargetTemp, getTargetHumidity, isFlower]);

  // Calculate irrigation phase based on time
  const irrigationPhase = useMemo<'P1' | 'P2' | 'P3'>(() => {
    const hour = new Date().getHours();
    const lightsOnHour = parseInt(settings.lightsOnTime?.split(':')[0] || '6');
    const lightsOffHour = parseInt(settings.lightsOffTime?.split(':')[0] || '0') || 24;

    const hoursAfterLightsOn = (hour - lightsOnHour + 24) % 24;

    if (hoursAfterLightsOn < 5) return 'P1'; // Ramp up
    if (hoursAfterLightsOn < 10) return 'P2'; // Maintenance
    return 'P3'; // Dryback
  }, [settings.lightsOnTime, settings.lightsOffTime]);

  return {
    ...state,
    health,
    refresh,
    isFlower,
    dayCount,
    irrigationPhase
  };
};

export default useGrowData;
