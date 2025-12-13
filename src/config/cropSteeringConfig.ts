/**
 * Crop Steering Configuration
 * Based on CCI Crop Steering Super System and Floraflex methodologies
 */

// ==================== TYPES ====================

export type GrowthStageId =
  | 'clone'
  | 'veg_early'
  | 'veg_late'
  | 'flower_transition'
  | 'flower_early'
  | 'flower_mid'
  | 'flower_late'
  | 'flush';

export interface VPDRange {
  min: number;
  max: number;
  target: number;
}

export interface TemperatureRange {
  dayMin: number;
  dayMax: number;
  nightMin: number;
  nightMax: number;
  leafOffset: number; // Typically -2 to -3°C
}

export interface HumidityRange {
  dayMin: number;
  dayMax: number;
  nightMin: number;
  nightMax: number;
}

export interface SubstrateParams {
  vwcMin: number;      // Minimum VWC before irrigation
  vwcTarget: number;   // Target VWC to maintain
  vwcMax: number;      // Maximum VWC after irrigation
  drybackMin: number;  // Minimum dryback % (vegetative strategy)
  drybackMax: number;  // Maximum dryback % (generative strategy)
}

export interface ECParams {
  inputMin: number;
  inputMax: number;
  substrateTarget: number;
  drainageMax: number;
}

export interface LightParams {
  ppfdMin: number;
  ppfdMax: number;
  dliTarget: number;
  hoursOn: number;
}

export interface IrrigationPhases {
  p1Delay: number;     // Minutes after lights on for first irrigation
  p2Frequency: number; // Minutes between irrigations in P2 (vegetative)
  p3Frequency: number; // Minutes between irrigations in P3 (generative)
  p4Before: number;    // Minutes before lights off for last irrigation
}

export interface GrowthStage {
  id: GrowthStageId;
  name: string;
  nameEs: string;
  description: string;
  durationDays: number;
  vpd: VPDRange;
  temperature: TemperatureRange;
  humidity: HumidityRange;
  substrate: SubstrateParams;
  ec: ECParams;
  light: LightParams;
  irrigation: IrrigationPhases;
  color: string; // For UI visualization
}

// ==================== GROWTH STAGES ====================

