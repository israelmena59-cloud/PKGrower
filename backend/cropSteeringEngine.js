/**
 * Crop Steering Engine
 * Intelligent irrigation automation based on professional cultivation rules
 *
 * Supports:
 * - Vegetative vs Generative direction
 * - P1/P2/P3 phase calculation based on light schedule
 * - Dryback and field capacity targets
 * - Event sizing and frequency optimization
 */

// ===========================================
// CROP STEERING PARAMETERS BY DIRECTION
// ===========================================

const STEERING_PROFILES = {
    vegetative: {
        name: 'Vegetativo',
        description: 'Crecimiento vegetativo - más eventos, menos volumen',

        // Timing offsets (minutes from lights ON/OFF)
        p1StartOffset: 90,      // 1.5h después de luces ON
        p2EndOffset: 90,        // 1.5h antes de luces OFF

        // Dryback targets
        drybackP3Min: 10,       // % mínimo dryback nocturno
        drybackP3Max: 25,       // % máximo dryback nocturno
        drybackToP1: 2,         // % dryback desde luces ON hasta P1

        // Event sizing
        eventSizeMin: 1,        // % del contenedor por evento
        eventSizeMax: 4,
        eventSizeDefault: 2,

        // Drainage target
        drainageTarget: 20,     // % drenaje objetivo

        // Frequency
        minTimeBetweenEvents: 30,   // minutos mínimo entre riegos
        maxEventsPerDay: 12,

        // Field capacity timing
        fieldCapacityTarget: 65,    // % VWC objetivo
        reachFieldCapacityBy: 0.4,  // Alcanzar a 40% del ciclo lumínico (antes del mediodía)

        // VPD targets
        vpdMin: 0.4,
        vpdMax: 0.8
    },

    generative: {
        name: 'Generativo',
        description: 'Floración - menos eventos, más volumen, más estrés',

        // Timing offsets (minutes from lights ON/OFF)
        p1StartOffset: 150,     // 2.5h después de luces ON
        p2EndOffset: 210,       // 3.5h antes de luces OFF

        // Dryback targets
        drybackP3Min: 25,       // % mínimo dryback nocturno
        drybackP3Max: 50,       // % máximo dryback nocturno
        drybackToP1: 5,         // % dryback desde luces ON hasta P1

        // Event sizing
        eventSizeMin: 4,        // % del contenedor por evento
        eventSizeMax: 8,
        eventSizeDefault: 6,

        // Drainage target
        drainageTarget: 10,     // % drenaje objetivo

        // Frequency
        minTimeBetweenEvents: 45,   // minutos mínimo entre riegos
        maxEventsPerDay: 6,

        // Field capacity timing
        fieldCapacityTarget: 60,    // % VWC objetivo (menor)
        reachFieldCapacityBy: 0.5,  // Alcanzar al 50% del ciclo (mediodía exacto)

        // VPD targets
        vpdMin: 1.0,
        vpdMax: 1.6
    },

    balanced: {
        name: 'Balanceado',
        description: 'Transición o mantenimiento equilibrado',

        p1StartOffset: 120,     // 2h después de luces ON
        p2EndOffset: 150,       // 2.5h antes de luces OFF

        drybackP3Min: 15,
        drybackP3Max: 35,
        drybackToP1: 3,

        eventSizeMin: 2,
        eventSizeMax: 6,
        eventSizeDefault: 4,

        drainageTarget: 15,

        minTimeBetweenEvents: 35,
        maxEventsPerDay: 9,

        fieldCapacityTarget: 62,
        reachFieldCapacityBy: 0.45,

        vpdMin: 0.7,
        vpdMax: 1.2
    },

    // Maduración final (últimas semanas)
    ripening: {
        name: 'Maduración',
        description: 'Finalización - aumentar drenaje, reducir EC',

        p1StartOffset: 180,     // 3h después de luces ON
        p2EndOffset: 240,       // 4h antes de luces OFF

        drybackP3Min: 30,
        drybackP3Max: 50,
        drybackToP1: 6,

        eventSizeMin: 5,
        eventSizeMax: 10,
        eventSizeDefault: 7,

        drainageTarget: 25,     // Alto drenaje para lavar EC

        minTimeBetweenEvents: 60,
        maxEventsPerDay: 4,

        fieldCapacityTarget: 55,
        reachFieldCapacityBy: 0.55,

        vpdMin: 1.2,
        vpdMax: 1.8
    }
};

// ===========================================
// PHASE DETECTION
// ===========================================

