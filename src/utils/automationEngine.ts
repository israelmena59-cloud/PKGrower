/**
 * Automation Engine
 * Rules-based automation for crop steering with device control
 */

import { GrowthStageId, GROWTH_STAGES } from '../config/cropSteeringConfig';
import {
  calculateVPD,
  evaluateEnvironmentStatus,
  IrrigationPhaseId,
  getCurrentIrrigationPhase
} from './cropSteeringCalculations';

// ==================== TYPES ====================

export type TriggerMetric = 'vpd' | 'temperature' | 'humidity' | 'vwc' | 'dryback' | 'time' | 'phase';
export type TriggerOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'outside' | 'inside';
export type ActionType = 'device_on' | 'device_off' | 'device_toggle' | 'irrigation_shot' | 'notification' | 'log';
export type RulePriority = 'low' | 'medium' | 'high' | 'critical';

export interface TriggerCondition {
  metric: TriggerMetric;
  operator: TriggerOperator;
  value: number | string | 'stage_min' | 'stage_max' | 'stage_target';
  duration?: number; // Condition must be true for X seconds before triggering
}

export interface RuleAction {
  type: ActionType;
  deviceId?: string;
  deviceType?: string;
  duration?: number; // Action duration in seconds (for temporary actions)
  message?: string;
  data?: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  enabled: boolean;
  priority: RulePriority;
  triggers: TriggerCondition[];
  triggerLogic: 'AND' | 'OR';
  actions: RuleAction[];
  cooldownMinutes: number;
  lastTriggered?: Date;
  stageSpecific?: GrowthStageId[]; // Only active in these stages
}

export interface EnvironmentReadings {
  temperature: number;
  humidity: number;
  vpd: number;
  vwc: number;
  dryback: number;
  timestamp: Date;
}

export interface AutomationState {
  enabled: boolean;
  rules: AutomationRule[];
  lastEvaluation: Date | null;
  activeActions: Map<string, Date>; // ruleId -> cooldown expires
  conditionTimers: Map<string, Date>; // ruleId -> condition started
}

// ==================== DEFAULT RULES ====================

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  // VPD Control Rules
  {
    id: 'vpd_high_humidifier',
    name: 'VPD High - Activate Humidifier',
    nameEs: 'VPD Alto - Activar Humidificador',
    description: 'When VPD exceeds stage maximum, turn on humidifier to reduce VPD',
    enabled: true,
    priority: 'high',
    triggers: [
      { metric: 'vpd', operator: '>', value: 'stage_max', duration: 60 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'device_on', deviceType: 'humidifier', duration: 300 },
      { type: 'notification', message: 'VPD alto - Humidificador activado' }
    ],
    cooldownMinutes: 10
  },
  {
    id: 'vpd_low_dehumidifier',
    name: 'VPD Low - Activate Dehumidifier',
    nameEs: 'VPD Bajo - Activar Deshumidificador',
    description: 'When VPD falls below stage minimum, turn on dehumidifier',
    enabled: true,
    priority: 'high',
    triggers: [
      { metric: 'vpd', operator: '<', value: 'stage_min', duration: 60 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'device_on', deviceType: 'dehumidifier', duration: 300 },
      { type: 'notification', message: 'VPD bajo - Deshumidificador activado' }
    ],
    cooldownMinutes: 10
  },

  // Temperature Control
  {
    id: 'temp_high_cooling',
    name: 'Temperature High - Activate Cooling',
    nameEs: 'Temperatura Alta - Activar Enfriamiento',
    description: 'When temperature exceeds maximum, activate cooling/extraction',
    enabled: true,
    priority: 'critical',
    triggers: [
      { metric: 'temperature', operator: '>', value: 30, duration: 30 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'device_on', deviceType: 'extractor', duration: 600 },
      { type: 'device_on', deviceType: 'ac', duration: 600 },
      { type: 'notification', message: '⚠️ Temperatura crítica - Enfriamiento activado' }
    ],
    cooldownMinutes: 15
  },
  {
    id: 'temp_low_heating',
    name: 'Temperature Low - Activate Heating',
    nameEs: 'Temperatura Baja - Activar Calefacción',
    description: 'When temperature falls below minimum, activate heating',
    enabled: true,
    priority: 'high',
    triggers: [
      { metric: 'temperature', operator: '<', value: 18, duration: 120 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'device_on', deviceType: 'heater', duration: 600 },
      { type: 'notification', message: 'Temperatura baja - Calefacción activada' }
    ],
    cooldownMinutes: 20
  },

  // Substrate/Irrigation Control
  {
    id: 'vwc_low_irrigate',
    name: 'VWC Low - Trigger Irrigation',
    nameEs: 'VWC Bajo - Activar Riego',
    description: 'When substrate VWC falls below target during day, trigger irrigation',
    enabled: true,
    priority: 'medium',
    triggers: [
      { metric: 'vwc', operator: '<', value: 'stage_min' },
      { metric: 'phase', operator: '!=', value: 'P5' } // Not during night
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'irrigation_shot' },
      { type: 'log', message: 'Auto-irrigation triggered due to low VWC' }
    ],
    cooldownMinutes: 30
  },
  {
    id: 'dryback_excessive',
    name: 'Excessive Dryback Warning',
    nameEs: 'Dryback Excesivo - Alerta',
    description: 'Alert when dryback exceeds safe limits',
    enabled: true,
    priority: 'medium',
    triggers: [
      { metric: 'dryback', operator: '>', value: 45, duration: 300 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'notification', message: '⚠️ Dryback excesivo - Considerar riego' }
    ],
    cooldownMinutes: 60
  },

  // Mold Prevention
  {
    id: 'mold_risk_alert',
    name: 'Mold Risk Alert',
    nameEs: 'Riesgo de Moho - Alerta',
    description: 'Critical alert when conditions favor mold growth',
    enabled: true,
    priority: 'critical',
    triggers: [
      { metric: 'vpd', operator: '<', value: 0.4, duration: 120 },
      { metric: 'humidity', operator: '>', value: 80 }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'device_on', deviceType: 'dehumidifier' },
      { type: 'device_on', deviceType: 'fan' },
      { type: 'notification', message: '🚨 RIESGO DE MOHO - VPD crítico, ventilación activada' }
    ],
    cooldownMinutes: 5
  },

  // Phase-based irrigation
  {
    id: 'p1_first_irrigation',
    name: 'P1 First Irrigation',
    nameEs: 'P1 Primer Riego',
    description: 'First irrigation shot when entering P1 phase',
    enabled: true,
    priority: 'medium',
    triggers: [
      { metric: 'phase', operator: '==', value: 'P1' }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'irrigation_shot' },
      { type: 'log', message: 'P1 first irrigation triggered' }
    ],
    cooldownMinutes: 720 // Once per day
  },
  {
    id: 'p4_last_irrigation',
    name: 'P4 Last Irrigation',
    nameEs: 'P4 Último Riego',
    description: 'Last irrigation shot when entering P4 phase',
    enabled: true,
    priority: 'medium',
    triggers: [
      { metric: 'phase', operator: '==', value: 'P4' }
    ],
    triggerLogic: 'AND',
    actions: [
      { type: 'irrigation_shot' },
      { type: 'log', message: 'P4 last irrigation triggered' }
    ],
    cooldownMinutes: 720 // Once per day
  }
];