export const GROWTH_STAGES: Record<GrowthStageId, GrowthStage> = {
  clone: {
    id: 'clone',
    name: 'Clones & Seedlings',
    nameEs: 'Clones y Plántulas',
    description: 'High humidity, low VPD for root development',
    durationDays: 14,
    vpd: { min: 0.4, max: 0.8, target: 0.6 },
    temperature: { dayMin: 24, dayMax: 26, nightMin: 22, nightMax: 24, leafOffset: -1 },
    humidity: { dayMin: 70, dayMax: 80, nightMin: 75, nightMax: 85 },
    substrate: { vwcMin: 55, vwcTarget: 65, vwcMax: 75, drybackMin: 5, drybackMax: 15 },
    ec: { inputMin: 0.8, inputMax: 1.2, substrateTarget: 1.2, drainageMax: 1.5 },
    light: { ppfdMin: 100, ppfdMax: 200, dliTarget: 8, hoursOn: 18 },
    irrigation: { p1Delay: 30, p2Frequency: 60, p3Frequency: 90, p4Before: 120 },
    color: '#4ade80' // Green
  },

  veg_early: {
    id: 'veg_early',
    name: 'Early Vegetative',
    nameEs: 'Vegetativo Temprano',
    description: 'Building vegetative mass, frequent irrigation',
    durationDays: 21,
    vpd: { min: 0.6, max: 0.9, target: 0.75 },
    temperature: { dayMin: 24, dayMax: 28, nightMin: 20, nightMax: 24, leafOffset: -2 },
    humidity: { dayMin: 65, dayMax: 75, nightMin: 70, nightMax: 80 },
    substrate: { vwcMin: 50, vwcTarget: 60, vwcMax: 70, drybackMin: 10, drybackMax: 20 },
    ec: { inputMin: 1.2, inputMax: 1.6, substrateTarget: 1.8, drainageMax: 2.0 },
    light: { ppfdMin: 300, ppfdMax: 500, dliTarget: 25, hoursOn: 18 },
    irrigation: { p1Delay: 45, p2Frequency: 45, p3Frequency: 60, p4Before: 150 },
    color: '#22c55e' // Darker green
  },

  veg_late: {
    id: 'veg_late',
    name: 'Late Vegetative',
    nameEs: 'Vegetativo Tardío',
    description: 'Preparing for flower transition, moderate dryback',
    durationDays: 14,
    vpd: { min: 0.8, max: 1.1, target: 0.95 },
    temperature: { dayMin: 24, dayMax: 28, nightMin: 20, nightMax: 24, leafOffset: -2 },
    humidity: { dayMin: 60, dayMax: 70, nightMin: 65, nightMax: 75 },
    substrate: { vwcMin: 45, vwcTarget: 55, vwcMax: 65, drybackMin: 15, drybackMax: 25 },
    ec: { inputMin: 1.6, inputMax: 2.0, substrateTarget: 2.2, drainageMax: 2.5 },
    light: { ppfdMin: 400, ppfdMax: 600, dliTarget: 35, hoursOn: 18 },
    irrigation: { p1Delay: 60, p2Frequency: 60, p3Frequency: 90, p4Before: 180 },
    color: '#84cc16' // Lime
  },

  flower_transition: {
    id: 'flower_transition',
    name: 'Flower Transition',
    nameEs: 'Transición a Floración',
    description: 'Stretch period, increasing generative steering',
    durationDays: 14,
    vpd: { min: 0.9, max: 1.2, target: 1.05 },
    temperature: { dayMin: 24, dayMax: 28, nightMin: 18, nightMax: 22, leafOffset: -2 },
    humidity: { dayMin: 55, dayMax: 65, nightMin: 60, nightMax: 70 },
    substrate: { vwcMin: 40, vwcTarget: 50, vwcMax: 60, drybackMin: 20, drybackMax: 30 },
    ec: { inputMin: 2.0, inputMax: 2.4, substrateTarget: 2.6, drainageMax: 3.0 },
    light: { ppfdMin: 500, ppfdMax: 800, dliTarget: 40, hoursOn: 12 },
    irrigation: { p1Delay: 90, p2Frequency: 90, p3Frequency: 120, p4Before: 240 },
    color: '#eab308' // Yellow
  },

  flower_early: {
    id: 'flower_early',
    name: 'Early Flower',
    nameEs: 'Floración Temprana',
    description: 'Bud development, strong generative steering',
    durationDays: 21,
    vpd: { min: 0.9, max: 1.3, target: 1.1 },
    temperature: { dayMin: 24, dayMax: 28, nightMin: 18, nightMax: 22, leafOffset: -2 },
    humidity: { dayMin: 50, dayMax: 65, nightMin: 55, nightMax: 70 },
    substrate: { vwcMin: 35, vwcTarget: 45, vwcMax: 55, drybackMin: 25, drybackMax: 35 },
    ec: { inputMin: 2.2, inputMax: 2.6, substrateTarget: 2.8, drainageMax: 3.5 },
    light: { ppfdMin: 600, ppfdMax: 900, dliTarget: 45, hoursOn: 12 },
    irrigation: { p1Delay: 90, p2Frequency: 90, p3Frequency: 120, p4Before: 240 },
    color: '#f97316' // Orange
  },

  flower_mid: {
    id: 'flower_mid',
    name: 'Mid Flower',
    nameEs: 'Floración Media',
    description: 'Peak production, maximum generative steering',
    durationDays: 21,
    vpd: { min: 1.0, max: 1.5, target: 1.25 },
    temperature: { dayMin: 22, dayMax: 26, nightMin: 18, nightMax: 22, leafOffset: -2 },
    humidity: { dayMin: 45, dayMax: 60, nightMin: 50, nightMax: 65 },
    substrate: { vwcMin: 30, vwcTarget: 40, vwcMax: 50, drybackMin: 30, drybackMax: 40 },
    ec: { inputMin: 2.4, inputMax: 2.8, substrateTarget: 3.2, drainageMax: 4.0 },
    light: { ppfdMin: 700, ppfdMax: 1000, dliTarget: 50, hoursOn: 12 },
    irrigation: { p1Delay: 120, p2Frequency: 120, p3Frequency: 150, p4Before: 300 },
    color: '#ef4444' // Red
  },

  flower_late: {
    id: 'flower_late',
    name: 'Late Flower',
    nameEs: 'Floración Tardía',
    description: 'Ripening phase, reduced irrigation',
    durationDays: 21,
    vpd: { min: 1.2, max: 1.7, target: 1.45 },
    temperature: { dayMin: 20, dayMax: 24, nightMin: 16, nightMax: 20, leafOffset: -2 },
    humidity: { dayMin: 35, dayMax: 50, nightMin: 40, nightMax: 55 },
    substrate: { vwcMin: 25, vwcTarget: 35, vwcMax: 45, drybackMin: 35, drybackMax: 45 },
    ec: { inputMin: 2.0, inputMax: 2.4, substrateTarget: 2.8, drainageMax: 3.5 },
    light: { ppfdMin: 700, ppfdMax: 1000, dliTarget: 48, hoursOn: 12 },
    irrigation: { p1Delay: 150, p2Frequency: 150, p3Frequency: 180, p4Before: 360 },
    color: '#a855f7' // Purple
  },

  flush: {
    id: 'flush',
    name: 'Flush / Ripening',
    nameEs: 'Maduración / Lavado',
    description: 'Final flush, minimum nutrients, stress colors',
    durationDays: 14,
    vpd: { min: 1.4, max: 1.8, target: 1.6 },
    temperature: { dayMin: 18, dayMax: 24, nightMin: 14, nightMax: 18, leafOffset: -2 },
    humidity: { dayMin: 30, dayMax: 45, nightMin: 35, nightMax: 50 },
    substrate: { vwcMin: 20, vwcTarget: 30, vwcMax: 40, drybackMin: 40, drybackMax: 50 },
    ec: { inputMin: 0.2, inputMax: 0.5, substrateTarget: 0.8, drainageMax: 1.0 },
    light: { ppfdMin: 600, ppfdMax: 900, dliTarget: 40, hoursOn: 12 },
    irrigation: { p1Delay: 180, p2Frequency: 180, p3Frequency: 240, p4Before: 420 },
    color: '#6366f1' // Indigo
  }
};