/**
 * Calculate current irrigation phase based on time and light schedule
 * @param {Object} lightingConfig - { onTime: "06:00", offTime: "00:00" }
 * @param {string} direction - 'vegetative' | 'generative' | 'balanced' | 'ripening'
 * @returns {Object} { phase, minutesSinceLightsOn, minutesUntilP1, minutesUntilP2End, isInWindow }
 */
function getCurrentPhase(lightingConfig, direction = 'vegetative') {
    const profile = STEERING_PROFILES[direction] || STEERING_PROFILES.vegetative;
    const now = new Date();

    // Parse light schedule
    const [onH, onM] = (lightingConfig.onTime || '06:00').split(':').map(Number);
    const [offH, offM] = (lightingConfig.offTime || '00:00').split(':').map(Number);

    // Calculate lights-on time for today
    const lightsOnToday = new Date(now);
    lightsOnToday.setHours(onH, onM, 0, 0);

    // Calculate lights-off time
    const lightsOffToday = new Date(now);
    lightsOffToday.setHours(offH === 0 ? 24 : offH, offM, 0, 0);

    // Handle overnight schedules
    if (lightsOffToday <= lightsOnToday) {
        lightsOffToday.setDate(lightsOffToday.getDate() + 1);
    }

    // Check if we're in the previous day's cycle
    if (now < lightsOnToday) {
        // Check if we're in night from previous day
        const lightsOnYesterday = new Date(lightsOnToday);
        lightsOnYesterday.setDate(lightsOnYesterday.getDate() - 1);
        const lightsOffYesterday = new Date(lightsOffToday);
        lightsOffYesterday.setDate(lightsOffYesterday.getDate() - 1);

        if (now >= lightsOffYesterday) {
            // Night period
            return {
                phase: 'night',
                minutesSinceLightsOn: null,
                minutesUntilP1: Math.floor((lightsOnToday - now) / 60000) + profile.p1StartOffset,
                minutesUntilP2End: null,
                isInWindow: false,
                lightsOn: false,
                message: 'Período nocturno - No irrigar'
            };
        }
    }

    // Calculate day length in minutes
    const dayLengthMinutes = Math.floor((lightsOffToday - lightsOnToday) / 60000);

    // Calculate minutes since lights on
    const minutesSinceLightsOn = Math.floor((now - lightsOnToday) / 60000);

    // Check if lights are off (night)
    if (minutesSinceLightsOn < 0 || minutesSinceLightsOn >= dayLengthMinutes) {
        return {
            phase: 'night',
            minutesSinceLightsOn: null,
            minutesUntilP1: null,
            minutesUntilP2End: null,
            isInWindow: false,
            lightsOn: false,
            message: 'Período nocturno - No irrigar'
        };
    }

    // Calculate P1 start and P2 end times
    const p1StartMinutes = profile.p1StartOffset;
    const p2EndMinutes = dayLengthMinutes - profile.p2EndOffset;

    // Determine phase
    let phase, isInWindow, message;

    if (minutesSinceLightsOn < p1StartMinutes) {
        // Pre-P1: Waiting for dryback target
        phase = 'pre-p1';
        isInWindow = false;
        const waitMinutes = p1StartMinutes - minutesSinceLightsOn;
        message = `Esperando dryback. P1 inicia en ${waitMinutes} min`;
    } else if (minutesSinceLightsOn <= p2EndMinutes) {
        // P1/P2 Window: Active irrigation allowed
        if (minutesSinceLightsOn < p1StartMinutes + 120) {
            phase = 'p1';
            message = 'Fase P1 RAMP - Riego permitido';
        } else if (minutesSinceLightsOn > p2EndMinutes - 60) {
            phase = 'p2-late';
            message = 'Fase P2 Final - Últimos riegos';
        } else {
            phase = 'p2';
            message = 'Fase P2 MANTENIMIENTO - Riego permitido';
        }
        isInWindow = true;
    } else {
        // P3: Dryback period
        phase = 'p3';
        isInWindow = false;
        const minutesUntilLightsOff = dayLengthMinutes - minutesSinceLightsOn;
        message = `Fase P3 DRYBACK - No irrigar. Luces OFF en ${minutesUntilLightsOff} min`;
    }

    return {
        phase,
        minutesSinceLightsOn,
        minutesUntilP1: Math.max(0, p1StartMinutes - minutesSinceLightsOn),
        minutesUntilP2End: Math.max(0, p2EndMinutes - minutesSinceLightsOn),
        isInWindow,
        lightsOn: true,
        p1StartTime: p1StartMinutes,
        p2EndTime: p2EndMinutes,
        dayLength: dayLengthMinutes,
        message
    };
}

// ===========================================
// IRRIGATION DECISION ENGINE
// ===========================================

