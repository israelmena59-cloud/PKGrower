/**
 * Athena Nutrients Data
 * Extracted from Spanish Handbook - Metric DIGITAL V16
 * Source: Official Athena Ag nutrient program
 */

// ============================
// ENVIRONMENT TARGETS BY PHASE
// ============================
export interface PhaseEnvironment {
  phase: string;
  tempMin: number; // °C
  tempMax: number;
  rhMin: number;   // %
  rhMax: number;
  vpdMin: number;  // kPa
  vpdMax: number;
  ppfdMin: number; // μmol/m²/s
  ppfdMax: number;
}

export const ENVIRONMENT_BY_PHASE: PhaseEnvironment[] = [
  { phase: 'veg', tempMin: 22, tempMax: 28, rhMin: 58, rhMax: 75, vpdMin: 0.8, vpdMax: 1.0, ppfdMin: 300, ppfdMax: 600 },
  { phase: 'stretch', tempMin: 26, tempMax: 28, rhMin: 60, rhMax: 72, vpdMin: 1.0, vpdMax: 1.2, ppfdMin: 600, ppfdMax: 1000 },
  { phase: 'bulk', tempMin: 24, tempMax: 27, rhMin: 60, rhMax: 70, vpdMin: 1.0, vpdMax: 1.2, ppfdMin: 850, ppfdMax: 1200 },
  { phase: 'finish', tempMin: 18, tempMax: 22, rhMin: 50, rhMax: 60, vpdMin: 1.2, vpdMax: 1.4, ppfdMin: 600, ppfdMax: 900 },
];

// ============================
// EC SUBSTRATE & DRYBACK BY STAGE
// ============================
export interface StageIrrigation {
  stage: string;
  weeksRange: string;
  ecSubstrateMin: number;
  ecSubstrateMax: number;
  drybackMin: number;  // %
  drybackMax: number;
  strategy: 'vegetative' | 'generative';
}

export const IRRIGATION_BY_STAGE: StageIrrigation[] = [
  { stage: 'veg', weeksRange: '2-4', ecSubstrateMin: 3, ecSubstrateMax: 5, drybackMin: 25, drybackMax: 50, strategy: 'vegetative' },
  { stage: 'stretch', weeksRange: '1-4 (flower)', ecSubstrateMin: 4, ecSubstrateMax: 10, drybackMin: 40, drybackMax: 50, strategy: 'generative' },
  { stage: 'bulk', weeksRange: '5-7 (flower)', ecSubstrateMin: 3.5, ecSubstrateMax: 6, drybackMin: 30, drybackMax: 40, strategy: 'vegetative' },
  { stage: 'finish', weeksRange: '8-9 (flower)', ecSubstrateMin: 3, ecSubstrateMax: 4, drybackMin: 40, drybackMax: 50, strategy: 'vegetative' },
];

// ============================
// PRO LINE DOSING TABLE (mL per Liter at 226g/L concentrate)
// ============================
export interface DosingRow {
  targetEC: number;
  proGrowBloom: number; // mL/L
  proCore: number;      // mL/L
}

export const PRO_LINE_DOSING: DosingRow[] = [
  { targetEC: 0.5, proGrowBloom: 1.2, proCore: 0.7 },
  { targetEC: 1.0, proGrowBloom: 2.7, proCore: 1.6 },
  { targetEC: 1.5, proGrowBloom: 4.2, proCore: 2.5 },
  { targetEC: 2.0, proGrowBloom: 5.7, proCore: 3.4 },
  { targetEC: 2.5, proGrowBloom: 7.3, proCore: 4.4 },
  { targetEC: 3.0, proGrowBloom: 9.0, proCore: 5.4 },
  { targetEC: 3.5, proGrowBloom: 10.7, proCore: 6.4 },
  { targetEC: 4.0, proGrowBloom: 12.4, proCore: 7.5 },
  { targetEC: 4.5, proGrowBloom: 14.3, proCore: 8.6 },
  { targetEC: 5.0, proGrowBloom: 16.1, proCore: 9.7 },
  { targetEC: 5.5, proGrowBloom: 18.1, proCore: 10.8 },
  { targetEC: 6.0, proGrowBloom: 20.1, proCore: 12.0 },
];

// ============================
// IRRIGATION PHASES (P0-P3)
// ============================
export const IRRIGATION_PHASES = {
  P0: {
    name: 'Pre-Irrigación',
    timing: 'Antes de encender luces',
    description: 'Rehidratación nocturna opcional',
  },
  P1: {
    name: 'Primer Disparo',
    timing: '1-2 horas después de encender luces',
    description: 'Primer riego del día, establece VWC% máximo objetivo',
  },
  P2: {
    name: 'Riegos de Mantenimiento',
    timing: 'Durante el día',
    description: 'Mantiene VWC% objetivo, puede producir escorrentía',
  },
  P3: {
    name: 'Fase de Secado',
    timing: '2-4 horas antes de apagar luces → apagado',
    description: 'Permite dryback nocturno, sin riegos',
  },
};

