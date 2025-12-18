/**
 * Crop Steering Calculations
 * Advanced calculations for VPD, dryback, DLI, and irrigation timing
 */

import { GrowthStageId, GROWTH_STAGES } from '../config/cropSteeringConfig';

// ==================== VPD CALCULATIONS ====================

/**
 * Calculate Saturation Vapor Pressure (SVP) using Tetens equation
 * @param tempC Temperature in Celsius
 * @returns SVP in kPa
 */
export const calculateSVP = (tempC: number): number => {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
};

/**
 * Calculate VPD using air temperature and humidity
 * @param airTempC Air temperature in Celsius
 * @param humidityPercent Relative humidity percentage
 * @returns VPD in kPa
 */
export const calculateVPD = (airTempC: number, humidityPercent: number): number => {
  if (!airTempC || !humidityPercent || humidityPercent <= 0) return 0;

  const svp = calculateSVP(airTempC);
  const actualVP = svp * (humidityPercent / 100);
  const vpd = svp - actualVP;

  return Math.round(vpd * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate VPD using leaf temperature (more accurate)
 * Leaf temperature is typically 1-3°C below air temperature
 * @param airTempC Air temperature in Celsius
 * @param humidityPercent Relative humidity percentage
 * @param leafTempOffset Difference between leaf and air temp (default -2°C)
 * @returns VPD in kPa
 */
export const calculateVPDWithLeafTemp = (
  airTempC: number,
  humidityPercent: number,
  leafTempOffset: number = -2
): number => {
  if (!airTempC || !humidityPercent || humidityPercent <= 0) return 0;

  const leafTempC = airTempC + leafTempOffset;
  const svpLeaf = calculateSVP(leafTempC);
  const svpAir = calculateSVP(airTempC);
  const actualVP = svpAir * (humidityPercent / 100);
  const vpd = svpLeaf - actualVP;

  return Math.round(vpd * 100) / 100;
};

/**
 * Calculate required humidity to achieve target VPD
 * @param airTempC Air temperature in Celsius
 * @param targetVPD Target VPD in kPa
 * @returns Required humidity percentage
 */
export const calculateRequiredHumidity = (airTempC: number, targetVPD: number): number => {
  const svp = calculateSVP(airTempC);
  const requiredVP = svp - targetVPD;
  const humidity = (requiredVP / svp) * 100;

  return Math.round(Math.min(100, Math.max(0, humidity)));
};

/**
 * Calculate required temperature to achieve target VPD
 * @param humidityPercent Current humidity percentage
 * @param targetVPD Target VPD in kPa
 * @returns Required temperature in Celsius (approximate)
 */
export const calculateRequiredTemperature = (humidityPercent: number, targetVPD: number): number => {
  // Iterative approximation
  for (let temp = 15; temp <= 35; temp += 0.5) {
    const vpd = calculateVPD(temp, humidityPercent);
    if (Math.abs(vpd - targetVPD) < 0.05) {
      return temp;
    }
  }
  return 25; // Default fallback
};

// ==================== SUBSTRATE CALCULATIONS ====================

/**
 * Calculate dryback percentage from last irrigation
 * @param currentVWC Current volumetric water content
 * @param peakVWC VWC immediately after last irrigation
 * @returns Dryback percentage
 */
export const calculateDryback = (currentVWC: number, peakVWC: number): number => {
  if (peakVWC <= 0) return 0;
  const dryback = ((peakVWC - currentVWC) / peakVWC) * 100;
  return Math.round(Math.max(0, dryback) * 10) / 10;
};

/**
 * Calculate dryback rate (% per hour)
 * @param vwcHistory Array of {timestamp, vwc} objects
 * @param hoursToAnalyze How many hours to look back
 * @returns Dryback rate in % per hour
 */
export const calculateDrybackRate = (
  vwcHistory: Array<{ timestamp: Date; vwc: number }>,
  hoursToAnalyze: number = 4
): number => {
  if (vwcHistory.length < 2) return 0;

  const now = new Date();
  const cutoff = new Date(now.getTime() - hoursToAnalyze * 60 * 60 * 1000);

  const recentData = vwcHistory.filter(d => d.timestamp >= cutoff);
  if (recentData.length < 2) return 0;

  const first = recentData[0];
  const last = recentData[recentData.length - 1];
  const hoursDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60);

  if (hoursDiff <= 0) return 0;

  const vwcDiff = first.vwc - last.vwc; // Positive if drying
  return Math.round((vwcDiff / hoursDiff) * 10) / 10;
};

/**
 * Estimate time until next irrigation needed
 * @param currentVWC Current VWC
 * @param targetVWC Target VWC to trigger irrigation
 * @param drybackRatePerHour Dryback rate in % per hour
 * @returns Minutes until irrigation needed
 */
export const estimateTimeToIrrigation = (
  currentVWC: number,
  targetVWC: number,
  drybackRatePerHour: number
): number => {
  if (drybackRatePerHour <= 0) return Infinity;
  if (currentVWC <= targetVWC) return 0;

  const vwcToDrop = currentVWC - targetVWC;
  const hoursRemaining = vwcToDrop / drybackRatePerHour;

  return Math.round(hoursRemaining * 60);
};

/**
 * Calculate irrigation shot size based on pot size and target VWC increase
 * @param potSizeLiters Pot size in liters
 * @param currentVWC Current VWC percentage
 * @param targetVWC Target VWC after irrigation
 * @returns Shot size in milliliters
 */
export const calculateShotSize = (
  potSizeLiters: number,
  currentVWC: number,
  targetVWC: number
): number => {
  const vwcIncrease = (targetVWC - currentVWC) / 100;
  const waterNeeded = potSizeLiters * 1000 * vwcIncrease; // Convert to mL
  return Math.round(waterNeeded);
};

// ==================== LIGHT CALCULATIONS ====================

/**
 * Calculate Daily Light Integral (DLI)
 * @param ppfd Photosynthetic Photon Flux Density (µmol/m²/s)
 * @param hoursOn Hours of light per day
 * @returns DLI in mol/m²/day
 */
export const calculateDLI = (ppfd: number, hoursOn: number): number => {
  const dli = (ppfd * hoursOn * 3600) / 1000000;
  return Math.round(dli * 10) / 10;
};

/**
 * Calculate required PPFD to achieve target DLI
 * @param targetDLI Target DLI in mol/m²/day
 * @param hoursOn Hours of light per day
 * @returns Required PPFD in µmol/m²/s
 */
export const calculateRequiredPPFD = (targetDLI: number, hoursOn: number): number => {
  if (hoursOn <= 0) return 0;
  const ppfd = (targetDLI * 1000000) / (hoursOn * 3600);
  return Math.round(ppfd);
};

// ==================== PHASE OF DAY CALCULATIONS ====================

export type IrrigationPhaseId = 'P1' | 'P2' | 'P3';

/**
 * Irrigation phases:
 * P1 - Saturation: Initial irrigation events to saturate substrate
 * P2 - Maintenance: Events to maintain VWC% at target level
 * P3 - Dryback: Drying period from last P2 until first P1 of next day
 */

/**
 * Determine current irrigation phase based on time and light schedule
 * @param currentTime Current time
 * @param lightsOnTime Lights on time (hours, 0-23)
 * @param lightsOffTime Lights off time (hours, 0-23)
 * @param stageId Current growth stage
 * @returns Current irrigation phase
 */
export const getCurrentIrrigationPhase = (
  currentTime: Date,
  lightsOnTime: number,
  lightsOffTime: number,
  stageId: GrowthStageId
): IrrigationPhaseId => {
  const stage = GROWTH_STAGES[stageId];
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinutes;

  const lightsOnMinutes = lightsOnTime * 60;
  const lightsOffMinutes = lightsOffTime * 60;

  // Handle overnight lighting schedules
  const isLightsOn = lightsOnMinutes < lightsOffMinutes
    ? currentTotalMinutes >= lightsOnMinutes && currentTotalMinutes < lightsOffMinutes
    : currentTotalMinutes >= lightsOnMinutes || currentTotalMinutes < lightsOffMinutes;

  // P3 - Dryback: Night period or last hours before lights off
  if (!isLightsOn) {
    return 'P3';
  }

  // Calculate minutes since lights on
  let minutesSinceLightsOn = currentTotalMinutes - lightsOnMinutes;
  if (minutesSinceLightsOn < 0) {
    minutesSinceLightsOn += 24 * 60;
  }

  // Calculate minutes until lights off
  let minutesUntilLightsOff = lightsOffMinutes - currentTotalMinutes;
  if (minutesUntilLightsOff < 0) {
    minutesUntilLightsOff += 24 * 60;
  }

  // P1 - Saturation: First ~2 hours after lights on
  if (minutesSinceLightsOn < stage.irrigation.p1Delay) {
    return 'P1';
  }

  // P3 - Dryback: Last hours before lights off (p4Before now means dryback start)
  if (minutesUntilLightsOff <= stage.irrigation.p4Before) {
    return 'P3';
  }

  // P2 - Maintenance: During the middle of day
  return 'P2';
};

/**
 * Get recommended irrigation frequency for current phase
 * @param phase Current irrigation phase
 * @param stageId Current growth stage
 * @returns Minutes between irrigations
 */
export const getIrrigationFrequency = (
  phase: IrrigationPhaseId,
  stageId: GrowthStageId
): number => {
  const stage = GROWTH_STAGES[stageId];

  switch (phase) {
    case 'P1':
      return 30; // Frequent saturation shots
    case 'P2':
      return stage.irrigation.p2Frequency; // Maintenance frequency
    case 'P3':
      return Infinity; // No irrigation during dryback
    default:
      return 60;
  }
};

// ==================== STATUS EVALUATION ====================

export interface EnvironmentStatus {
  vpd: 'optimal' | 'warning' | 'danger';
  temperature: 'optimal' | 'warning' | 'danger';
  humidity: 'optimal' | 'warning' | 'danger';
  vwc: 'optimal' | 'warning' | 'danger';
  overall: 'optimal' | 'warning' | 'danger';
}

/**
 * Evaluate current environment status against stage parameters
 */
export const evaluateEnvironmentStatus = (
  stageId: GrowthStageId,
  vpd: number,
  temperature: number,
  humidity: number,
  vwc: number
): EnvironmentStatus => {
  const stage = GROWTH_STAGES[stageId];

  const evaluateMetric = (
    value: number,
    min: number,
    max: number
  ): 'optimal' | 'warning' | 'danger' => {
    const margin = (max - min) * 0.2;
    if (value >= min && value <= max) return 'optimal';
    if (value >= min - margin && value <= max + margin) return 'warning';
    return 'danger';
  };

  const vpdStatus = evaluateMetric(vpd, stage.vpd.min, stage.vpd.max);
  const tempStatus = evaluateMetric(temperature, stage.temperature.dayMin, stage.temperature.dayMax);
  const humStatus = evaluateMetric(humidity, stage.humidity.dayMin, stage.humidity.dayMax);
  const vwcStatus = evaluateMetric(vwc, stage.substrate.vwcMin, stage.substrate.vwcMax);

  // Overall is the worst status
  const statuses = [vpdStatus, tempStatus, humStatus, vwcStatus];
  let overall: 'optimal' | 'warning' | 'danger' = 'optimal';
  if (statuses.includes('danger')) overall = 'danger';
  else if (statuses.includes('warning')) overall = 'warning';

  return {
    vpd: vpdStatus,
    temperature: tempStatus,
    humidity: humStatus,
    vwc: vwcStatus,
    overall
  };
};

/**
 * Generate recommendations based on current conditions
 */
export const generateRecommendations = (
  stageId: GrowthStageId,
  vpd: number,
  temperature: number,
  humidity: number
): string[] => {
  const stage = GROWTH_STAGES[stageId];
  const recommendations: string[] = [];

  // VPD recommendations
  if (vpd < stage.vpd.min) {
    const targetHumidity = calculateRequiredHumidity(temperature, stage.vpd.target);
    recommendations.push(`Reducir humedad a ${targetHumidity}% para alcanzar VPD óptimo`);
  } else if (vpd > stage.vpd.max) {
    const targetHumidity = calculateRequiredHumidity(temperature, stage.vpd.target);
    recommendations.push(`Aumentar humedad a ${targetHumidity}% para reducir VPD`);
  }

  // Temperature recommendations
  if (temperature < stage.temperature.dayMin) {
    recommendations.push(`Subir temperatura a ${stage.temperature.dayMin}°C mínimo`);
  } else if (temperature > stage.temperature.dayMax) {
    recommendations.push(`Bajar temperatura a ${stage.temperature.dayMax}°C máximo`);
  }

  // Humidity recommendations
  if (humidity < stage.humidity.dayMin) {
    recommendations.push(`Aumentar humedad a ${stage.humidity.dayMin}% mínimo`);
  } else if (humidity > stage.humidity.dayMax) {
    recommendations.push(`Reducir humedad a ${stage.humidity.dayMax}% máximo`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Condiciones óptimas para la etapa actual');
  }

  return recommendations;
};