/**
 * Evaluate whether irrigation should occur
 * @param {Array} sensorHistory - Array of sensor readings
 * @param {Object} settings - appSettings object
 * @param {Object} pumpState - { isOn, lastOnTime, lastOffTime, lastVwcAtOn }
 * @returns {Object} Decision with action, phase, reasoning
 */
function evaluateIrrigation(sensorHistory, settings, pumpState) {
    const result = {
        shouldIrrigate: false,
        phase: 'unknown',
        action: 'wait',
        reasoning: '',
        eventSize: 0,
        currentVWC: 0,
        targetVWC: 0,
        drybackSinceLast: 0,
        timeSinceLastIrrigation: null
    };

    // Get latest sensor data
    if (!sensorHistory || sensorHistory.length === 0) {
        result.reasoning = 'Sin datos de sensores disponibles';
        return result;
    }

    const latest = sensorHistory[sensorHistory.length - 1];
    const currentVWC = latest.substrateHumidity;

    if (currentVWC === null || currentVWC === undefined) {
        result.reasoning = 'VWC no disponible';
        return result;
    }

    result.currentVWC = currentVWC;

    // Get configuration
    const direction = settings.cropSteering?.direction || 'vegetative';
    const profile = STEERING_PROFILES[direction] || STEERING_PROFILES.vegetative;
    const lighting = settings.lighting || {};

    // Check if automation is enabled
    if (!settings.cropSteering?.enabled) {
        result.reasoning = 'Automatización de riego deshabilitada';
        result.action = 'disabled';
        return result;
    }

    // Get current phase
    const phaseInfo = getCurrentPhase(lighting, direction);
    result.phase = phaseInfo.phase;

    // RULE 1: Never irrigate at night
    if (!phaseInfo.lightsOn) {
        result.reasoning = 'Período nocturno - Riego bloqueado';
        result.action = 'blocked_night';
        return result;
    }

    // RULE 2: Check if we're in the irrigation window
    if (!phaseInfo.isInWindow) {
        if (phaseInfo.phase === 'pre-p1') {
            result.reasoning = `Esperando inicio de P1 en ${phaseInfo.minutesUntilP1} min`;
            result.action = 'wait_p1';
        } else if (phaseInfo.phase === 'p3') {
            result.reasoning = 'Fase P3 Dryback activa - No irrigar';
            result.action = 'dryback';
        }
        return result;
    }

    // RULE 3: Check time since last irrigation
    if (pumpState.lastOffTime) {
        const msSinceLastIrrigation = Date.now() - new Date(pumpState.lastOffTime).getTime();
        const minSinceLastIrrigation = msSinceLastIrrigation / 60000;
        result.timeSinceLastIrrigation = Math.round(minSinceLastIrrigation);

        if (minSinceLastIrrigation < profile.minTimeBetweenEvents) {
            result.reasoning = `Muy pronto desde último riego (${Math.round(minSinceLastIrrigation)} min). Esperar ${profile.minTimeBetweenEvents} min`;
            result.action = 'wait_cooldown';
            return result;
        }
    }

    // RULE 4: Check VWC against target
    const targetVWC = settings.cropSteering?.targetVWC || profile.fieldCapacityTarget;
    result.targetVWC = targetVWC;

    // Calculate dryback from last irrigation
    if (pumpState.lastVwcAtOn && pumpState.lastVwcAtOn > 0) {
        result.drybackSinceLast = pumpState.lastVwcAtOn - currentVWC;
    }

    // Determine if irrigation is needed
    const drybackThreshold = phaseInfo.phase === 'p1' ? profile.drybackToP1 : (profile.eventSizeDefault * 0.8);

    if (currentVWC >= targetVWC) {
        result.reasoning = `VWC (${currentVWC}%) ≥ target (${targetVWC}%). Mantener`;
        result.action = 'vwc_ok';
        return result;
    }

    if (result.drybackSinceLast < drybackThreshold && pumpState.lastVwcAtOn) {
        result.reasoning = `Dryback insuficiente (${result.drybackSinceLast.toFixed(1)}% < ${drybackThreshold}%)`;
        result.action = 'wait_dryback';
        return result;
    }

    // DECISION: IRRIGATE
    result.shouldIrrigate = true;
    result.eventSize = calculateEventSize(currentVWC, targetVWC, profile, phaseInfo);
    result.action = 'irrigate';
    result.reasoning = `VWC ${currentVWC}% < target ${targetVWC}%. Evento ${result.eventSize}% recomendado`;

    return result;
}

/**
 * Calculate optimal event size based on current conditions
 */