// ==================== AUTOMATION ENGINE ====================

export class AutomationEngine {
  private state: AutomationState;
  private currentStage: GrowthStageId;
  private lightsOnHour: number;
  private lightsOffHour: number;
  private onAction: (action: RuleAction, rule: AutomationRule) => Promise<void>;

  constructor(
    onAction: (action: RuleAction, rule: AutomationRule) => Promise<void>,
    initialRules: AutomationRule[] = DEFAULT_AUTOMATION_RULES
  ) {
    this.state = {
      enabled: true,
      rules: initialRules,
      lastEvaluation: null,
      activeActions: new Map(),
      conditionTimers: new Map()
    };
    this.currentStage = 'veg_early';
    this.lightsOnHour = 6;
    this.lightsOffHour = 0;
    this.onAction = onAction;
  }

  /**
   * Update configuration
   */
  setConfig(config: {
    stage?: GrowthStageId;
    lightsOnHour?: number;
    lightsOffHour?: number;
  }) {
    if (config.stage) this.currentStage = config.stage;
    if (config.lightsOnHour !== undefined) this.lightsOnHour = config.lightsOnHour;
    if (config.lightsOffHour !== undefined) this.lightsOffHour = config.lightsOffHour;
  }

  /**
   * Enable/disable automation
   */
  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
  }

  /**
   * Add or update a rule
   */
  upsertRule(rule: AutomationRule) {
    const existingIndex = this.state.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.state.rules[existingIndex] = rule;
    } else {
      this.state.rules.push(rule);
    }
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string) {
    this.state.rules = this.state.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): AutomationRule[] {
    return [...this.state.rules];
  }

  /**
   * Evaluate a single trigger condition
   */
  private evaluateTrigger(
    trigger: TriggerCondition,
    readings: EnvironmentReadings,
    currentPhase: IrrigationPhaseId
  ): boolean {
    const stage = GROWTH_STAGES[this.currentStage];

    // Get the actual value to compare
    let actualValue: number | string;
    switch (trigger.metric) {
      case 'vpd': actualValue = readings.vpd; break;
      case 'temperature': actualValue = readings.temperature; break;
      case 'humidity': actualValue = readings.humidity; break;
      case 'vwc': actualValue = readings.vwc; break;
      case 'dryback': actualValue = readings.dryback; break;
      case 'phase': actualValue = currentPhase; break;
      case 'time': actualValue = new Date().getHours(); break;
      default: return false;
    }

    // Get the threshold value
    let threshold: number | string;
    if (typeof trigger.value === 'string') {
      switch (trigger.value) {
        case 'stage_min':
          if (trigger.metric === 'vpd') threshold = stage.vpd.min;
          else if (trigger.metric === 'temperature') threshold = stage.temperature.dayMin;
          else if (trigger.metric === 'humidity') threshold = stage.humidity.dayMin;
          else if (trigger.metric === 'vwc') threshold = stage.substrate.vwcMin;
          else threshold = 0;
          break;
        case 'stage_max':
          if (trigger.metric === 'vpd') threshold = stage.vpd.max;
          else if (trigger.metric === 'temperature') threshold = stage.temperature.dayMax;
          else if (trigger.metric === 'humidity') threshold = stage.humidity.dayMax;
          else if (trigger.metric === 'vwc') threshold = stage.substrate.vwcMax;
          else threshold = 100;
          break;
        case 'stage_target':
          if (trigger.metric === 'vpd') threshold = stage.vpd.target;
          else if (trigger.metric === 'vwc') threshold = stage.substrate.vwcTarget;
          else threshold = 50;
          break;
        default:
          threshold = trigger.value;
      }
    } else {
      threshold = trigger.value;
    }

    // Evaluate operator
    switch (trigger.operator) {
      case '>': return actualValue > threshold;
      case '<': return actualValue < threshold;
      case '>=': return actualValue >= threshold;
      case '<=': return actualValue <= threshold;
      case '==': return actualValue === threshold;
      case '!=': return actualValue !== threshold;
      case 'outside':
        if (typeof threshold === 'number' && typeof actualValue === 'number') {
          const min = stage.vpd.min;
          const max = stage.vpd.max;
          return actualValue < min || actualValue > max;
        }
        return false;
      case 'inside':
        if (typeof threshold === 'number' && typeof actualValue === 'number') {
          const min = stage.vpd.min;
          const max = stage.vpd.max;
          return actualValue >= min && actualValue <= max;
        }
        return false;
      default: return false;
    }
  }

  /**
   * Check if rule is in cooldown
   */
  private isInCooldown(rule: AutomationRule): boolean {
    const cooldownExpires = this.state.activeActions.get(rule.id);
    if (!cooldownExpires) return false;
    return new Date() < cooldownExpires;
  }

  /**
   * Evaluate all rules and execute actions
   */
  async evaluate(readings: EnvironmentReadings): Promise<RuleAction[]> {
    if (!this.state.enabled) return [];

    const now = new Date();
    this.state.lastEvaluation = now;

    const currentPhase = getCurrentIrrigationPhase(
      now,
      this.lightsOnHour,
      this.lightsOffHour,
      this.currentStage
    );

    const executedActions: RuleAction[] = [];

    // Sort rules by priority
    const sortedRules = [...this.state.rules].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) continue;

      // Skip if stage-specific and not in matching stage
      if (rule.stageSpecific && !rule.stageSpecific.includes(this.currentStage)) {
        continue;
      }

      // Skip if in cooldown
      if (this.isInCooldown(rule)) continue;

      // Evaluate triggers
      const triggerResults = rule.triggers.map(t =>
        this.evaluateTrigger(t, readings, currentPhase)
      );

      const triggered = rule.triggerLogic === 'AND'
        ? triggerResults.every(r => r)
        : triggerResults.some(r => r);

      if (triggered) {
        // Check duration requirement
        const hasDuration = rule.triggers.some(t => t.duration && t.duration > 0);

        if (hasDuration) {
          const timerStart = this.state.conditionTimers.get(rule.id);
          if (!timerStart) {
            // Start the timer
            this.state.conditionTimers.set(rule.id, now);
            continue;
          }

          const maxDuration = Math.max(...rule.triggers.map(t => t.duration || 0));
          const elapsed = (now.getTime() - timerStart.getTime()) / 1000;

          if (elapsed < maxDuration) {
            continue; // Not yet met duration
          }
        }

        // Execute actions
        for (const action of rule.actions) {
          try {
            await this.onAction(action, rule);
            executedActions.push(action);
          } catch (e) {
            console.error(`[Automation] Error executing action for rule ${rule.id}:`, e);
          }
        }

        // Set cooldown
        const cooldownExpires = new Date(now.getTime() + rule.cooldownMinutes * 60 * 1000);
        this.state.activeActions.set(rule.id, cooldownExpires);

        // Clear duration timer
        this.state.conditionTimers.delete(rule.id);

        // Update last triggered
        rule.lastTriggered = now;
      } else {
        // Reset duration timer if condition is no longer met
        this.state.conditionTimers.delete(rule.id);
      }
    }

    return executedActions;
  }

  /**
   * Get automation status
   */
  getStatus() {
    return {
      enabled: this.state.enabled,
      lastEvaluation: this.state.lastEvaluation,
      activeRules: this.state.rules.filter(r => r.enabled).length,
      totalRules: this.state.rules.length,
      rulesInCooldown: Array.from(this.state.activeActions.keys())
    };
  }
}

export default AutomationEngine;
