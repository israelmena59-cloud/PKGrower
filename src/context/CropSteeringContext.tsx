/**
 * Crop Steering Context
 * Global state management for crop steering functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  GrowthStageId,
  GROWTH_STAGES,
  getStage,
  calculateDaysIntoGrow,
  determineStageFromDays
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

// ==================== TYPES ====================

export interface CropSteeringSettings {
  enabled: boolean;
  growStartDate: string | null; // ISO date string
  currentStage: GrowthStageId;
  autoStageProgression: boolean;
  lightsOnHour: number;
  lightsOffHour: number;
  potSizeLiters: number;
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
  daysIntoGrow: number;
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
  currentStage: 'veg_early',
  autoStageProgression: true,
  lightsOnHour: 6,
  lightsOffHour: 0, // Midnight for 18/6
  potSizeLiters: 3.8, // 1 gallon
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
  const [settings, setSettings] = useState<CropSteeringSettings>(defaultSettings);
  const [conditions, setConditions] = useState<CurrentConditions>(defaultConditions);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cropSteeringSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading crop steering settings:', e);
      }
    }
  }, []);

  // Auto-update stage based on days
  useEffect(() => {
    if (settings.autoStageProgression && settings.growStartDate) {
      const days = calculateDaysIntoGrow(new Date(settings.growStartDate));
      const suggestedStage = determineStageFromDays(days);

      if (suggestedStage !== settings.currentStage) {
        setSettings(prev => ({ ...prev, currentStage: suggestedStage }));
      }
    }
  }, [settings.growStartDate, settings.autoStageProgression]);

  // Calculate derived values
  const daysIntoGrow = settings.growStartDate
    ? calculateDaysIntoGrow(new Date(settings.growStartDate))
    : 0;

  const stage = getStage(settings.currentStage);

  // Calculate days into current stage
  const daysIntoStage = (() => {
    if (!settings.growStartDate) return 0;

    let accumulated = 0;
    for (const s of Object.values(GROWTH_STAGES)) {
      if (s.id === settings.currentStage) {
        return Math.max(0, daysIntoGrow - accumulated);
      }
      accumulated += s.durationDays;
    }
    return 0;
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
      localStorage.setItem('cropSteeringSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

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
      // Save to backend
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropSteering: settings })
      });

      if (!response.ok) throw new Error('Failed to save settings');

      localStorage.setItem('cropSteeringSettings', JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving crop steering settings:', e);
      throw e;
    }
  }, [settings]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
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