function calculateEventSize(currentVWC, targetVWC, profile, phaseInfo) {
    const deficit = targetVWC - currentVWC;

    // Base size on deficit
    let size = profile.eventSizeDefault;

    // Adjust based on phase
    if (phaseInfo.phase === 'p1') {
        // P1: Larger events to reach field capacity faster (vegetative) or slower (generative)
        size = Math.min(profile.eventSizeMax, deficit * 0.5);
    } else if (phaseInfo.phase === 'p2') {
        // P2: Maintain at target
        size = profile.eventSizeDefault;
    } else if (phaseInfo.phase === 'p2-late') {
        // P2 Late: Smaller events, prepare for dryback
        size = Math.max(profile.eventSizeMin, profile.eventSizeDefault * 0.7);
    }

    // Clamp to profile limits
    size = Math.max(profile.eventSizeMin, Math.min(profile.eventSizeMax, size));

    return Math.round(size * 10) / 10; // Round to 1 decimal
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get the steering profile for a direction
 */
function getProfile(direction) {
    return STEERING_PROFILES[direction] || STEERING_PROFILES.vegetative;
}

/**
 * Get human-readable status summary
 */
function getStatusSummary(settings, sensorHistory, pumpState) {
    const direction = settings.cropSteering?.direction || 'vegetative';
    const profile = STEERING_PROFILES[direction];
    const phaseInfo = getCurrentPhase(settings.lighting, direction);
    const decision = evaluateIrrigation(sensorHistory, settings, pumpState);

    return {
        direction: profile.name,
        phase: phaseInfo.phase,
        phaseMessage: phaseInfo.message,
        isInWindow: phaseInfo.isInWindow,
        lightsOn: phaseInfo.lightsOn,
        currentVWC: decision.currentVWC,
        targetVWC: decision.targetVWC,
        action: decision.action,
        reasoning: decision.reasoning,
        nextAction: decision.shouldIrrigate ? `Riego ${decision.eventSize}%` : 'Esperando',
        timing: {
            minutesSinceLightsOn: phaseInfo.minutesSinceLightsOn,
            minutesUntilP1: phaseInfo.minutesUntilP1,
            minutesUntilP2End: phaseInfo.minutesUntilP2End
        }
    };
}

/**
 * Calculate recommended irrigation schedule for the day
 */
function getDaySchedule(settings) {
    const direction = settings.cropSteering?.direction || 'vegetative';
    const profile = STEERING_PROFILES[direction];
    const lighting = settings.lighting || {};

    const [onH, onM] = (lighting.onTime || '06:00').split(':').map(Number);
    const [offH, offM] = (lighting.offTime || '00:00').split(':').map(Number);

    // Calculate key times
    const lightsOn = `${String(onH).padStart(2, '0')}:${String(onM).padStart(2, '0')}`;
    const lightsOff = `${String(offH).padStart(2, '0')}:${String(offM).padStart(2, '0')}`;

    const p1StartHour = onH + Math.floor(profile.p1StartOffset / 60);
    const p1StartMin = onM + (profile.p1StartOffset % 60);
    const p1Start = `${String(p1StartHour % 24).padStart(2, '0')}:${String(p1StartMin % 60).padStart(2, '0')}`;

    // Calculate day length
    let dayLengthHours = offH - onH;
    if (dayLengthHours <= 0) dayLengthHours += 24;

    const p2EndMinutes = (dayLengthHours * 60) - profile.p2EndOffset;
    const p2EndHour = onH + Math.floor(p2EndMinutes / 60);
    const p2EndMin = onM + (p2EndMinutes % 60);
    const p2End = `${String(p2EndHour % 24).padStart(2, '0')}:${String(p2EndMin % 60).padStart(2, '0')}`;

    return {
        direction: profile.name,
        lightsOn,
        lightsOff,
        dayLengthHours,
        p1Start,
        p2End,
        irrigationWindowHours: Math.round((p2EndMinutes - profile.p1StartOffset) / 60 * 10) / 10,
        profile: {
            eventSize: `${profile.eventSizeMin}-${profile.eventSizeMax}%`,
            maxEvents: profile.maxEventsPerDay,
            minInterval: `${profile.minTimeBetweenEvents} min`,
            drybackP3: `${profile.drybackP3Min}-${profile.drybackP3Max}%`,
            vpdTarget: `${profile.vpdMin}-${profile.vpdMax} kPa`
        }
    };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
    STEERING_PROFILES,
    getCurrentPhase,
    evaluateIrrigation,
    calculateEventSize,
    getProfile,
    getStatusSummary,
    getDaySchedule
};
