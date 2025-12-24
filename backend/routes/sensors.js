const express = require('express');

// Helper function to calculate VPD
// Formula: VPD = SVP * (1 - RH/100)
// SVP = 0.61078 * exp(17.27 * T / (T + 237.3))
const calculateVPD = (temp, hum) => {
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    return svp * (1 - hum / 100);
};

module.exports = ({ getTuyaDevices, getSimulationMode, firestore }) => {
    const router = express.Router();

    // Obtener Ãºltimos datos de sensores (Ambiente + Sustrato)
    router.get('/latest', async (req, res) => {
        try {
            const tuyaDevices = getTuyaDevices();
            const MODO_SIMULACION = getSimulationMode();

            let temp = 0;
            let hum = 0;
            let subHum = 0;
            let vpd = 0;
            let isEstimate = false;

            if (MODO_SIMULACION) {
                temp = 24.5; hum = 60; subHum = 45; vpd = 1.1;
            } else {
                // 2. Sustrato (Promedio)
                let subTemps = [];
                let subHums = [];

                ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(k => {
                    if (tuyaDevices[k]) {
                        // Support both raw value and 'humidity' property
                        const val = tuyaDevices[k].humidity !== undefined ? tuyaDevices[k].humidity : tuyaDevices[k].value;
                         if (val !== undefined) subHums.push(val);
                         if (tuyaDevices[k].temperature !== undefined) subTemps.push(tuyaDevices[k].temperature);
                    }
                });

                const avgSubTemp = subTemps.length > 0 ? subTemps.reduce((a, b) => a + b, 0) / subTemps.length : 0;
                subHum = subHums.length > 0 ? subHums.reduce((a, b) => a + b, 0) / subHums.length : 0;

                // 1. Ambiente
                if (tuyaDevices.sensorAmbiente && tuyaDevices.sensorAmbiente.temperature !== undefined) {
                    temp = tuyaDevices.sensorAmbiente.temperature;
                    hum = tuyaDevices.sensorAmbiente.humidity || 0;
                } else {
                    // Fallback
                    if (avgSubTemp > 0) {
                        temp = parseFloat(avgSubTemp.toFixed(1));
                        isEstimate = true;
                    }
                }

                if (temp > 0 && hum > 0) {
                    vpd = parseFloat(calculateVPD(temp, hum).toFixed(2));
                }
            }

            res.json({
                temperature: temp,
                humidity: hum,
                vpd: vpd,
                substrateHumidity: parseFloat(subHum.toFixed(1)), // Promedio sustrato
                isEstimate, // Flag to UI
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('[SENSORS] Error getting latest:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Obtener historial de sensores
    router.get('/history', async (req, res) => {
        try {
            const { limit, start, end } = req.query;
            const history = await firestore.getHistory({
                limit: limit ? parseInt(limit) : 288, // Default 24h (5min interval)
                start,
                end
            });
            res.json(history);
        } catch (error) {
            console.error('[SENSORS] Error getting history:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // [Legacy/Specific] Soil Sensor Endpoint (Optional, kept for compatibility if needed, else subsumed by latest)
    // Checking index.js showed a GET /api/sensors/soil around 2410 (preserved).
    router.get('/soil', async (req, res) => {
         try {
             const tuyaDevices = getTuyaDevices();
             const MODO_SIMULACION = getSimulationMode();

             if (MODO_SIMULACION) {
                 return res.json([
                     { id: 'sim_s1', name: 'Maceta 1', humidity: 45, temperature: 23 },
                     { id: 'sim_s2', name: 'Maceta 2', humidity: 42, temperature: 23.5 }
                 ]);
             }

             const soilSensors = [];
             ['sensorSustrato1', 'sensorSustrato2', 'sensorSustrato3'].forEach(k => {
                 if (tuyaDevices[k]) {
                     soilSensors.push({
                         id: tuyaDevices[k].id,
                         name: tuyaDevices[k].name,
                         humidity: tuyaDevices[k].humidity,
                         temperature: tuyaDevices[k].temperature,
                         battery: tuyaDevices[k].battery
                     });
                 }
             });
             res.json(soilSensors);
         } catch(e) {
             res.status(500).json({ error: e.message });
         }
    });

    return router;
};