// ==================== ALERT THRESHOLDS ====================

export interface AlertThreshold {
  metric: string;
  condition: 'below' | 'above' | 'outside';
  value: number | 'stage'; // 'stage' means use current stage's value
  severity: 'info' | 'warning' | 'critical';
  messageEs: string;
  messageEn: string;
  action?: string;
}

export const ALERT_THRESHOLDS: AlertThreshold[] = [
  // VPD Alerts
  {
    metric: 'vpd',
    condition: 'below',
    value: 0.4,
    severity: 'critical',
    messageEs: 'VPD crítico - Riesgo de moho y enfermedades',
    messageEn: 'Critical VPD - Mold and disease risk',
    action: 'Reducir humedad, aumentar ventilación'
  },
  {
    metric: 'vpd',
    condition: 'above',
    value: 1.8,
    severity: 'critical',
    messageEs: 'VPD muy alto - Estrés hídrico severo',
    messageEn: 'VPD too high - Severe water stress',
    action: 'Aumentar humedad, reducir temperatura'
  },
  {
    metric: 'vpd',
    condition: 'outside',
    value: 'stage',
    severity: 'warning',
    messageEs: 'VPD fuera del rango óptimo para esta etapa',
    messageEn: 'VPD outside optimal range for this stage'
  },

  // Temperature Alerts
  {
    metric: 'temperature',
    condition: 'above',
    value: 32,
    severity: 'critical',
    messageEs: 'Temperatura crítica - Plantas estresadas',
    messageEn: 'Critical temperature - Plants stressed',
    action: 'Activar enfriamiento, reducir intensidad de luz'
  },
  {
    metric: 'temperature',
    condition: 'below',
    value: 15,
    severity: 'critical',
    messageEs: 'Temperatura muy baja - Crecimiento detenido',
    messageEn: 'Temperature too low - Growth stopped',
    action: 'Activar calefacción'
  },

  // Substrate Alerts
  {
    metric: 'vwc',
    condition: 'below',
    value: 15,
    severity: 'critical',
    messageEs: 'Sustrato seco - Regar inmediatamente',
    messageEn: 'Substrate dry - Irrigate immediately',
    action: 'Iniciar riego de emergencia'
  },
  {
    metric: 'vwc',
    condition: 'above',
    value: 85,
    severity: 'warning',
    messageEs: 'Sustrato saturado - Riesgo de asfixia radicular',
    messageEn: 'Substrate saturated - Root suffocation risk',
    action: 'Detener riego, aumentar drenaje'
  },
  {
    metric: 'dryback',
    condition: 'above',
    value: 50,
    severity: 'warning',
    messageEs: 'Dryback excesivo - Considerar riego',
    messageEn: 'Excessive dryback - Consider irrigation'
  }
];

