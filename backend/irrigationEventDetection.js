/**
 * Irrigation Event Detection Module
 * Detects irrigation events by analyzing humidity spikes in sensor data
 * Uses calibration from known events to estimate shot percentages
 */

// ===========================================
// CONFIGURATION
// ===========================================

// Default calibration: Expected humidity increase for a 3% shot
// This will be refined based on actual observed data
const DEFAULT_CALIBRATION = {
    shotPercentage: 3,      // Reference shot size
    expectedDelta: 1.8,     // Expected average humidity increase in %
    windowMinutes: 15,      // Time window to look for the spike
    minDeltaForDetection: 0.3  // Minimum delta to consider as an event
};

// ===========================================
// EVENT DETECTION ALGORITHM
// ===========================================

/**
 * Detect irrigation events from sensor history
 * @param {Array} sensorHistory - Array of sensor readings with timestamp, sh1, sh2, sh3, substrateHumidity
 * @param {Object} calibration - Optional calibration settings
 * @returns {Array} Array of detected events with { timestamp, timeStr, estimatedShotPercent, avgDelta, sensorDeltas }
 */
function detectIrrigationEvents(sensorHistory, calibration = DEFAULT_CALIBRATION) {
    if (!sensorHistory || sensorHistory.length < 5) {
        return [];
    }

    const events = [];
    const humidityKey = 'substrateHumidity'; // Average humidity field

    // Calculate the delta per 1% shot based on calibration
    const deltaPerPercent = calibration.expectedDelta / calibration.shotPercentage;

    // Sort by timestamp
    const sorted = [...sensorHistory].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Sliding window detection
    // We look for points where humidity increases significantly compared to previous readings
    const windowSize = 3; // Compare current point to 3 points before

    for (let i = windowSize; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = sorted[i - windowSize];

        // Skip if missing data
        if (!current[humidityKey] || !previous[humidityKey]) continue;
        if (current[humidityKey] <= 0 || previous[humidityKey] <= 0) continue;

        // Calculate time difference
        const timeDiffMs = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
        const timeDiffMin = timeDiffMs / 60000;

        // Only consider short time windows (likely a single event)
        if (timeDiffMin > calibration.windowMinutes) continue;

        // Calculate average humidity delta
        const avgDelta = current[humidityKey] - previous[humidityKey];

        // Also calculate individual sensor deltas if available
        const sensorDeltas = {};
        ['sh1', 'sh2', 'sh3'].forEach((key, idx) => {
            if (current[key] && previous[key] && current[key] > 0 && previous[key] > 0) {
                sensorDeltas[`sensor${idx + 1}`] = current[key] - previous[key];
            }
        });

        // Check if this looks like an irrigation event (positive significant increase)
        if (avgDelta >= calibration.minDeltaForDetection) {
            // Estimate shot percentage based on calibration
            const estimatedShotPercent = Math.round((avgDelta / deltaPerPercent) * 10) / 10;

            // Don't report unreasonably large shots (likely noise/sensor error)
            if (estimatedShotPercent > 15) continue;

            // Avoid duplicate events close together (within 5 minutes)
            const lastEvent = events[events.length - 1];
            if (lastEvent) {
                const lastEventTime = new Date(lastEvent.timestamp).getTime();
                const currentTime = new Date(current.timestamp).getTime();
                if (currentTime - lastEventTime < 5 * 60000) {
                    // Merge with previous event if close (take the larger one)
                    if (estimatedShotPercent > lastEvent.estimatedShotPercent) {
                        events[events.length - 1] = {
                            timestamp: current.timestamp,
                            timeStr: formatTime(current.timestamp),
                            estimatedShotPercent,
                            avgDelta: Math.round(avgDelta * 10) / 10,
                            sensorDeltas,
                            confidence: calculateConfidence(avgDelta, sensorDeltas, calibration)
                        };
                    }
                    continue;
                }
            }

            events.push({
                timestamp: current.timestamp,
                timeStr: formatTime(current.timestamp),
                estimatedShotPercent,
                avgDelta: Math.round(avgDelta * 10) / 10,
                sensorDeltas,
                confidence: calculateConfidence(avgDelta, sensorDeltas, calibration)
            });
        }
    }

    return events;
}

/**
 * Calculate confidence score based on sensor agreement
 * Higher confidence if all sensors show similar increases
 */
function calculateConfidence(avgDelta, sensorDeltas, calibration) {
    const deltas = Object.values(sensorDeltas);
    if (deltas.length === 0) return 'low';

    // All sensors positive = high confidence
    const allPositive = deltas.every(d => d > 0);

    // Variance check
    const variance = deltas.length > 1
        ? deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / deltas.length
        : 0;

    if (allPositive && variance < 1) return 'high';
    if (allPositive) return 'medium';
    return 'low';
}

/**
 * Format timestamp to HH:mm string
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

// ===========================================
// CALIBRATION HELPERS
// ===========================================

/**
 * Calibrate the detection algorithm using known irrigation events
 * @param {Array} sensorHistory - Sensor readings
 * @param {Array} knownEvents - Array of { time: "01:00", shotPercent: 3 }
 * @returns {Object} Calibration settings
 */
function calibrateFromKnownEvents(sensorHistory, knownEvents) {
    if (!knownEvents || knownEvents.length === 0 || !sensorHistory || sensorHistory.length === 0) {
        return DEFAULT_CALIBRATION;
    }

    const observations = [];

    for (const known of knownEvents) {
        // Find the closest sensor reading to the known event time
        const targetTime = parseTimeToMinutes(known.time);

        // Look for readings within 30 minutes after the event
        const readings = sensorHistory.filter(s => {
            const readingMinutes = new Date(s.timestamp).getHours() * 60 + new Date(s.timestamp).getMinutes();
            return readingMinutes >= targetTime && readingMinutes <= targetTime + 30;
        });

        if (readings.length < 2) continue;

        // Find max humidity increase in this window
        let maxDelta = 0;
        for (let i = 1; i < readings.length; i++) {
            const delta = (readings[i].substrateHumidity || 0) - (readings[0].substrateHumidity || 0);
            if (delta > maxDelta) maxDelta = delta;
        }

        if (maxDelta > 0) {
            observations.push({
                shotPercent: known.shotPercent,
                observedDelta: maxDelta
            });
        }
    }

    if (observations.length === 0) return DEFAULT_CALIBRATION;

    // Calculate average delta per percent
    const avgDeltaPerPercent = observations.reduce((sum, o) => sum + (o.observedDelta / o.shotPercent), 0) / observations.length;

    return {
        shotPercentage: 1,
        expectedDelta: avgDeltaPerPercent,
        windowMinutes: 15,
        minDeltaForDetection: avgDeltaPerPercent * 0.5 // 0.5% shot minimum
    };
}

/**
 * Parse "HH:mm" to minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
    detectIrrigationEvents,
    calibrateFromKnownEvents,
    DEFAULT_CALIBRATION
};
