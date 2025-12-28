/**
 * Crop Steering Context
 * Global state management for crop steering functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  GrowthStageId,
  GROWTH_STAGES,
  getStage,
  calculateDaysIntoGrow
} from '../config/cropSteeringConfig';
import {
  calculateVPD,
  calculateDryback,
  getCurrentIrrigationPhase,
  evaluateEnvironmentStatus,
  generateRecommendations,
  IrrigationPhaseId,
  EnvironmentStatus
} from '../utils/cropSteeringCalculations';
import { useRooms } from './RoomContext';

// ==================== TYPES ====================

export interface CropSteeringSettings {
  enabled: boolean;
  growStartDate: string | null; // Start of Veg
  flipDate: string | null; // Start of 12/12
  harvestDate: string | null; // Expected harvest
  currentStage: GrowthStageId;
  autoStageProgression: boolean;
  lightsOnHour: number;
  lightsOffHour: number;
  potSizeLiters: number;
  pumpRateMlPerMin: number; // Pump flow rate in ml/min for shot duration calculation
  // Override values (null = use stage defaults)
  overrides: {
    vpdTarget: number | null;
    tempDayTarget: number | null;
    tempNightTarget: number | null;
    humidityTarget: number | null;
    vwcTarget: number | null;
  };
}

export interface CurrentConditions {
  temperature: number;
  humidity: number;
  vpd: number;
  vwc: number;
  dryback: number;
  lastIrrigationVWC: number;
  lastIrrigationTime: Date | null;
}

interface CropSteeringContextType {
  // Settings
  settings: CropSteeringSettings;
  updateSettings: (updates: Partial<CropSteeringSettings>) => void;

  // Current state
  currentStage: GrowthStageId;
  setCurrentStage: (stage: GrowthStageId) => void;
  daysIntoGrow: number; // Total days
  daysVeg: number;
  daysFlower: number;
  daysIntoStage: number;
  daysRemainingInStage: number;

  // Current conditions (from sensors)
  conditions: CurrentConditions;
  updateConditions: (updates: Partial<CurrentConditions>) => void;

  // Calculated values
  currentVPD: number;
  currentPhase: IrrigationPhaseId;
  environmentStatus: EnvironmentStatus;
  recommendations: string[];

  // Stage parameters (with overrides applied)
  getTargetVPD: () => { min: number; max: number; target: number };
  getTargetTemp: () => { dayMin: number; dayMax: number; nightMin: number; nightMax: number };
  getTargetHumidity: () => { dayMin: number; dayMax: number; nightMin: number; nightMax: number };
  getTargetVWC: () => { min: number; max: number; target: number };

  // Actions
  triggerIrrigation: () => void;
  recordIrrigation: (peakVWC: number) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const defaultSettings: CropSteeringSettings = {
  enabled: true,
  growStartDate: null,
  flipDate: null,
  harvestDate: null,
  currentStage: 'veg_early',
  autoStageProgression: true,
  lightsOnHour: 6,
  lightsOffHour: 0, // Midnight for 18/6
  potSizeLiters: 3.8, // 1 gallon
  pumpRateMlPerMin: 60, // Default pump rate
  overrides: {
    vpdTarget: null,
    tempDayTarget: null,
    tempNightTarget: null,
    humidityTarget: null,
    vwcTarget: null
  }
};

const defaultConditions: CurrentConditions = {
  temperature: 25,
  humidity: 60,
  vpd: 1.0,
  vwc: 50,
  dryback: 0,
  lastIrrigationVWC: 65,
  lastIrrigationTime: null
};

// ==================== CONTEXT ====================

const CropSteeringContext = createContext<CropSteeringContextType | null>(null);

export const useCropSteering = (): CropSteeringContextType => {
  const context = useContext(CropSteeringContext);
  if (!context) {
    throw new Error('useCropSteering must be used within a CropSteeringProvider');
  }
  return context;
};

// ==================== PROVIDER ====================

interface CropSteeringProviderProps {
  children: ReactNode;
}

export const CropSteeringProvider: React.FC<CropSteeringProviderProps> = ({ children }) => {
  const { activeRoomId, activeRoom, updateRoom } = useRooms();
  const [settings, setSettings] = useState<CropSteeringSettings>(defaultSettings);
  const [conditions, setConditions] = useState<CurrentConditions>(defaultConditions);

  // Load settings from localStorage when activeRoomId changes
  useEffect(() => {
    const key = `cropSteeringSettings_${activeRoomId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error('Error loading crop steering settings:', e);
        setSettings(defaultSettings);
      }
    } else {
        setSettings(defaultSettings);
    }
  }, [activeRoomId]);

  // AUTO-FETCH: Poll sensor data every 60 seconds to keep conditions updated
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const { API_BASE_URL } = await import('../api/client');
        const response = await fetch(`${API_BASE_URL}/api/sensors/latest`);
        if (response.ok) {
          const data = await response.json();
          if (data.temperature && data.humidity) {
            setConditions(prev => ({
              ...prev,
              temperature: data.temperature,
              humidity: data.humidity,
              vpd: data.vpd || prev.vpd,
              vwc: data.substrateHumidity || prev.vwc
            }));
            console.log('[CropSteering] Sensor data updated:', { temp: data.temperature, hum: data.humidity });
          }
        }
      } catch (error) {
        console.warn('[CropSteering] Failed to fetch sensor data:', error);
      }
    };

    // Fetch immediately on mount
    fetchSensorData();

    // Then poll every 60 seconds
    const interval = setInterval(fetchSensorData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync room light schedule and dates to crop steering settings
  useEffect(() => {
    if (!activeRoom) return;

    // Parse time strings to hours
    const parseTimeToHour = (time: string) => {
      const [hours] = time.split(':').map(Number);
      return hours;
    };

    const roomSettings: Partial<CropSteeringSettings> = {};

    // Sync light schedule
    if (activeRoom.lightsOnTime) {
      roomSettings.lightsOnHour = parseTimeToHour(activeRoom.lightsOnTime);
    }
    if (activeRoom.lightsOffTime) {
      roomSettings.lightsOffHour = parseTimeToHour(activeRoom.lightsOffTime);
    }

    // Sync dates from room
    if (activeRoom.growStartDate && activeRoom.growStartDate !== settings.growStartDate) {
      roomSettings.growStartDate = activeRoom.growStartDate;
    }
    if (activeRoom.flipDate && activeRoom.flipDate !== settings.flipDate) {
      roomSettings.flipDate = activeRoom.flipDate;
    }
    if (activeRoom.harvestDate && activeRoom.harvestDate !== settings.harvestDate) {
      roomSettings.harvestDate = activeRoom.harvestDate;
    }

    // Apply room settings if any changed
    if (Object.keys(roomSettings).length > 0) {
      console.log('[CropSteering] Syncing from room:', activeRoom.name, roomSettings);
      setSettings(prev => ({ ...prev, ...roomSettings }));
    }
  }, [activeRoom?.id, activeRoom?.lightsOnTime, activeRoom?.lightsOffTime, activeRoom?.growStartDate, activeRoom?.flipDate]);
  // Calculate light hours from schedule
  const calculateLightHours = () => {
    const on = settings.lightsOnHour;
    const off = settings.lightsOffHour;
    if (off > on) return off - on;
    return 24 - on + off; // Handles overnight schedules
  };

  // Detect photoperiod type from light hours
  const detectPhotoperiodType = (): 'veg' | 'flower' | 'unknown' => {
    const hours = calculateLightHours();
    if (hours >= 16) return 'veg';    // 18/6 or similar
    if (hours <= 14) return 'flower'; // 12/12 or similar
    return 'unknown';
  };

  // Auto-update stage based on dates AND photoperiod
  useEffect(() => {
    if (!settings.autoStageProgression) return;

    let suggestedStage: GrowthStageId | 'none' = 'none';
    const photoperiod = detectPhotoperiodType();

    // 1. Check if we are in Flower (Flip Date set)
    if (settings.flipDate) {
        const flowerDays = calculateDaysIntoGrow(new Date(settings.flipDate));
        // Determine flower week based on valid GrowthStageIds
        if (flowerDays <= 14) suggestedStage = 'flower_transition'; // Weeks 1-2
        else if (flowerDays <= 35) suggestedStage = 'flower_early'; // Weeks 3-5
        else if (flowerDays <= 56) suggestedStage = 'flower_mid'; // Weeks 6-8
        else suggestedStage = 'flower_late'; // Week 8+
    }
    // 2. Check if we are in Veg (Only Start Date set)
    else if (settings.growStartDate) {
        const vegDays = calculateDaysIntoGrow(new Date(settings.growStartDate));
        if (vegDays <= 14) suggestedStage = 'veg_early';
        else suggestedStage = 'veg_late';
    }
    // 3. Fallback: Detect from photoperiod if no dates set
    else if (photoperiod !== 'unknown') {
        suggestedStage = photoperiod === 'veg' ? 'veg_early' : 'flower_transition';
        console.log(`[AutoStage] No dates set - using photoperiod detection: ${photoperiod}`);
    }

    // Apply update if changed
    if (suggestedStage !== 'none' && suggestedStage !== settings.currentStage) {
        console.log(`[AutoStage] Switching to ${suggestedStage} based on dates/photoperiod`);
        setSettings(prev => ({ ...prev, currentStage: suggestedStage }));
        if (activeRoom) {
            const updates: any = { currentStage: suggestedStage as any };

            // Auto-set Flip Date if entering flower/ripening and no date set
            const isFlower = suggestedStage.includes('flower') || suggestedStage === 'ripening';
            if (isFlower && !activeRoom.flipDate) {
                updates.flipDate = new Date().toISOString().split('T')[0];
                console.log('[AutoStage] Auto-setting Flip Date to today');
            }

            updateRoom(activeRoom.id, updates);
        }
    }
  }, [settings.growStartDate, settings.flipDate, settings.autoStageProgression, settings.lightsOnHour, settings.lightsOffHour, activeRoom?.id, activeRoom?.flipDate]);


  // Robust Date Parsing Helper
  const parseDate = (d: string | null) => {
      if (!d || d === '') return null;
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
  };

  const daysIntoGrow = (() => {
      const start = parseDate(settings.growStartDate);
      if (!start) return 1; // Default to Day 1
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  })();

  const daysVeg = (() => {
    const start = parseDate(settings.growStartDate);
    if (!start) return 0;

    // If flipped, veg ends at flip date. If not, veg ends now.
    const end = parseDate(settings.flipDate) || new Date();

    const diff = end.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // If not flipped yet, add 1 (current day counts). If flipped, exact diff.
    return Math.max(0, settings.flipDate ? days : days + 1);
  })();

  const daysFlower = (() => {
    const start = parseDate(settings.flipDate);
    if (!start) return 0;
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  })();

  const stage = getStage(settings.currentStage);

  // Calculate days into current stage
  const daysIntoStage = (() => {
    if (!settings.growStartDate) return 0;

    // Use specific counters for the active phase
    if (settings.flipDate) return daysFlower;
    return daysVeg;
  })();

  const daysRemainingInStage = Math.max(0, stage.durationDays - daysIntoStage);

  // Current VPD (calculated from conditions)
  const currentVPD = calculateVPD(conditions.temperature, conditions.humidity);

  // Current irrigation phase
  const currentPhase = getCurrentIrrigationPhase(
    new Date(),
    settings.lightsOnHour,
    settings.lightsOffHour,
    settings.currentStage
  );

  // Environment status
  const environmentStatus = evaluateEnvironmentStatus(
    settings.currentStage,
    currentVPD,
    conditions.temperature,
    conditions.humidity,
    conditions.vwc
  );

  // Recommendations
  const recommendations = generateRecommendations(
    settings.currentStage,
    currentVPD,
    conditions.temperature,
    conditions.humidity
  );

  // Getters with override support
  const getTargetVPD = useCallback(() => {
    const base = stage.vpd;
    return {
      min: base.min,
      max: base.max,
      target: settings.overrides.vpdTarget ?? base.target
    };
  }, [stage, settings.overrides.vpdTarget]);

  const getTargetTemp = useCallback(() => {
    const base = stage.temperature;
    return {
      dayMin: base.dayMin,
      dayMax: settings.overrides.tempDayTarget ?? base.dayMax,
      nightMin: base.nightMin,
      nightMax: settings.overrides.tempNightTarget ?? base.nightMax
    };
  }, [stage, settings.overrides]);

  const getTargetHumidity = useCallback(() => {
    const base = stage.humidity;
    const target = settings.overrides.humidityTarget;
    return {
      dayMin: target ? target - 5 : base.dayMin,
      dayMax: target ? target + 5 : base.dayMax,
      nightMin: base.nightMin,
      nightMax: base.nightMax
    };
  }, [stage, settings.overrides.humidityTarget]);

  const getTargetVWC = useCallback(() => {
    const base = stage.substrate;
    return {
      min: base.vwcMin,
      max: base.vwcMax,
      target: settings.overrides.vwcTarget ?? base.vwcTarget
    };
  }, [stage, settings.overrides.vwcTarget]);

  // Actions
  const updateSettings = useCallback((updates: Partial<CropSteeringSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      const key = `cropSteeringSettings_${activeRoomId}`;
      localStorage.setItem(key, JSON.stringify(updated));

      // Auto-sync to backend (debounced via setTimeout to avoid too many requests)
      setTimeout(async () => {
        try {
          const { API_BASE_URL } = await import('../api/client');
          await fetch(`${API_BASE_URL}/api/cropsteering/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          });
          console.log('[CropSteering] Settings synced to backend');
        } catch (e) {
          console.warn('[CropSteering] Backend sync failed, using localStorage:', e);
        }
      }, 500);

      return updated;
    });
  }, [activeRoomId]);

  const setCurrentStage = useCallback((stageId: GrowthStageId) => {
    updateSettings({ currentStage: stageId, autoStageProgression: false });
  }, [updateSettings]);

  const updateConditions = useCallback((updates: Partial<CurrentConditions>) => {
    setConditions(prev => {
      const updated = { ...prev, ...updates };

      // Auto-calculate dryback if we have last irrigation data
      if (prev.lastIrrigationVWC && updated.vwc) {
        updated.dryback = calculateDryback(updated.vwc, prev.lastIrrigationVWC);
      }

      return updated;
    });
  }, []);

  const recordIrrigation = useCallback((peakVWC: number) => {
    setConditions(prev => ({
      ...prev,
      lastIrrigationVWC: peakVWC,
      lastIrrigationTime: new Date(),
      dryback: 0
    }));
  }, []);

  const triggerIrrigation = useCallback(() => {
    // This would trigger actual irrigation via API
    console.log('[CropSteering] Triggering irrigation...');
    // TODO: Implement API call to trigger pump
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      // Import API_BASE_URL dynamically
      const { API_BASE_URL } = await import('../api/client');

      // Save to backend (Global settings for now, room support to be added properly later)
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropSteering: settings })
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const key = `cropSteeringSettings_${activeRoomId}`;
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving crop steering settings:', e);
      // Don't throw to prevent UI crashes, just log
    }
  }, [settings, activeRoomId]);

  const loadSettings = useCallback(async () => {
    try {
      // Import API_BASE_URL dynamically
      const { API_BASE_URL } = await import('../api/client');

      const response = await fetch(`${API_BASE_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.cropSteering) {
          setSettings(prev => ({ ...prev, ...data.cropSteering }));
        }
      }
    } catch (e) {
      console.error('Error loading crop steering settings:', e);
    }
  }, []);

  const value: CropSteeringContextType = {
    settings,
    updateSettings,
    currentStage: settings.currentStage,
    setCurrentStage,
    daysIntoGrow,
    daysVeg,
    daysFlower,
    daysIntoStage,
    daysRemainingInStage,
    conditions,
    updateConditions,
    currentVPD,
    currentPhase,
    environmentStatus,
    recommendations,
    getTargetVPD,
    getTargetTemp,
    getTargetHumidity,
    getTargetVWC,
    triggerIrrigation,
    recordIrrigation,
    saveSettings,
    loadSettings
  };

  return (
    <CropSteeringContext.Provider value={value}>
      {children}
    </CropSteeringContext.Provider>
  );
};

export default CropSteeringContext;