// ==================== IRRIGATION PHASES ====================

export interface IrrigationPhase {
  id: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  name: string;
  nameEs: string;
  description: string;
  color: string;
}

export const IRRIGATION_PHASES: IrrigationPhase[] = [
  {
    id: 'P1',
    name: 'First Shot',
    nameEs: 'Primer Riego',
    description: 'First irrigation after lights on, rehydrate substrate',
    color: '#22c55e'
  },
  {
    id: 'P2',
    name: 'Vegetative Phase',
    nameEs: 'Fase Vegetativa',
    description: 'Frequent irrigations, maintain high VWC',
    color: '#3b82f6'
  },
  {
    id: 'P3',
    name: 'Generative Phase',
    nameEs: 'Fase Generativa',
    description: 'Reduced frequency, allow dryback',
    color: '#f97316'
  },
  {
    id: 'P4',
    name: 'Last Shot',
    nameEs: 'Último Riego',
    description: 'Final irrigation before lights off',
    color: '#a855f7'
  },
  {
    id: 'P5',
    name: 'Night Period',
    nameEs: 'Período Nocturno',
    description: 'No irrigation, maximum dryback',
    color: '#6b7280'
  }
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get stage by ID with type safety
 */
export const getStage = (stageId: GrowthStageId): GrowthStage => {
  return GROWTH_STAGES[stageId];
};

/**
 * Get all stages as array for iteration
 */
export const getStagesArray = (): GrowthStage[] => {
  return Object.values(GROWTH_STAGES);
};

/**
 * Calculate days into current grow
 */
export const calculateDaysIntoGrow = (
  startDate: Date,
  currentDate: Date = new Date()
): number => {
  const diffTime = currentDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determine current stage based on days into grow
 */
export const determineStageFromDays = (daysIntoGrow: number): GrowthStageId => {
  let accumulatedDays = 0;

  for (const stage of getStagesArray()) {
    accumulatedDays += stage.durationDays;
    if (daysIntoGrow < accumulatedDays) {
      return stage.id;
    }
  }

  return 'flush'; // Default to final stage if beyond total
};

/**
 * Get ideal ranges for a specific metric and stage
 */
export const getIdealRange = (
  stageId: GrowthStageId,
  metric: 'vpd' | 'temperature' | 'humidity' | 'vwc'
): { min: number; max: number; target?: number } => {
  const stage = GROWTH_STAGES[stageId];

  switch (metric) {
    case 'vpd':
      return stage.vpd;
    case 'temperature':
      return { min: stage.temperature.dayMin, max: stage.temperature.dayMax };
    case 'humidity':
      return { min: stage.humidity.dayMin, max: stage.humidity.dayMax };
    case 'vwc':
      return {
        min: stage.substrate.vwcMin,
        max: stage.substrate.vwcMax,
        target: stage.substrate.vwcTarget
      };
    default:
      return { min: 0, max: 100 };
  }
};

/**
 * Check if value is within ideal range for stage
 */
export const isInIdealRange = (
  value: number,
  stageId: GrowthStageId,
  metric: 'vpd' | 'temperature' | 'humidity' | 'vwc'
): 'optimal' | 'warning' | 'danger' => {
  const range = getIdealRange(stageId, metric);
  const margin = (range.max - range.min) * 0.15; // 15% margin for warning

  if (value >= range.min && value <= range.max) {
    return 'optimal';
  } else if (value >= range.min - margin && value <= range.max + margin) {
    return 'warning';
  }
  return 'danger';
};

export default GROWTH_STAGES;