// ============================
// VWC TARGETS
// ============================
export const VWC_TARGETS = {
  vegetative: {
    maxVWC: '8-16% above field capacity',
    runoffPercent: '8-16%',
    ecManagement: 'Increase runoff to decrease substrate EC',
  },
  generative: {
    maxVWC: 'Equal to field capacity',
    runoffPercent: '1-7%',
    ecManagement: 'Limit runoff to increase substrate EC',
  },
};

// ============================
// DRYBACK TARGETS
// ============================
export const DRYBACK_TARGETS = {
  vegetative: {
    range: '30-40%',
    effect: 'Less stress, taller plants, bud fattening',
  },
  generative: {
    range: '40-50%',
    effect: 'More stress, compact plants, faster flower site formation',
  },
};

// ============================
// SHOT VOLUMES BY POT SIZE
// ============================
export interface PotShotVolume {
  potSize: string;
  onePercentVolume: string;
  vegRunoff: string;
  genRunoff: string;
}

export const SHOT_VOLUMES: PotShotVolume[] = [
  { potSize: '4L pot', onePercentVolume: '40 mL', vegRunoff: '320-640 mL', genRunoff: '40-280 mL' },
  { potSize: '7L pot', onePercentVolume: '70 mL', vegRunoff: '560-1120 mL', genRunoff: '70-490 mL' },
  { potSize: '10L pot', onePercentVolume: '100 mL', vegRunoff: '800-1600 mL', genRunoff: '100-700 mL' },
  { potSize: '10cm Rockwool (Delta 6.5)', onePercentVolume: '6.5 mL', vegRunoff: '56-112 mL', genRunoff: '7-46 mL' },
  { potSize: '10cm Rockwool (Delta 10)', onePercentVolume: '10 mL', vegRunoff: '80-160 mL', genRunoff: '10-70 mL' },
  { potSize: '15cm Rockwool (Hugo)', onePercentVolume: '35 mL', vegRunoff: '280-560 mL', genRunoff: '35-245 mL' },
];

// ============================
// HELPER FUNCTIONS
// ============================

/**
 * Calculate Pro Line dosing for a target EC
 */
export function calculateDosing(targetEC: number): { proGrowBloom: number; proCore: number } | null {
  // Find closest match or interpolate
  const lower = PRO_LINE_DOSING.filter(d => d.targetEC <= targetEC).pop();
  const upper = PRO_LINE_DOSING.find(d => d.targetEC >= targetEC);

  if (!lower && !upper) return null;
  if (!lower) return { proGrowBloom: upper!.proGrowBloom, proCore: upper!.proCore };
  if (!upper) return { proGrowBloom: lower.proGrowBloom, proCore: lower.proCore };
  if (lower.targetEC === upper.targetEC) return { proGrowBloom: lower.proGrowBloom, proCore: lower.proCore };

  // Linear interpolation
  const ratio = (targetEC - lower.targetEC) / (upper.targetEC - lower.targetEC);
  return {
    proGrowBloom: parseFloat((lower.proGrowBloom + ratio * (upper.proGrowBloom - lower.proGrowBloom)).toFixed(1)),
    proCore: parseFloat((lower.proCore + ratio * (upper.proCore - lower.proCore)).toFixed(1)),
  };
}

/**
 * Get recommended environment for a growth phase
 */
export function getPhaseEnvironment(phase: string): PhaseEnvironment | undefined {
  return ENVIRONMENT_BY_PHASE.find(p => p.phase === phase);
}

/**
 * Get irrigation recommendations for a stage
 */
export function getStageIrrigation(stage: string): StageIrrigation | undefined {
  return IRRIGATION_BY_STAGE.find(s => s.stage === stage);
}

/**
 * Check if current conditions match target for phase
 */
export function checkEnvironmentStatus(
  phase: string,
  currentTemp: number,
  currentRH: number,
  currentVPD: number
): { tempOk: boolean; rhOk: boolean; vpdOk: boolean; allOk: boolean } {
  const target = getPhaseEnvironment(phase);
  if (!target) return { tempOk: true, rhOk: true, vpdOk: true, allOk: true };

  const tempOk = currentTemp >= target.tempMin && currentTemp <= target.tempMax;
  const rhOk = currentRH >= target.rhMin && currentRH <= target.rhMax;
  const vpdOk = currentVPD >= target.vpdMin && currentVPD <= target.vpdMax;

  return { tempOk, rhOk, vpdOk, allOk: tempOk && rhOk && vpdOk };
}
